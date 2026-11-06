import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HospitalizationService } from '../../services/hospitalization.service';
import { RoomService, Room } from '../../services/Room.service';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface VitalStat {
  key:       string;
  label:     string;
  unit:      string;
  icon:      string;              // SVG path string
  current:   number | null;
  min:       number | null;
  max:       number | null;
  avg:       number | null;
  history:   number[];            // chronological oldest → newest
  status:    'normal' | 'warning' | 'critical' | 'missing';
  trend:     'up' | 'down' | 'stable' | 'unknown';
  sparkline: string;              // SVG polyline points (line)
  sparkArea: string;              // SVG polygon points (fill area)
  normalMin: number;
  normalMax: number;
}

export interface PatientCard {
  hospitalizationId: number;
  userId:       string;
  status:       string;
  vitals:       VitalStat[];
  overallLevel: 'normal' | 'warning' | 'critical';
  lastRecorded: string;
  vitalsCount:  number;
}

export interface RoomCard {
  room:            Room;
  patients:        PatientCard[];
  activeCount:     number;
  pendingCount:    number;
  dischargedCount: number;
  worstLevel:      'normal' | 'warning' | 'critical';
  criticalVitals:  number;
  warningVitals:   number;
}

// ── Component ───────────────────────────────────────────────────────────────

@Component({
  selector:    'app-statistique-hospitalization',
  templateUrl: './statistique-hospitalization.component.html',
  standalone:  true,
  imports:     [CommonModule],
})
export class StatistiqueHospitalizationComponent implements OnInit {

  loading   = true;
  roomCards: RoomCard[] = [];

  // ── Vital sign configuration ─────────────────────────────────────────────
  private readonly VITAL_CONFIGS = [
    {
      key: 'temperature', label: 'Temperature', unit: '°C',
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
      normalMin: 36, normalMax: 38, warnMin: 35, warnMax: 39.5, threshold: 0.2,
      description: 'Normal: 36–38 °C',
    },
    {
      key: 'heartRate', label: 'Heart Rate', unit: 'bpm',
      icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
      normalMin: 60, normalMax: 100, warnMin: 45, warnMax: 120, threshold: 5,
      description: 'Normal: 60–100 bpm',
    },
    {
      key: 'oxygenSaturation', label: 'SpO₂', unit: '%',
      icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
      normalMin: 95, normalMax: 100, warnMin: 90, warnMax: 100, threshold: 1,
      description: 'Normal: 95–100 %',
    },
    {
      key: 'respiratoryRate', label: 'Resp. Rate', unit: '/min',
      icon: 'M12 4.5v15m7.5-7.5h-15',
      normalMin: 12, normalMax: 20, warnMin: 8, warnMax: 25, threshold: 1,
      description: 'Normal: 12–20 /min',
    },
  ] as const;

