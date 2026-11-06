import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { DriverService } from '../../services/driver.service';
import { DeliveryResponse, DeliveryStatus } from '../../services/delivery.service';
import { GeoService, DeliveryWithDistance } from '../../services/geo.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector:    'app-driver-dashboard',
  templateUrl: './driver-dashboard.component.html',
  styleUrls:   ['./driver-dashboard.component.scss'],
  standalone:  true,
  imports:     [CommonModule, FormsModule, HttpClientModule],
  providers:   [DatePipe]
})
export class DriverDashboardComponent implements OnInit {

  driverName     = '';
  driverUsername = '';

  // ── Livraisons enrichies avec distance ───────────────
  deliveries:      DeliveryWithDistance[] = [];
  loading          = false;
  geoLoading       = false;
  viewingDelivery: DeliveryWithDistance | null = null;

  sortMode: 'distance' | 'date' = 'distance';
  activeFilter: DeliveryStatus | 'ALL' = 'ALL';

  confirmAction: { delivery: DeliveryWithDistance; status: DeliveryStatus } | null = null;
  actionLoading = false;

  readonly DELIVERY_STATUSES: DeliveryStatus[] = [
    'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'
  ];

  constructor(
    private keycloak:  KeycloakService,
    private driverSvc: DriverService,
    private geoSvc:    GeoService,
    private notif:     NotificationService
  ) {}

  ngOnInit(): void {
    try {
      const token     = this.keycloak.getKeycloakInstance().tokenParsed as any;
      this.driverName = token?.preferred_username || '';
    } catch { this.driverName = ''; }

    if (this.driverName) this.loadDeliveries();
    else this.notif.error('Erreur', 'Impossible d\'identifier le livreur.');
  }

  // ════════════════════════════════════════════════
  // CHARGEMENT + TRI PAR DISTANCE
  // ════════════════════════════════════════════════

  loadDeliveries(): void {
    this.loading = true;

    this.driverSvc.getMyDeliveries(this.driverName).subscribe({
      next: rawData => {
        this.loading = false;

        if (!rawData.length) { this.deliveries = []; return; }

        // Séparer actives / terminées
        const active   = rawData.filter(d => d.status !== 'DELIVERED' && d.status !== 'RETURNED');
        const finished = rawData.filter(d => d.status === 'DELIVERED' || d.status === 'RETURNED');

        if (active.length === 0) {
          this.deliveries = rawData.map(d => ({ ...d, geoError: true }));
          return;
        }

        // Trier les livraisons actives par distance
        this.geoLoading = true;
        this.geoSvc.sortDeliveriesByDistance(active).subscribe({
          next: sorted => {
            this.geoLoading = false;
            // Livraisons actives triées + terminées à la fin
            this.deliveries = [
              ...sorted,
              ...finished.map(d => ({ ...d, geoError: true }))
            ];
          },
          error: () => {
            this.geoLoading = false;
            this.deliveries = rawData.map(d => ({ ...d, geoError: true }));
          }
        });
      },
      error: () => {
        this.loading = false;
        this.notif.error('Erreur', 'Impossible de charger vos livraisons.');
      }
    });
  }

  toggleSort(): void {
    this.sortMode = this.sortMode === 'distance' ? 'date' : 'distance';
  }

  // ════════════════════════════════════════════════
  // FILTRES & GETTERS
  // ════════════════════════════════════════════════

  get filteredDeliveries(): DeliveryWithDistance[] {
    let list = this.activeFilter === 'ALL'
      ? this.deliveries
      : this.deliveries.filter(d => d.status === this.activeFilter);

    if (this.sortMode === 'date') {
      list = [...list].sort((a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }
    return list;
  }

  get stats() {
    const total     = this.deliveries.length;
    const scheduled = this.deliveries.filter(d => d.status === 'SCHEDULED').length;
    const inTransit = this.deliveries.filter(d => d.status === 'IN_TRANSIT').length;
    const delivered = this.deliveries.filter(d => d.status === 'DELIVERED').length;
    const failed    = this.deliveries.filter(d => d.status === 'FAILED').length;
    const rate      = total > 0 ? Math.round(delivered / total * 100) : 0;
    return { total, scheduled, inTransit, delivered, failed, rate };
  }

  // ════════════════════════════════════════════════
  // ACTIONS STATUT
  // ════════════════════════════════════════════════

  askConfirm(delivery: DeliveryWithDistance, status: DeliveryStatus): void {
    this.confirmAction = { delivery, status };
  }

  cancelConfirm(): void { this.confirmAction = null; }

  executeAction(): void {
    if (!this.confirmAction) return;
    const { delivery, status } = this.confirmAction;
    this.actionLoading = true;

    this.driverSvc.updateStatus(delivery.id, status).subscribe({
      next: () => {
        this.actionLoading = false;
        this.confirmAction = null;
        this.notif.success('Statut mis à jour',
          `${delivery.trackingNumber} → ${this.statusLabel(status)}`);
        this.loadDeliveries();
        if (this.viewingDelivery?.id === delivery.id) {
          this.viewingDelivery = { ...this.viewingDelivery, status };
        }
      },
      error: () => {
        this.actionLoading = false;
        this.notif.error('Erreur', `Impossible de passer au statut ${status}.`);
      }
    });
  }

  // ════════════════════════════════════════════════
  // DÉTAIL
  // ════════════════════════════════════════════════

  viewDelivery(d: DeliveryWithDistance): void { this.viewingDelivery = d; }
  closeDetail(): void                          { this.viewingDelivery = null; }

  openMaps(address: string): void {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      '_blank'
    );
  }

  // ════════════════════════════════════════════════
  // HELPERS VISUELS
  // ════════════════════════════════════════════════

  statusClass(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED: 'status--scheduled', IN_TRANSIT: 'status--transit',
      DELIVERED: 'status--delivered', FAILED: 'status--failed', RETURNED: 'status--returned'
    };
    return m[s] || '';
  }

  statusIcon(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED: 'fa-calendar-check', IN_TRANSIT: 'fa-truck-moving',
      DELIVERED: 'fa-box-open', FAILED: 'fa-times-circle', RETURNED: 'fa-undo-alt'
    };
    return m[s] || 'fa-circle';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED: 'Planifiée', IN_TRANSIT: 'En transit',
      DELIVERED: 'Livrée', FAILED: 'Échec', RETURNED: 'Retournée'
    };
    return m[s] || s;
  }

  availableActions(status: string): { label: string; status: DeliveryStatus; cls: string }[] {
    const map: Record<string, { label: string; status: DeliveryStatus; cls: string }[]> = {
      SCHEDULED:  [{ label: '🚛 Partir en livraison', status: 'IN_TRANSIT', cls: 'action--transit' }],
      IN_TRANSIT: [
        { label: '✅ Marquer livrée',    status: 'DELIVERED', cls: 'action--delivered' },
        { label: '❌ Signaler un échec',  status: 'FAILED',    cls: 'action--failed'   }
      ],
      FAILED: [
        { label: '🔄 Retenter',  status: 'IN_TRANSIT', cls: 'action--transit'  },
        { label: '↩️ Retourner', status: 'RETURNED',   cls: 'action--returned' }
      ],
      DELIVERED: [], RETURNED: []
    };
    return map[status] || [];
  }

  isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === new Date().toDateString();
  }

  isOverdue(dateStr: string, status: string): boolean {
    if (!dateStr || status === 'DELIVERED' || status === 'RETURNED') return false;
    return new Date(dateStr) < new Date();
  }

  trackById(_: number, item: any): string { return item.id; }
}