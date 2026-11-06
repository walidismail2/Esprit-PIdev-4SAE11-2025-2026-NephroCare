import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  StockService,
  StockMovement,
  StockStats
} from '../../../services/stock.service';
import { PharmacyService, Medication } from '../../../services/pharmacy.service';

interface ChartSegment {
  key: string;
  label: string;
  count: number;
  color: string;
  gradient: string;
  pct: number;
  path: string;
}

interface DailyActivity {
  date: string;
  label: string;
  inQty: number;
  outQty: number;
}

interface TopMedication {
  name: string;
  total: number;
  inQty: number;
  outQty: number;
  movements: number;
  isKidney: boolean;
}

@Component({
  selector: 'app-statistique-pharmacy',
  templateUrl: './statistique-pharmacy.component.html',
  styleUrls: ['./statistique-pharmacy.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class StatistiquePharmacyComponent implements OnInit {

  movements: StockMovement[] = [];
  medications: Medication[] = [];
  stats: StockStats | null = null;
  loading = true;
  selectedRange = '7';

  today!: string; // ✅ ajout pour gestion expiration
  netFlow = 0;


  dailyActivity: DailyActivity[] = [];
  topMedications: TopMedication[] = [];
  pieSegments: ChartSegment[] = [];
  reasonBreakdown: { reason: string; count: number; color: string }[] = [];

  readonly KIDNEY_MEDS = [
    'Ramipril','Losartan','Furosemide','Spironolactone',
    'Epoetin alfa','Sevelamer','Calcitriol','Tacrolimus',
    'Sodium bicarbonate','Calcium gluconate'
  ];

  constructor(
    private stockService: StockService,
    private pharmacyService: PharmacyService
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.today = now.toISOString().split('T')[0]; // yyyy-MM-dd
    this.loadAll();
  }

  /* ========================= LOAD DATA ========================= */

  loadAll(): void {
    this.loading = true;
    let done = 0;
    const check = () => {
      if (++done === 3) {
        this.compute();
        this.loading = false;
      }
    };

    this.stockService.getAllMovements().subscribe({
      next: d => { this.movements = d; check(); },
      error: () => check()
    });

    this.stockService.getStats().subscribe({
      next: d => { this.stats = d; check(); },
      error: () => check()
    });

    this.pharmacyService.getAll().subscribe({
      next: d => { this.medications = d; check(); },
      error: () => check()
    });
  }

  compute(): void {
    this.computePie();
    this.computeDaily();
    this.computeTopMeds();
    this.computeReasons();
  }

  onRangeChange(): void {
    this.computeDaily();
  }

  /* ========================= EXPIRATION ========================= */

  isExpired(date?: string | null): boolean {
    if (!date) return false;
    return date < this.today;
  }

  /* ========================= PIE ========================= */

  computePie(): void {
    if (!this.stats || this.stats.total === 0) {
      this.pieSegments = [];
      return;
    }

    const total = this.stats.total;

    const raw = [
      { key: 'ok',  label: 'In Stock',     count: this.stats.available, color: '#22c55e', gradient: 'url(#sg-ok)'  },
      { key: 'low', label: 'Low Stock',    count: this.stats.low,       color: '#f59e0b', gradient: 'url(#sg-low)' },
      { key: 'out', label: 'Out of Stock', count: this.stats.out,       color: '#ef4444', gradient: 'url(#sg-out)' }
    ].filter(s => s.count > 0);

    let start = -90;

    this.pieSegments = raw.map(seg => {
      const pct = seg.count / total;
      const angle = pct * 360;
      const path = this.describeArc(100, 100, 80, start, start + angle);
      start += angle;

      return { ...seg, pct: Math.round(pct * 100), path };
    });
  }

  /* ========================= DAILY ========================= */

  computeDaily(): void {
    const days = parseInt(this.selectedRange, 10);
    const result: DailyActivity[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);

      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });

      const dayMoves = this.movements.filter(m =>
        m.createdAt && m.createdAt.startsWith(dateStr)
      );

      result.push({
        date: dateStr,
        label,
        inQty: dayMoves.filter(m => m.type === 'IN')
                       .reduce((s, m) => s + m.quantity, 0),
        outQty: dayMoves.filter(m => m.type === 'OUT')
                        .reduce((s, m) => s + m.quantity, 0)
      });
    }

    this.dailyActivity = result;
  }

  get maxDailyQty(): number {
    return Math.max(1,
      ...this.dailyActivity.map(d =>
        Math.max(d.inQty, d.outQty)
      )
    );
  }

  barHeight(val: number): number {
    return Math.round((val / this.maxDailyQty) * 100);
  }

  /* ========================= TOP MEDS ========================= */

  computeTopMeds(): void {
    const map = new Map<string, TopMedication>();

    this.movements.forEach(m => {
      if (!map.has(m.medicationName)) {
        map.set(m.medicationName, {
          name: m.medicationName,
          total: 0,
          inQty: 0,
          outQty: 0,
          movements: 0,
          isKidney: this.KIDNEY_MEDS.includes(m.medicationName)
        });
      }

      const e = map.get(m.medicationName)!;
      e.movements++;
      e.total += m.quantity;

      if (m.type === 'IN')  e.inQty  += m.quantity;
      if (m.type === 'OUT') e.outQty += m.quantity;
    });

    this.topMedications = Array.from(map.values())
      .sort((a, b) => b.movements - a.movements)
      .slice(0, 8);
  }

  get maxTopQty(): number {
    return Math.max(1, ...this.topMedications.map(m => m.total));
  }

  topBarWidth(val: number): number {
    return Math.round((val / this.maxTopQty) * 100);
  }

  /* ========================= REASONS ========================= */

  computeReasons(): void {
    const colors: Record<string,string> = {
      MANUAL_RESTOCK: '#3b82f6',
      PRESCRIPTION_DISPENSED: '#8b5cf6',
      ADJUSTMENT: '#f59e0b',
      EXPIRED: '#ef4444',
      INITIAL_STOCK: '#22c55e'
    };

    const labels: Record<string,string> = {
      MANUAL_RESTOCK: 'Manual Restock',
      PRESCRIPTION_DISPENSED: 'Prescription',
      ADJUSTMENT: 'Adjustment',
      EXPIRED: 'Expired',
      INITIAL_STOCK: 'Initial Stock'
    };

    const map = new Map<string, number>();

    this.movements.forEach(m =>
      map.set(m.reason, (map.get(m.reason) || 0) + 1)
    );

    this.reasonBreakdown = Array.from(map.entries())
      .map(([reason, count]) => ({
        reason: labels[reason] || reason,
        count,
        color: colors[reason] || '#94a3b8'
      }))
      .sort((a, b) => b.count - a.count);
  }

  get totalReasons(): number {
    return this.reasonBreakdown.reduce((s, r) => s + r.count, 0) || 1;
  }

  /* ========================= STOCK ========================= */

  stockLevel(qty?: number): 'out' | 'low' | 'ok' {
    if (!qty || qty === 0) return 'out';
    if (qty <= 10) return 'low';
    return 'ok';
  }

  /* ========================= NET FLOW ========================= */

  getNetFlow(): number {
    const inn = this.movements
      .filter(m => m.type === 'IN')
      .reduce((s, m) => s + m.quantity, 0);

    const out = this.movements
      .filter(m => m.type === 'OUT')
      .reduce((s, m) => s + m.quantity, 0);

    return inn - out;
  }

  /* ========================= SVG HELPERS ========================= */

  polarToCartesian(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  describeArc(cx: number, cy: number, r: number, start: number, end: number): string {
    if (Math.abs(end - start) >= 359.9) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    }

    const s = this.polarToCartesian(cx, cy, r, start);
    const e = this.polarToCartesian(cx, cy, r, end);
    const large = (end - start) > 180 ? 1 : 0;

    return `M ${cx} ${cy}
            L ${s.x} ${s.y}
            A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}
            Z`;
  }
  trackByMedication(index: number, med: any): any {
  return med.id; // ou med.name si tu n'as pas d'id
}
}