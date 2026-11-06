import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription, forkJoin } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { HospitalizationService } from './hospitalization.service';
import { RoomService, Room } from './Room.service';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface CriticalNotification {
  id:                string;
  hospitalizationId: number;
  patientId:         string;
  roomId:            number | null;
  roomNumber:        string;          // resolved from RoomService
  type:              'temperature' | 'heartRate' | 'oxygenSaturation' | 'respiratoryRate' | 'multiple';
  message:           string;
  details:           string[];
  severity:          'critical' | 'warning';
  timestamp:         Date;
  read:              boolean;
  acknowledged:      boolean;
}

export interface ToastAlert {
  id:        string;
  message:   string;
  details:   string[];
  severity:  'critical' | 'warning';
  roomNumber: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {

  private readonly POLL_INTERVAL_MS = 30_000;

  private notifications$ = new BehaviorSubject<CriticalNotification[]>([]);
  private toasts$        = new BehaviorSubject<ToastAlert[]>([]);
  private pollSub?:      Subscription;

  // ── Room lookup map (populated once, refreshed each poll) ──────────────
  private roomMap = new Map<number, Room>();

  private alertAudio = new Audio('assets/template/sounds/alert.mp3');

  notifications = this.notifications$.asObservable();
  toasts        = this.toasts$.asObservable();

  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toastsList = this.toastsSubject.asObservable();

  success(title: string, message: string): void {
    this.addToast('success', title, message);
  }

  error(title: string, message: string): void {
    this.addToast('error', title, message);
  }

  warning(title: string, message: string): void {
    this.addToast('warning', title, message);
  }

  info(title: string, message: string): void {
    this.addToast('info', title, message);
  }

  private addToast(type: Toast['type'], title: string, message: string): void {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };
    this.toastsSubject.next([toast, ...this.toastsSubject.value]);
  }

  get unreadCount(): number {
    return this.notifications$.value.filter(n => !n.read).length;
  }

  get allNotifications(): CriticalNotification[] {
    return this.notifications$.value;
  }

  constructor(
    private hospService:  HospitalizationService,
    private roomService:  RoomService,
    private keycloakService: KeycloakService
  ) {
    if (this.keycloakService.isUserInRole('doctor')) {
      this.startPolling();
    }
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  startPolling(): void {
    this.checkForCriticals();
    this.pollSub = interval(this.POLL_INTERVAL_MS)
      .subscribe(() => this.checkForCriticals());
  }

  private checkForCriticals(): void {
    // Load rooms + hospitalizations in parallel so we can resolve roomNumber
    forkJoin({
      hospitalizations: this.hospService.getAll(),
      rooms:            this.roomService.getAll()
    }).subscribe({
      next: ({ hospitalizations, rooms }) => {
        // Rebuild room lookup map on every poll (handles room changes)
        this.roomMap = new Map((rooms as Room[]).map(r => [r.id, r]));

        const currentNotifs = this.notifications$.value;
        const newNotifs: CriticalNotification[] = [];

        (hospitalizations as any[]).forEach(h => {
          if (!h.vitalSignsRecords?.length) return;

          // Resolve roomId from either h.roomId (new) or h.room?.id (legacy)
          const roomId: number | null = h.roomId ?? h.room?.id ?? null;
          const roomNumber = roomId != null
            ? (this.roomMap.get(roomId)?.roomNumber ?? `#${roomId}`)
            : '—';

          h.vitalSignsRecords.forEach((vs: any) => {
            const alerts = this.evaluateVitals(vs);
            if (!alerts.length) return;

            const notifId = `${h.id}-${vs.recordDate}`;
            if (currentNotifs.some(n => n.id === notifId)) return;

            const severity: CriticalNotification['severity'] =
              alerts.some(a => a.critical) ? 'critical' : 'warning';

            const type: CriticalNotification['type'] =
              alerts.length > 1 ? 'multiple' : alerts[0].type;

            newNotifs.push({
              id:                notifId,
              hospitalizationId: h.id,
              patientId:         h.userId ?? '—',
              roomId,
              roomNumber,
              type,
              message: severity === 'critical'
                ? `Critical vitals — Room ${roomNumber} · Patient #${h.userId}`
                : `Abnormal vitals — Room ${roomNumber} · Patient #${h.userId}`,
              details:     alerts.map(a => a.message),
              severity,
              timestamp:   new Date(vs.recordDate),
              read:        false,
              acknowledged: false,
            });
          });
        });

        if (newNotifs.length) {
          const merged = [...newNotifs, ...currentNotifs];
          merged.sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          this.notifications$.next(merged);
          this.playAlertSound(newNotifs.some(n => n.severity === 'critical'));
          newNotifs.forEach(n => this.showToast(n));
        }
      },
      error: err => console.error('Notification poll error', err)
    });
  }

  // ── Sound ─────────────────────────────────────────────────────────────────

  private playAlertSound(isCritical: boolean): void {
    try {
      this.alertAudio.volume      = isCritical ? 1.0 : 0.5;
      this.alertAudio.currentTime = 0;
      this.alertAudio.play().catch(() => {});
    } catch (e) {
      console.warn('Could not play alert sound', e);
    }
  }

  // ── Toast popups ──────────────────────────────────────────────────────────

  private showToast(notif: CriticalNotification): void {
    const toast: ToastAlert = {
      id:         notif.id,
      message:    notif.message,
      details:    notif.details.slice(0, 2),
      severity:   notif.severity,
      roomNumber: notif.roomNumber,
      timestamp:  notif.timestamp,
    };
    this.toasts$.next([toast, ...this.toasts$.value]);
    const ttl = notif.severity === 'critical' ? 6000 : 4000;
    setTimeout(() => this.dismissToast(toast.id), ttl);
  }

  dismissToast(id: string): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }

