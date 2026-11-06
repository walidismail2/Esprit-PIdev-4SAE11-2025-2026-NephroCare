import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DialysisService, ScheduledSessionDto } from '../../../shared/services/dialysis.service';
import { DialysisTreatment } from '../../../shared/models/dialysis.model';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import {FormsModule} from "@angular/forms";

type RowVM = {
    sched: ScheduledSessionDto;
    patientName: string;
    treatmentStatus: string;
    accessType: string;
    freqPerWeek: number | null;
};

@Component({
    selector: 'app-my-schedule',
    standalone: true,
    imports: [CommonModule, ButtonComponent, BadgeComponent, FormsModule],
    templateUrl: './my-schedule.component.html',
})
export class MyScheduleComponent implements OnInit {
    loading = true;
    errorMessage: string | null = null;

    list: ScheduledSessionDto[] = [];
    rows: RowVM[] = [];

    // cache treatmentId -> treatment
    private treatmentCache: Record<string, DialysisTreatment> = {};

    constructor(private service: DialysisService, private router: Router) {}
    todayStr = new Date().toISOString().slice(0, 10);

// default range: last 14 days to next 14 days (good for demo)
    fromStr = this.addDaysISO(this.todayStr, -14);
    toStr = this.addDaysISO(this.todayStr, 14);

    private addDaysISO(iso: string, days: number): string {
        const d = new Date(iso);
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }

    isToday(day: string): boolean {
        return day === this.todayStr;
    }

    canStart(r: RowVM): boolean {
        return r.sched.status === 'SCHEDULED' && this.isToday(r.sched.day);
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.errorMessage = null;
        this.rows = [];
        this.list = [];

        this.service.getMySchedule(this.fromStr, this.toStr).subscribe({
            next: async (data) => {
                this.list = data ?? [];
                const uniqueTreatmentIds = Array.from(new Set(this.list.map(s => s.treatmentId).filter(Boolean)));
                await Promise.all(uniqueTreatmentIds.map(id => this.loadTreatmentCached(id)));

                this.rows = this.list.map(s => {
                    const t = this.treatmentCache[s.treatmentId];
                    return {
                        sched: s,
                        patientName: t?.patientName || s.patientId || 'Patient',
                        treatmentStatus: (t as any)?.status || '-',
                        accessType: (t as any)?.vascularAccessType || '-',
                        freqPerWeek: typeof (t as any)?.frequencyPerWeek === 'number' ? (t as any).frequencyPerWeek : null,
                    };
                });

                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err?.error?.messages?.join(', ') || err?.error?.message || 'Failed to load schedule.';
            },
        });
    }

    private loadTreatmentCached(treatmentId: string): Promise<void> {
        if (!treatmentId) return Promise.resolve();
        if (this.treatmentCache[treatmentId]) return Promise.resolve();

        return new Promise((resolve) => {
            this.service.getTreatmentById(treatmentId).subscribe({
                next: (t) => {
                    this.treatmentCache[treatmentId] = t;
                    resolve();
                },
                error: () => {
                    // keep minimal fallback
                    this.treatmentCache[treatmentId] = null as any;
                    resolve();
                },
            });
        });
    }

    statusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        if (status === 'SCHEDULED') return 'info';
        if (status === 'STARTED') return 'warning';
        if (status === 'COMPLETED') return 'success';
        if (status === 'CANCELLED') return 'error';
        return 'light';
    }

    start(row: RowVM): void {
        // Go to the treatment sessions page and auto-start with shift (optional support in SessionList)
        this.router.navigate(['/dialysis/sessions', row.sched.treatmentId], {
            queryParams: {
                autoStart: '1',
                shift: row.sched.shift,
            },
        });
    }

    view(row: RowVM): void {
        this.router.navigate(['/dialysis/sessions', row.sched.treatmentId]);
    }
}