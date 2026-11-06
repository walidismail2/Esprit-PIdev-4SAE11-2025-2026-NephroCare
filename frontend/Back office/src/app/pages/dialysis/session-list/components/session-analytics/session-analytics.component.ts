import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent} from "../../../../../shared/components/ui/badge/badge.component";
import { BarChartOneComponent} from "../../../../../shared/components/charts/bar/bar-chart-one/bar-chart-one.component";
import { LineChartOneComponent} from "../../../../../shared/components/charts/line/line-chart-one/line-chart-one.component";
import { DialysisSeriesPoint, PatientWeeklyAdequacyRow} from "../../../../../shared/services/dialysis.service";

@Component({
    selector: 'app-session-analytics',
    standalone: true,
    imports: [CommonModule, BadgeComponent, BarChartOneComponent, LineChartOneComponent],
    templateUrl: './session-analytics.component.html',
})
export class SessionAnalyticsComponent {
    @Input() avgKtV: number | null = null;
    @Input() adequacyLabel = '-';
    @Input() adequacyColor: any = 'light';
    @Input() hasAnyOpenSession = false;

    @Input() analyticsLoading = false;
    @Input() latestMetrics!: { urr: number | null; spKtV: number | null; eKtV: number | null };

    @Input() metricColorFn!: (v: number | null, type: 'URR' | 'KTV') => any;

    @Input() weekly: PatientWeeklyAdequacyRow[] = [];
    @Input() series: DialysisSeriesPoint[] = [];

    weekLabels: string[] = [];
    weeklyAdequacyPct: Array<number | null> = [];
    sessionTrendLabels: string[] = [];
    sessionTrendSeries: { name: string; data: Array<number | null> }[] = [];

    ngOnChanges(): void {
        this.buildCharts();
    }

    private buildCharts(): void {
        this.buildWeeklyBar();
        this.buildSessionTrendLine();
    }

    private buildWeeklyBar(): void {
        const rows = (this.weekly ?? []).slice();
        this.weekLabels = rows.map((w) => {
            const ws = new Date(w.weekStart as any);
            const we = new Date(w.weekEnd as any);
            const a = ws.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const b = we.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return `${a}→${b}`;
        });

        this.weeklyAdequacyPct = rows.map((w) => {
            if (!w || (w.sessionsCount ?? 0) === 0) return null;
            return typeof w.adequacyPct === 'number' ? w.adequacyPct : null;
        });
    }

    private buildSessionTrendLine(): void {
        const pts = (this.series ?? []).slice();
        pts.sort((a, b) => new Date(a.sessionDate as any).getTime() - new Date(b.sessionDate as any).getTime());

        this.sessionTrendLabels = pts.map((p) => {
            const d = new Date(p.sessionDate as any);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });

        this.sessionTrendSeries = [
            { name: 'URR %', data: pts.map((p) => (typeof p.urr === 'number' ? p.urr : null)) },
            { name: 'spKt/V', data: pts.map((p) => (typeof p.spKtV === 'number' ? p.spKtV : null)) },
            { name: 'eKt/V', data: pts.map((p) => (typeof p.eKtV === 'number' ? p.eKtV : null)) },
        ];
    }
}