import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription, switchMap, forkJoin, finalize } from 'rxjs';

import { DropdownComponent} from "../../../../shared/components/ui/dropdown/dropdown.component";
import { DropdownItemComponent} from "../../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component";

import { NotificationApiService, NotificationDto} from "../../../../shared/services/notification-api.service";
import { DialysisService} from "../../../../shared/services/dialysis.service";
import { KeycloakService } from "keycloak-angular";

@Component({
  selector: 'app-dialysis-notification',
  templateUrl: './dialysis-notification.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent],
})
export class DialysisNotificationComponent implements OnInit, OnDestroy {
  isOpen = false;
  canReadNotifications = false;

  notifying = false;      // ping dot
  unread = 0;             // unread count
  notifications: NotificationDto[] = [];

  // prevents double-click spam
  busyIds = new Set<string>();

  private pollSub?: Subscription;

  constructor(
      private notifApi: NotificationApiService,
      private dialysisApi: DialysisService,
      private keycloak: KeycloakService
  ) {}

  ngOnInit(): void {
    void this.initNotificationAccess();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private startPolling() {
    // Intentionally no background polling to avoid repeated unauthorized calls.
    // Data is refreshed on demand when opening the dropdown.
    this.pollSub?.unsubscribe();
  }

  private async initNotificationAccess(): Promise<void> {
    const allowedRoles = ['admin', 'ADMIN', 'doctor', 'DOCTOR', 'nurse', 'NURSE'];
    const checks = await Promise.all(allowedRoles.map((role) => this.keycloak.isUserInRole(role)));
    this.canReadNotifications = checks.some(Boolean);

    if (this.canReadNotifications) {
      this.startPolling();
      return;
    }

    this.disableNotifications();
  }

  private disableNotifications(): void {
    this.canReadNotifications = false;
    this.unread = 0;
    this.notifications = [];
    this.notifying = false;
    this.pollSub?.unsubscribe();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (!this.canReadNotifications) {
      this.notifying = false;
      return;
    }
    if (this.isOpen) {
      this.notifying = false;
      this.refreshOnce();
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  refreshOnce() {
    if (!this.canReadNotifications) return;
    forkJoin({
      list: this.notifApi.my(),
      unread: this.notifApi.unreadCount(),
    }).subscribe((res) => {
      this.notifications = res.list ?? [];
      this.unread = res.unread ?? 0;
      this.notifying = this.unread > 0;
    });
  }

  // ====== parsing helpers
  private payload(n: NotificationDto): any {
    try { return n.payloadJson ? JSON.parse(n.payloadJson) : null; }
    catch { return null; }
  }

  private scheduledSessionId(n: NotificationDto): string | null {
    // prefer entityId (you set it to ScheduledSession.id)
    if (n.entityId) return n.entityId;

    // fallback to payloadJson.scheduledSessionId
    const p = this.payload(n);
    return p?.scheduledSessionId ?? null;
  }

  // ====== display filters
  // If you want nurse dropdown to show ONLY pending assignment requests:
  visibleNotifications(): NotificationDto[] {
    // only show unread schedule requests that are actionable
    return (this.notifications ?? []).filter(n =>
        n.type === 'SCHEDULE_REQUEST' &&
        !n.readAt &&
        !!this.scheduledSessionId(n)
    );
  }

  // If instead you want to show everything: use notifications directly in HTML.
  // visibleNotifications(): NotificationDto[] { return this.notifications ?? []; }

  isScheduleRequest(n: NotificationDto): boolean {
    return n.type === 'SCHEDULE_REQUEST' && !!this.scheduledSessionId(n);
  }

  // ====== mark read (and remove from UI)
  markReadAndRemove(n: NotificationDto) {
    if (!n || n.readAt) {
      // already read => just remove if you want
      this.notifications = this.notifications.filter(x => x.id !== n.id);
      return;
    }

    // optimistic UI: remove immediately
    this.notifications = this.notifications.filter(x => x.id !== n.id);
    if (this.unread > 0) this.unread--;

    this.notifApi.markRead(n.id).subscribe({
      next: () => {},
      error: () => {
        // revert if needed (optional)
        this.refreshOnce();
      }
    });
  }

  // ===== Nurse actions
  accept(n: NotificationDto) {
    const scheduledId = this.scheduledSessionId(n);
    if (!scheduledId) return;

    if (this.busyIds.has(n.id)) return;
    this.busyIds.add(n.id);

    this.dialysisApi.acceptAssignment(scheduledId).pipe(
        switchMap(() => this.notifApi.markRead(n.id)),
        finalize(() => this.busyIds.delete(n.id))
    ).subscribe({
      next: () => {
        // remove from UI immediately
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        if (this.unread > 0) this.unread--;
      },
      error: () => {
        // if accept fails, do not lose notif
        this.refreshOnce();
      }
    });
  }

  reject(n: NotificationDto) {
    const scheduledId = this.scheduledSessionId(n);
    if (!scheduledId) return;

    if (this.busyIds.has(n.id)) return;
    this.busyIds.add(n.id);

    this.dialysisApi.rejectAssignment(scheduledId, 'Not available').pipe(
        switchMap(() => this.notifApi.markRead(n.id)),
        finalize(() => this.busyIds.delete(n.id))
    ).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        if (this.unread > 0) this.unread--;
      },
      error: () => {
        this.refreshOnce();
      }
    });
  }
}