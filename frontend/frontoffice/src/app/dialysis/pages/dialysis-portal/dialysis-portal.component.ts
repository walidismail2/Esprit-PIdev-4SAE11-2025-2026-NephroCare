import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  DialysisFrontService,
  DialysisSessionDto,
  DialysisTreatmentDto
} from '../../../services/dialysis-front.service';

type SessionFilter = 'all' | 'done' | 'open';
type SortField = 'date-desc' | 'date-asc' | 'ktv-desc' | 'ktv-asc';

type SummaryVm = {
  totalSessions: number;
  activeTreatment: DialysisTreatmentDto | null;
  avgKtV: number | null;
  compliancePct: number | null;
  lastSessionDate: string | null;
  nextSessionDate: string | null;
};

@Component({
  selector: 'app-dialysis-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialysis-portal.component.html',
  styleUrls: ['./dialysis-portal.component.css'],
})
export class DialysisPortalComponent implements OnInit {
  loading = true;

  treatments: DialysisTreatmentDto[] = [];
  sessions: DialysisSessionDto[] = [];
  filteredSessions: DialysisSessionDto[] = [];

  hasAnyData = false;

  // toolbar
  searchTerm = '';
  sessionFilter: SessionFilter = 'all';
  sortField: SortField = 'date-desc';

  // flags
  isLowKtv = false;
  isLowCompliance = false;

  summary: SummaryVm = {
    totalSessions: 0,
    activeTreatment: null,
    avgKtV: null,
    compliancePct: null,
    lastSessionDate: null,
    nextSessionDate: null,
  };

  // details drawer (instead of alert)
  detailsOpen = false;
  selectedSession: DialysisSessionDto | null = null;

  constructor(private api: DialysisFrontService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    forkJoin({
      treatments: this.api.getMyTreatments().pipe(catchError(() => of([] as DialysisTreatmentDto[]))),
      sessions: this.api.getMyHistory().pipe(catchError(() => of([] as DialysisSessionDto[]))),
    }).subscribe(({ treatments, sessions }) => {
      this.treatments = treatments ?? [];
      this.sessions = (sessions ?? [])
        .slice()
        .sort((a, b) => this.safeDate(b.sessionDate) - this.safeDate(a.sessionDate));

      this.buildSummary();
      this.applyFilters();

      this.hasAnyData = this.treatments.length > 0 || this.sessions.length > 0;
      this.loading = false;
    });
  }

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  private buildSummary(): void {
    const active = this.findActiveTreatment(this.treatments);
    const avg = this.computeAvgKtV(this.sessions);
    const lastIso = this.sessions.length ? this.sessions[0].sessionDate : null;

    const weekCount = this.countSessionsThisWeek(this.sessions);

    const compliance =
      active?.frequencyPerWeek && Number(active.frequencyPerWeek) > 0
        ? this.clamp((weekCount / Number(active.frequencyPerWeek)) * 100, 0, 100)
        : null;

    const nextIso = active ? this.computeNextSessionDateIso(active, lastIso) : null;

    this.summary = {
      totalSessions: this.sessions.length,
      activeTreatment: active,
      avgKtV: avg,
      compliancePct: compliance,
      lastSessionDate: lastIso,
      nextSessionDate: nextIso,
    };

    this.isLowKtv = avg != null && avg < 1.2;
    this.isLowCompliance = compliance != null && compliance < 70;
  }

  private findActiveTreatment(list: DialysisTreatmentDto[]): DialysisTreatmentDto | null {
    return (list ?? []).find((t) => t.status === 'ACTIVE') ?? null;
  }

  private computeAvgKtV(list: DialysisSessionDto[]): number | null {
    const values = (list ?? [])
      .map((s) => this.sessionKtv(s))
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (!values.length) return null;
    const sum = values.reduce((acc, x) => acc + x, 0);
    return sum / values.length;
  }