  // ── Clinical thresholds ───────────────────────────────────────────────────

  private evaluateVitals(
    vs: any
  ): { type: CriticalNotification['type']; message: string; critical: boolean }[] {

    const alerts: { type: CriticalNotification['type']; message: string; critical: boolean }[] = [];

    if (vs.temperature != null) {
      if      (vs.temperature > 39.5) alerts.push({ type: 'temperature', message: `High fever: ${vs.temperature}°C (>39.5°C)`,    critical: true  });
      else if (vs.temperature > 38)   alerts.push({ type: 'temperature', message: `Fever: ${vs.temperature}°C (>38°C)`,            critical: false });
      else if (vs.temperature < 35)   alerts.push({ type: 'temperature', message: `Hypothermia: ${vs.temperature}°C (<35°C)`,      critical: true  });
      else if (vs.temperature < 36)   alerts.push({ type: 'temperature', message: `Low temperature: ${vs.temperature}°C (<36°C)`,  critical: false });
    }

    if (vs.heartRate != null) {
      if      (vs.heartRate > 150) alerts.push({ type: 'heartRate', message: `Severe tachycardia: ${vs.heartRate} bpm (>150)`, critical: true  });
      else if (vs.heartRate > 100) alerts.push({ type: 'heartRate', message: `Tachycardia: ${vs.heartRate} bpm (>100)`,        critical: false });
      else if (vs.heartRate < 40)  alerts.push({ type: 'heartRate', message: `Severe bradycardia: ${vs.heartRate} bpm (<40)`,  critical: true  });
      else if (vs.heartRate < 60)  alerts.push({ type: 'heartRate', message: `Bradycardia: ${vs.heartRate} bpm (<60)`,         critical: false });
    }

    if (vs.oxygenSaturation != null) {
      if      (vs.oxygenSaturation < 90) alerts.push({ type: 'oxygenSaturation', message: `Critical SpO₂: ${vs.oxygenSaturation}% (<90%)`, critical: true  });
      else if (vs.oxygenSaturation < 95) alerts.push({ type: 'oxygenSaturation', message: `Low SpO₂: ${vs.oxygenSaturation}% (<95%)`,      critical: false });
    }

    if (vs.respiratoryRate != null) {
      if      (vs.respiratoryRate > 30 || vs.respiratoryRate < 8)  alerts.push({ type: 'respiratoryRate', message: `Critical resp. rate: ${vs.respiratoryRate}/min`,  critical: true  });
      else if (vs.respiratoryRate > 20 || vs.respiratoryRate < 12) alerts.push({ type: 'respiratoryRate', message: `Abnormal resp. rate: ${vs.respiratoryRate}/min`,   critical: false });
    }

    return alerts;
  }

  // ── Public actions ────────────────────────────────────────────────────────

  markAllRead(): void {
    this.notifications$.next(this.notifications$.value.map(n => ({ ...n, read: true })));
  }

  markRead(id: string): void {
    this.notifications$.next(this.notifications$.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }

  acknowledge(id: string): void {
    this.notifications$.next(this.notifications$.value.map(n =>
      n.id === id ? { ...n, acknowledged: true, read: true } : n
    ));
  }

  clearAll(): void {
    this.notifications$.next([]);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}