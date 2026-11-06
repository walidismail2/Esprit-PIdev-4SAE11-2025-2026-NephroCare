import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

// ══════════════════════════════════════════════
//   INTERFACES
// ══════════════════════════════════════════════

export type DiagNotifSeverity = 'critical' | 'warning' | 'info';

export type DiagNotifType =
  | 'emergency_order'
  | 'stat_order'
  | 'result_ready'
  | 'order_overdue'
  | 'order_cancelled'
  | 'new_order';

export interface DiagnosticNotification {
  id: string;
  orderId: string;
  type: DiagNotifType;
  severity: DiagNotifSeverity;
  message: string;
  details: string[];
  testName: string;
  orderType: string;
  orderedBy: string;
  userId: string;
  priority: string;
  status: string;
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
}

// ══════════════════════════════════════════════
//   THRESHOLDS CONFIG
// ══════════════════════════════════════════════

/** Orders not yet completed after this many hours → overdue warning */
const OVERDUE_HOURS = 24;

// ══════════════════════════════════════════════
//   SERVICE
// ══════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class DiagnosticNotificationService implements OnDestroy {

  private readonly backendUrl = `${environment.apiUrl}/diagnostic/diagnostic-orders`;
  private readonly POLL_INTERVAL_MS = 30_000; // 30 s

  private notifications$ = new BehaviorSubject<DiagnosticNotification[]>([]);
  private pollSub?: Subscription;

  /** Observable for components */
  readonly notifications = this.notifications$.asObservable();

  get allNotifications(): DiagnosticNotification[] {
    return this.notifications$.value;
  }

  get unreadCount(): number {
    return this.notifications$.value.filter(n => !n.read).length;
  }

  get criticalCount(): number {
    return this.notifications$.value.filter(n => n.severity === 'critical').length;
  }

  constructor(private http: HttpClient) {
    this.startPolling();
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  startPolling(): void {
    this.checkOrders();
    this.pollSub = interval(this.POLL_INTERVAL_MS)
      .subscribe(() => this.checkOrders());
  }

  /**
   * Fetches all diagnostic orders, evaluates each one against
   * alert rules, and pushes new notifications without duplicating
   * already-tracked ones — same pattern as HospitalizationNotificationService.
   */
  private checkOrders(): void {
    this.http.get<any[]>(this.backendUrl).subscribe({
      next: (orders) => {
        const current = this.notifications$.value;
        const newNotifs: DiagnosticNotification[] = [];

        orders.forEach(order => {
          const alerts = this.evaluateOrder(order);
          if (!alerts.length) return;

          alerts.forEach(alert => {
            // Unique key = orderId + alert type (prevents duplicates on re-poll)
            const notifId = `${order.id}-${alert.type}`;
            if (current.some(n => n.id === notifId)) return;

            newNotifs.push({
              id:           notifId,
              orderId:      order.id,
              type:         alert.type,
              severity:     alert.severity,
              message:      alert.message,
              details:      alert.details,
              testName:     order.testName  || '—',
              orderType:    order.orderType || '—',
              orderedBy:    order.orderedBy || '—',
              userId:       order.userId    || '—',
              priority:     order.priority  || '—',
              status:       order.status    || '—',
              timestamp:    new Date(order.orderDate),
              read:         false,
              acknowledged: false,
            });
          });
        });

        if (newNotifs.length) {
          // Prepend + sort: critical first → newest first
          const merged = [...newNotifs, ...current];
          merged.sort((a, b) => {
            const sevOrder = { critical: 0, warning: 1, info: 2 };
            if (a.severity !== b.severity)
              return sevOrder[a.severity] - sevOrder[b.severity];
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          this.notifications$.next(merged);
        }
      },
      error: err => console.error('[DiagnosticNotifService] poll error', err)
    });
  }

  // ── Alert rules ───────────────────────────────────────────────────────────

  /**
   * Pure evaluation of a single order.
   * Returns an empty array when no alerts are triggered.
   * Single source of truth for all diagnostic alert rules.
   */
  private evaluateOrder(order: any): {
    type: DiagNotifType;
    severity: DiagNotifSeverity;
    message: string;
    details: string[];
  }[] {

    const alerts: {
      type: DiagNotifType;
      severity: DiagNotifSeverity;
      message: string;
      details: string[];
    }[] = [];

    const priority = order.priority?.toUpperCase();
    const status   = order.status?.toUpperCase();
    const hoursSinceOrder = order.orderDate
      ? (Date.now() - new Date(order.orderDate).getTime()) / 3_600_000
      : 0;

    // ── Rule 1 : EMERGENCY priority ──────────────────────────────────────
    if (priority === 'EMERGENCY') {
      alerts.push({
        type:     'emergency_order',
        severity: 'critical',
        message:  `🚨 EMERGENCY order — ${order.testName} · Patient #${order.userId}`,
        details: [
          `Test: ${order.testName} (${order.orderType})`,
          `Ordered by: ${order.orderedBy}`,
          `Current status: ${order.status}`,
          'Immediate processing required.',
        ],
      });
    }

    // ── Rule 2 : STAT priority ────────────────────────────────────────────
    else if (priority === 'STAT') {
      alerts.push({
        type:     'stat_order',
        severity: 'warning',
        message:  `⚡ STAT order — ${order.testName} · Patient #${order.userId}`,
        details: [
          `Test: ${order.testName} (${order.orderType})`,
          `Ordered by: ${order.orderedBy}`,
          `Current status: ${order.status}`,
          'Priority processing required.',
        ],
      });
    }

    // ── Rule 3 : Order overdue (IN_PROGRESS > 24h or ORDERED > 24h) ──────
    if (
      (status === 'IN_PROGRESS' || status === 'ORDERED') &&
      hoursSinceOrder > OVERDUE_HOURS
    ) {
      alerts.push({
        type:     'order_overdue',
        severity: priority === 'EMERGENCY' || priority === 'STAT' ? 'critical' : 'warning',
        message:  `⏰ Overdue order — ${order.testName} (${Math.floor(hoursSinceOrder)}h old)`,
        details: [
          `Test: ${order.testName}`,
          `Status: ${order.status} since ${Math.floor(hoursSinceOrder)} hours`,
          `Priority: ${order.priority}`,
          `Ordered by: ${order.orderedBy}`,
        ],
      });
    }

    // ── Rule 4 : Result ready (COMPLETED) ────────────────────────────────
    if (status === 'COMPLETED') {
      alerts.push({
        type:     'result_ready',
        severity: 'info',
        message:  `✅ Results ready — ${order.testName} · Patient #${order.userId}`,
        details: [
          `Test: ${order.testName} (${order.orderType})`,
          `Ordered by: ${order.orderedBy}`,
          `Completed on: ${new Date(order.orderDate).toLocaleDateString('en-GB')}`,
        ],
      });
    }

    return alerts;
  }

  // ── Notification triggered manually (create / update / delete) ───────────

  /**
   * Called directly from DiagnosticComponent after each CRUD action.
   * This gives instant feedback without waiting for the next poll.
   */
  pushCrudNotification(
    action: 'created' | 'updated' | 'deleted',
    order: any
  ): void {
    const iconMap = { created: '➕', updated: '✏️', deleted: '🗑️' };
    const sevMap: Record<string, DiagNotifSeverity> = {
      EMERGENCY: 'critical',
      STAT:      'warning',
      URGENT:    'warning',
      ROUTINE:   'info',
    };

    const priority = order.priority?.toUpperCase() || 'ROUTINE';
    const notifId  = `crud-${order.id || Date.now()}-${action}`;

    const notif: DiagnosticNotification = {
      id:           notifId,
      orderId:      order.id || '',
      type:         'new_order',
      severity:     action === 'deleted' ? 'info' : (sevMap[priority] || 'info'),
      message:      `${iconMap[action]} Order ${action} — ${order.testName}`,
      details: [
        `Action: ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        `Test: ${order.testName} (${order.orderType})`,
        `Priority: ${order.priority}  ·  Status: ${order.status}`,
        `Ordered by: ${order.orderedBy}`,
        `Patient ID: ${order.userId}`,
      ],
      testName:     order.testName  || '—',
      orderType:    order.orderType || '—',
      orderedBy:    order.orderedBy || '—',
      userId:       order.userId    || '—',
      priority:     order.priority  || '—',
      status:       order.status    || '—',
      timestamp:    new Date(),
      read:         false,
      acknowledged: false,
    };

    // Prepend + resort
    const merged = [notif, ...this.notifications$.value];
    merged.sort((a, b) => {
      const s = { critical: 0, warning: 1, info: 2 };
      if (a.severity !== b.severity) return s[a.severity] - s[b.severity];
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    this.notifications$.next(merged);
  }

  // ── Public actions ────────────────────────────────────────────────────────

  markRead(id: string): void {
    const updated = this.notifications$.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications$.next(updated);
  }

  markAllRead(): void {
    const updated = this.notifications$.value.map(n => ({ ...n, read: true }));
    this.notifications$.next(updated);
  }

  acknowledge(id: string): void {
    const updated = this.notifications$.value.map(n =>
      n.id === id ? { ...n, acknowledged: true, read: true } : n
    );
    this.notifications$.next(updated);
  }

  clearAll(): void {
    this.notifications$.next([]);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}