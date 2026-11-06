import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialysisService } from '../../../../shared/services/dialysis.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';

type DateFilter = 'ALL' | 'TODAY' | '7D' | '30D';

export interface SuspendedTreatmentAuditRow {
    treatmentId: string;
    patientName?: string | null;
    dialysisType?: string | null;
    vascularAccessType?: string | null;
    suspensionReason?: string | null;
    suspendedAt?: string | null;
}

@Component({
    selector: 'app-admin-audit',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonComponent, BadgeComponent],
    templateUrl: './admin-audit.component.html',
})
export class AdminAuditComponent implements OnInit {
    loading = true;
    errorMessage: string | null = null;

    rows: SuspendedTreatmentAuditRow[] = [];

    // filters
    searchText = '';
    dateFilter: DateFilter = '30D';

    // sorting
    sortBy: 'suspendedAt' | 'patientName' | 'dialysisType' | 'vascularAccessType' = 'suspendedAt';
    sortDir: 'asc' | 'desc' = 'desc';

    constructor(private service: DialysisService) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.errorMessage = null;

        this.service.getSuspendedTreatmentsAudit().subscribe({
            next: (data: any[]) => {
                // normalize backend keys (supports both "suspendedReason" and "suspensionReason")
                this.rows = (data ?? []).map((x) => ({
                    treatmentId: x.treatmentId ?? x.id,
                    patientName: x.patientName ?? null,
                    dialysisType: x.dialysisType ?? null,
                    vascularAccessType: x.vascularAccessType ?? null,
                    suspensionReason: x.suspensionReason ?? x.suspendedReason ?? null,
                    suspendedAt: x.suspendedAt ?? null,
                }));
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = err?.error?.messages?.join(', ') || err?.error?.message || 'Failed to load audit logs.';
                this.loading = false;
            },
        });
    }

    get filteredRows(): SuspendedTreatmentAuditRow[] {
        const q = this.searchText.trim().toLowerCase();
        const now = new Date();

        const filtered = (this.rows ?? []).filter((r) => {
            // date filter
            if (this.dateFilter !== 'ALL') {
                const d = r.suspendedAt ? new Date(r.suspendedAt) : null;
                if (!d || isNaN(d.getTime())) return false;

                if (this.dateFilter === 'TODAY') {
                    const sameDay =
                        d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate();
                    if (!sameDay) return false;
                } else if (this.dateFilter === '7D') {
                    const t = new Date(now);
                    t.setDate(t.getDate() - 7);
                    if (d < t) return false;
                } else if (this.dateFilter === '30D') {
                    const t = new Date(now);
                    t.setDate(t.getDate() - 30);
                    if (d < t) return false;
                }
            }

            // search filter
            if (q) {
                const hay = `${r.patientName ?? ''} ${r.dialysisType ?? ''} ${r.vascularAccessType ?? ''} ${
                    r.suspensionReason ?? ''
                } ${r.suspendedAt ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }

            return true;
        });

        // sort
        const dirMul = this.sortDir === 'asc' ? 1 : -1;
        return filtered.slice().sort((a, b) => {
            const va = this.sortValue(a);
            const vb = this.sortValue(b);

            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;

            if (va < vb) return -1 * dirMul;
            if (va > vb) return 1 * dirMul;
            return 0;
        });
    }

    private sortValue(r: SuspendedTreatmentAuditRow): string | number {
        switch (this.sortBy) {
            case 'patientName':
                return (r.patientName ?? '').toLowerCase();
            case 'dialysisType':
                return (r.dialysisType ?? '').toLowerCase();
            case 'vascularAccessType':
                return (r.vascularAccessType ?? '').toLowerCase();
            case 'suspendedAt':
            default:
                return r.suspendedAt ? new Date(r.suspendedAt).getTime() : 0;
        }
    }

    setSort(col: typeof this.sortBy): void {
        if (this.sortBy === col) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            return;
        }
        this.sortBy = col;
        this.sortDir = col === 'suspendedAt' ? 'desc' : 'asc';
    }

    sortIcon(col: typeof this.sortBy): string {
        if (this.sortBy !== col) return '↕';
        return this.sortDir === 'asc' ? '↑' : '↓';
    }

    reasonColor(reason: string | null | undefined): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        const r = (reason ?? '').toLowerCase();
        if (r.includes('gdpr')) return 'error';
        if (r.includes('infection') || r.includes('bleed') || r.includes('emergency')) return 'error';
        if (r.includes('miss') || r.includes('no show') || r.includes('absent')) return 'warning';
        return 'info';
    }

    clearFilters(): void {
        this.searchText = '';
        this.dateFilter = '30D';
        this.sortBy = 'suspendedAt';
        this.sortDir = 'desc';
    }
}