  constructor(
    private hospService: HospitalizationService,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      hospitalizations: this.hospService.getAll(),
      rooms:            this.roomService.getAll(),
    }).subscribe({
      next:  ({ hospitalizations, rooms }) => {
        this.compute(hospitalizations as any[], rooms);
        this.loading = false;
      },
      error: err => { console.error(err); this.loading = false; },
    });
  }

  // ── Main computation ──────────────────────────────────────────────────────

  private compute(data: any[], rooms: Room[]): void {
    const roomMap = new Map<number, Room>(rooms.map(r => [r.id, r]));
    const byRoom  = new Map<number, any[]>();

    data.forEach(h => {
      const rid = h.roomId ?? h.room?.id;
      if (rid == null) return;
      if (!byRoom.has(rid)) byRoom.set(rid, []);
      byRoom.get(rid)!.push(h);
    });

    this.roomCards = [];

    byRoom.forEach((hosps, roomId) => {
      const room = roomMap.get(roomId);
      if (!room) return;

      const patients = hosps.map(h => this.buildPatientCard(h));

      const activeCount     = hosps.filter(h => h.status === 'active').length;
      const pendingCount    = hosps.filter(h => h.status === 'pending').length;
      const dischargedCount = hosps.filter(h => h.status === 'discharged').length;

      const allVitals    = patients.flatMap(p => p.vitals);
      const criticalVitals = allVitals.filter(v => v.status === 'critical').length;
      const warningVitals  = allVitals.filter(v => v.status === 'warning').length;

      const worstLevel: RoomCard['worstLevel'] =
        patients.some(p => p.overallLevel === 'critical') ? 'critical' :
        patients.some(p => p.overallLevel === 'warning')  ? 'warning'  : 'normal';

      this.roomCards.push({
        room, patients,
        activeCount, pendingCount, dischargedCount,
        worstLevel, criticalVitals, warningVitals,
      });
    });

    const order = { critical: 2, warning: 1, normal: 0 } as const;
    this.roomCards.sort((a, b) => order[b.worstLevel] - order[a.worstLevel]);
  }

  // ── Patient card builder ──────────────────────────────────────────────────

  private buildPatientCard(h: any): PatientCard {
    // Oldest → newest for correct sparkline direction
    const records: any[] = (h.vitalSignsRecords || [])
      .filter((r: any) => r.recordDate)
      .sort((a: any, b: any) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());

    const vitals: VitalStat[] = this.VITAL_CONFIGS.map(cfg => {
      const history = records
        .map(r => r[cfg.key as string])
        .filter((v): v is number => v != null && !isNaN(Number(v)))
        .map(Number);

      const current = history.length > 0 ? history[history.length - 1] : null;
      const min     = history.length > 0 ? +Math.min(...history).toFixed(1) : null;
      const max     = history.length > 0 ? +Math.max(...history).toFixed(1) : null;
      const avg     = history.length > 0
        ? +(history.reduce((a, b) => a + b, 0) / history.length).toFixed(1)
        : null;

      let status: VitalStat['status'] = 'missing';
      if (current != null) {
        if (current < cfg.warnMin   || current > cfg.warnMax)   status = 'critical';
        else if (current < cfg.normalMin || current > cfg.normalMax) status = 'warning';
        else                                                     status = 'normal';
      }

      let trend: VitalStat['trend'] = 'unknown';
      if (history.length >= 2) {
        const diff = history[history.length - 1] - history[history.length - 2];
        trend = Math.abs(diff) <= cfg.threshold ? 'stable' : diff > 0 ? 'up' : 'down';
      }

      const { sparkline, sparkArea } = this.buildSparklines(history);

      return {
        key: cfg.key, label: cfg.label, unit: cfg.unit, icon: cfg.icon,
        current, min, max, avg, history, status, trend,
        sparkline, sparkArea,
        normalMin: cfg.normalMin, normalMax: cfg.normalMax,
      };
    });

    const overallLevel: PatientCard['overallLevel'] =
      vitals.some(v => v.status === 'critical') ? 'critical' :
      vitals.some(v => v.status === 'warning')  ? 'warning'  : 'normal';

    const lastRecord = records[records.length - 1] ?? null;

    return {
      hospitalizationId: h.id,
      userId:       h.userId ?? '—',
      status:       h.status,
      vitals,
      overallLevel,
      vitalsCount:  records.length,
      lastRecorded: lastRecord?.recordDate
        ? new Date(lastRecord.recordDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : 'No data',
    };
  }

  // ── Sparkline builder ─────────────────────────────────────────────────────

  private buildSparklines(
    values: number[], w = 88, h = 32,
  ): { sparkline: string; sparkArea: string } {
    if (values.length < 2) return { sparkline: '', sparkArea: '' };

    const min   = Math.min(...values);
    const max   = Math.max(...values);
    const range = max - min || 1;
    const pad   = 3;

    const pts = values.map((v, i) => ({
      x: +((i / (values.length - 1)) * w).toFixed(2),
      y: +(h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(2),
    }));

    const sparkline = pts.map(p => `${p.x},${p.y}`).join(' ');
    const sparkArea = `0,${h} ${sparkline} ${w},${h}`;
    return { sparkline, sparkArea };
  }

  // ── Style & label helpers ─────────────────────────────────────────────────

  statusColor(status: VitalStat['status']): string {
    return {
      normal:   '#10b981',
      warning:  '#f59e0b',
      critical: '#ef4444',
      missing:  '#94a3b8',
    }[status];
  }

  statusLabel(status: VitalStat['status']): string {
    return { normal: 'Normal', warning: 'Warning', critical: 'Critical', missing: 'No data' }[status];
  }

  statusBadgeClass(status: VitalStat['status']): string {
    return {
      normal:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      warning:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
      missing:  'bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/[0.03] dark:text-gray-500 dark:border-gray-700',
    }[status];
  }

  vitalCardClass(status: VitalStat['status']): string {
    return {
      normal:   'border-emerald-100 dark:border-emerald-500/20',
      warning:  'border-amber-200 dark:border-amber-500/30',
      critical: 'border-red-200 dark:border-red-500/30',
      missing:  'border-gray-200 dark:border-gray-700',
    }[status];
  }

  trendArrow(trend: VitalStat['trend']): string {
    return { up: '↑', down: '↓', stable: '→', unknown: '' }[trend];
  }

  trendClass(trend: VitalStat['trend']): string {
    return {
      up:      'text-red-500 dark:text-red-400',
      down:    'text-emerald-500 dark:text-emerald-400',
      stable:  'text-gray-400 dark:text-gray-500',
      unknown: 'hidden',
    }[trend];
  }

  overallLevelClass(level: PatientCard['overallLevel']): string {
    return {
      normal:   'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      warning:  'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      critical: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    }[level];
  }

  overallLevelLabel(level: PatientCard['overallLevel']): string {
    return { normal: '✓ All Normal', warning: '⚠ Warning', critical: '✕ Critical' }[level];
  }

  roomHeaderBg(level: RoomCard['worstLevel']): string {
    return {
      normal:   'from-emerald-50 to-white dark:from-emerald-500/[0.08] dark:to-transparent',
      warning:  'from-amber-50 to-white dark:from-amber-500/[0.08] dark:to-transparent',
      critical: 'from-red-50 to-white dark:from-red-500/[0.08] dark:to-transparent',
    }[level];
  }

  worstColor(level: RoomCard['worstLevel']): string {
    return { normal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }[level];
  }

  statusPillClass(status: string): string {
    return ({
      active:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      pending:    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      discharged: 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400',
    } as Record<string, string>)[status] ?? 'bg-gray-100 text-gray-500';
  }

  readonly roomTypeLabels: Record<string, string> = {
    standard: 'Standard', intensive: 'ICU', isolation: 'Isolation',
    pediatric: 'Pediatric', maternity: 'Maternity',
  };

  readonly roomTypeColors: Record<string, string> = {
    standard:  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    intensive: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    isolation: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    pediatric: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
    maternity: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  };

  occupancyPercent(room: Room): number {
    return room.capacity > 0 ? Math.round((room.currentOccupancy / room.capacity) * 100) : 0;
  }
}