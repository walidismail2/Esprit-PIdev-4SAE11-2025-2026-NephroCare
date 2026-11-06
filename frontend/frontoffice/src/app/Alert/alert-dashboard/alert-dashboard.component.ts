import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AlertService, Alert } from '../../services/alert.service';
import { BaseChartDirective } from 'ng2-charts';
import { AlertSocketService } from '../../services/alert-socket.service';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-alert-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, BaseChartDirective],
  templateUrl: './alert-dashboard.component.html',
  styleUrls: ['./alert-dashboard.component.css']
})
export class AlertDashboardComponent implements OnInit, OnDestroy {

  recentCritical: Alert[] = [];

  stats = {
    total: 0,
    resolved: 0,
    pending: 0
  };

  chartData: any;
  testTypeChartData: any;
  loading = false;

  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  private socketSub?: Subscription;

  // 🔊 Audio instance (important: éviter recréation)
  private audio = new Audio('assets/alarm.mp3');

  constructor(
    private alertService: AlertService,
    private socketService: AlertSocketService,
    private router: Router
  ) { }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  ngOnInit(): void {
    this.loading = true;

    // 🔹 Load initial data
    this.alertService.getAll().subscribe({
      next: (data) => {
        this.alertsSubject.next(data || []);
        this.updateDashboardStats(data || []);
        this.loading = false;
      },
      error: () => this.loading = false
    });

    // 🔥 REAL-TIME (WebSocket)
    this.socketSub = this.socketService.alerts$.subscribe(newAlert => {
      if (!newAlert) return;

      console.log('🚨 Nouvelle alerte reçue', newAlert);

      const current = this.alertsSubject.value;
      const updated = [newAlert, ...current];

      this.alertsSubject.next(updated);
      this.updateDashboardStats(updated);

      // 🔴 Notification sonore CRITICAL
      if (newAlert.severity === 'CRITICAL' && !newAlert.resolved) {
        this.playAlertSound();
      }
    });
  }

  // ─────────────────────────────────────────
  // DESTROY
  // ─────────────────────────────────────────
  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }

  // ─────────────────────────────────────────
  // SOUND 🔊
  // ─────────────────────────────────────────
  private playAlertSound() {
    try {
      this.audio.currentTime = 0;
      this.audio.play();
    } catch (e) {
      console.warn('Audio blocked by browser', e);
    }
  }

  // ─────────────────────────────────────────
  // STATS + CHARTS
  // ─────────────────────────────────────────
  updateDashboardStats(alerts: Alert[]) {

    if (!alerts) return;

    const total = alerts.length;
    const resolved = alerts.filter(a => a.resolved).length;
    const pending = total - resolved;

    this.stats = { total, resolved, pending };

    // 🔴 Recent critical
    this.recentCritical = alerts
      .filter(a => a.severity === 'CRITICAL' && !a.resolved)
      .slice(0, 10);

    // 📊 Severity chart
    const sevCounts = {
      CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
      HIGH: alerts.filter(a => a.severity === 'HIGH').length,
      MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
      LOW: alerts.filter(a => a.severity === 'LOW').length
    };

    this.chartData = {
      labels: ['Critique', 'Élevée', 'Moyenne', 'Faible'],
      datasets: [{
        data: [
          sevCounts.CRITICAL,
          sevCounts.HIGH,
          sevCounts.MEDIUM,
          sevCounts.LOW
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        hoverOffset: 6
      }]
    };

    // 🧪 TestType chart
    const typeCounts: Record<string, number> = {};

    alerts.forEach(a => {
      const type = String(a.type || 'UNKNOWN');
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    this.testTypeChartData = {
      labels: Object.keys(typeCounts),
      datasets: [{
        label: 'Alertes par Type',
        data: Object.values(typeCounts),
        backgroundColor: '#6366f1',
        borderRadius: 8
      }]
    };
  }

  // ─────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────
  goToAlerts(): void {
    this.router.navigate(['/alerts']);
  }
}