  private sessionKtv(s: DialysisSessionDto): number | null {
    const v = s.eKtV ?? s.spKtV ?? s.achievedKtV;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  private countSessionsThisWeek(list: DialysisSessionDto[]): number {
    const { start, end } = this.getWeekBounds(new Date());
    return (list ?? []).filter((s) => {
      const d = s.sessionDate ? new Date(s.sessionDate) : null;
      return d ? d >= start && d <= end : false;
    }).length;
  }

  private computeNextSessionDateIso(
    t: DialysisTreatmentDto,
    lastSessionIso: string | null
  ): string | null {
    const freq = Number(t.frequencyPerWeek);
    if (!Number.isFinite(freq) || freq <= 0) return null;

    const base = lastSessionIso
      ? new Date(lastSessionIso)
      : t.startDate
        ? new Date(t.startDate)
        : new Date();

    const intervalDays = Math.max(1, Math.round(7 / freq));
    const next = new Date(base);
    next.setDate(next.getDate() + intervalDays);
    return next.toISOString();
  }

  // ─────────────────────────────────────────────
  // FILTERS / SORT
  // ─────────────────────────────────────────────
  setSessionFilter(f: SessionFilter): void {
    this.sessionFilter = f;
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    let list = (this.sessions ?? []).slice();

    if (this.sessionFilter === 'open') list = list.filter((s) => this.isOpen(s));
    if (this.sessionFilter === 'done') list = list.filter((s) => !this.isOpen(s));

    if (q) {
      list = list.filter((s) => {
        const dt = s.sessionDate ? new Date(s.sessionDate) : null;
        const dateStr = dt ? dt.toLocaleString() : '';
        const statusStr = this.isOpen(s) ? 'open in progress' : 'done completed';
        const ktvStr = String(this.sessionKtv(s) ?? '');
        const bpStr = String(s.preBloodPressure ?? '');
        const compStr = String(s.complications ?? '');
        const hay = `${dateStr} ${statusStr} ${ktvStr} ${bpStr} ${compStr}`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (this.sortField === 'date-desc') return this.safeDate(b.sessionDate) - this.safeDate(a.sessionDate);
      if (this.sortField === 'date-asc') return this.safeDate(a.sessionDate) - this.safeDate(b.sessionDate);

      const ak = this.sessionKtv(a) ?? -Infinity;
      const bk = this.sessionKtv(b) ?? -Infinity;

      if (this.sortField === 'ktv-desc') return bk - ak;
      if (this.sortField === 'ktv-asc') return ak - bk;
      return 0;
    });

    this.filteredSessions = list;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.sessionFilter = 'all';
    this.sortField = 'date-desc';
    this.applyFilters();
  }

  // ─────────────────────────────────────────────
  // UI helpers used in HTML
  // ─────────────────────────────────────────────
  isOpen(s: DialysisSessionDto): boolean {
    return s.weightAfter == null;
  }

  isLowSessionKtv(s: DialysisSessionDto): boolean {
    const v = this.sessionKtv(s);
    return v != null && v < 1.2;
  }

  sessionKtvLabel(s: DialysisSessionDto): string {
    const v = this.sessionKtv(s);
    return v == null ? '—' : v.toFixed(2);
  }

  displayKtVName(s: DialysisSessionDto): string {
    if (typeof s.eKtV === 'number') return 'eKt/V';
    if (typeof s.spKtV === 'number') return 'spKt/V';
    return 'Kt/V';
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openSessionDetails(s: DialysisSessionDto): void {
    this.selectedSession = s;
    this.detailsOpen = true;
    setTimeout(() => {
      const el = document.getElementById('session-details');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  closeSessionDetails(): void {
    this.detailsOpen = false;
    this.selectedSession = null;
  }

  downloadReport(sessionId: string): void {
    this.api.getMySessionReportPdf(sessionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dialysis-report-${sessionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to download PDF report.'),
    });
  }

  // ─────────────────────────────────────────────
  // utils
  // ─────────────────────────────────────────────
  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private safeDate(iso: string | null | undefined): number {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  private getWeekBounds(today: Date): { start: Date; end: Date } {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay(); // 0 Sun
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(d);
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
