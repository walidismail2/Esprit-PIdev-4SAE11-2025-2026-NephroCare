import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  StatsService, GlobalStats, OrderStats, DeliveryStats, DriverStat
} from '../../services/stats.service';
 
@Component({
  selector:    'app-orders-stats',
  templateUrl: './orders-stats.component.html',
  styleUrls:   ['./orders-stats.component.scss'],
  standalone:  true,
  imports:     [CommonModule, HttpClientModule]
})
export class OrdersStatsComponent implements OnInit {
 
  stats:   GlobalStats | null = null;
  loading = true;
  error   = false;
 
  // Vue active (onglet)
  activeView: 'orders' | 'deliveries' | 'drivers' = 'orders';
 
  constructor(private statsSvc: StatsService) {}
 
  ngOnInit(): void { this.loadStats(); }
 
  loadStats(): void {
    this.loading = true;
    this.error   = false;
    this.statsSvc.getGlobalStats().subscribe({
      next:  data => { this.stats = data; this.loading = false; },
      error: ()   => { this.error = true;  this.loading = false; }
    });
  }
 
  // ── Helpers pour les barres de progression ────────
  get orderStatusBars(): { label: string; value: number; pct: number; cls: string }[] {
    if (!this.stats) return [];
    const o   = this.stats.orders;
    const tot = o.totalOrders || 1;
    return [
      { label: 'Pending',    value: o.pending,    pct: o.pending    / tot * 100, cls: 'bar--pending'    },
      { label: 'Confirmed',  value: o.confirmed,  pct: o.confirmed  / tot * 100, cls: 'bar--confirmed'  },
      { label: 'Processing', value: o.processing, pct: o.processing / tot * 100, cls: 'bar--processing' },
      { label: 'Shipped',    value: o.shipped,    pct: o.shipped    / tot * 100, cls: 'bar--shipped'    },
      { label: 'Delivered',  value: o.delivered,  pct: o.delivered  / tot * 100, cls: 'bar--delivered'  },
      { label: 'Cancelled',  value: o.cancelled,  pct: o.cancelled  / tot * 100, cls: 'bar--cancelled'  },
    ];
  }
 
  get deliveryStatusBars(): { label: string; value: number; pct: number; cls: string }[] {
    if (!this.stats) return [];
    const d   = this.stats.deliveries;
    const tot = d.totalDeliveries || 1;
    return [
      { label: 'Scheduled',  value: d.scheduled,  pct: d.scheduled  / tot * 100, cls: 'bar--scheduled'  },
      { label: 'In transit', value: d.inTransit,  pct: d.inTransit  / tot * 100, cls: 'bar--transit'    },
      { label: 'Delivered',  value: d.delivered,  pct: d.delivered  / tot * 100, cls: 'bar--delivered'  },
      { label: 'Failed',     value: d.failed,     pct: d.failed     / tot * 100, cls: 'bar--failed'     },
      { label: 'Returned',   value: d.returned,   pct: d.returned   / tot * 100, cls: 'bar--returned'   },
    ];
  }
 
  // Couleur du gauge selon le taux
  gaugeClass(rate: number): string {
    if (rate >= 70) return 'gauge--green';
    if (rate >= 40) return 'gauge--orange';
    return 'gauge--red';
  }
 
  // Texte de santé globale
  get healthLabel(): string {
    if (!this.stats) return '—';
    const rate = this.stats.deliveries.successRate;
    if (rate >= 80) return '🟢 Excellent';
    if (rate >= 60) return '🟡 Correct';
    return '🔴 À améliorer';
  }
}