import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';
import { ScheduledSessionDto } from '../../../shared/services/dialysis.service';

import {
    DialysisService,
    PatientDto,
    CreateTreatmentRequest,
    UpdateTreatmentRequest,
} from '../../../shared/services/dialysis.service';

import { DialysisTreatment, DialysisSession } from '../../../shared/models/dialysis.model';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { AppModalComponent } from '../../../shared/components/ui/app-modal/app-modal.component';

import {extractApiMessages} from "../../../shared/http/api-error.util";


type TreatmentStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
type StatusFilter = 'ALL' | TreatmentStatus;
type Trend = 'UP' | 'DOWN' | 'FLAT' | 'NA';

type TreatmentMetrics = {
    avgKtV: number | null;
    compliancePct: number | null; // 0..100
    sessionsThisWeek: number;
    openSessionExists: boolean;
    lastSessionDateIso: string | null;
    nextSessionDateIso: string | null;
    trend: Trend;
};

@Component({
    selector: 'app-treatment-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonComponent, BadgeComponent, AppModalComponent],
    templateUrl: './treatment-list.component.html',
})
export class TreatmentListComponent implements OnInit {
    treatments: DialysisTreatment[] = [];
    loading = true;

    errorMessage: string | null = null;

    // roles
    isDoctor = false;
    isNurse = false;
    isAdmin = false;

    // Filters
    statusFilter: StatusFilter = 'ACTIVE';
    lowKtVOnly = false;
    searchText = '';

    // Analytics cache keyed by treatmentId
    metrics: Record<string, TreatmentMetrics> = {};
    analyticsLoading = false;

    // Modal (doctor add/edit)
    isModalOpen = false;
    modalMode: 'add' | 'edit' = 'add';
    modalAttempted = false;
    modalError: string | null = null;
    submitting = false;

    todayStr = new Date().toISOString().slice(0, 10);
    formData: Partial<DialysisTreatment> = {};

    // Duplicate check
    conflictActiveTreatment: DialysisTreatment | null = null;
    conflictCheckLoading = false;

    // Patients (doctor only)
    patients: PatientDto[] = [];
    filteredPatients: PatientDto[] = [];
    searchPatientText = '';
    selectedPatientName = '';
    patientsLoading = false;
    patientsLoadedOnce = false;

    // optional: all treatments for duplicate-check across doctors/admin
    allTreatmentsForDupCheck: DialysisTreatment[] | null = null;
    allTreatmentsForDupLoaded = false;

    constructor(
        private service: DialysisService,
        private router: Router,
        private keycloak: KeycloakService
    ) {}

    ngOnInit(): void {
        const roles = this.keycloak.getUserRoles(true);
        this.isDoctor = roles.includes('doctor');
        this.isNurse = roles.includes('nurse');
        this.isAdmin = roles.includes('admin');

        if (this.isAdmin && !this.isDoctor && !this.isNurse) this.statusFilter = 'ALL';
        else this.statusFilter = 'ACTIVE';

        this.loadTreatments();
    }

    // ===============================
    // LOADERS
    // ===============================
    loadTreatments(): void {
        this.loading = true;
        this.errorMessage = null;

        // Doctor (not admin) -> only his treatments
        if (this.isDoctor && !this.isAdmin) {
            this.service.getMyTreatments().pipe(
                catchError((err) => {
                    console.error(err);
                    this.errorMessage = 'Failed to load treatments.';
                    return of([] as DialysisTreatment[]);
                })
            ).subscribe((data) => {
                this.treatments = data ?? [];
                this.loading = false;
                this.loadAnalyticsForTreatments(this.treatments);
            });
            return;
        }

        // Nurse -> only treatments she is scheduled on (range)
        if (this.isNurse && !this.isAdmin) {
            const today = this.todayStr;
            const from = this.addDaysISO(today, -14);
            const to = this.addDaysISO(today, 14);

            this.service.getMySchedule(from, to).pipe(
                switchMap((sched: ScheduledSessionDto[]) => {
                    const ids = Array.from(new Set((sched ?? []).map(s => s.treatmentId).filter(Boolean)));
                    if (!ids.length) return of([] as DialysisTreatment[]);
                    return forkJoin(ids.map(id => this.service.getTreatmentById(id).pipe(catchError(() => of(null as any)))));
                }),
                map((arr: any[]) => (arr ?? []).filter(Boolean) as DialysisTreatment[]),
                catchError((err) => {
                    console.error(err);
                    this.errorMessage = 'Failed to load nurse treatments.';
                    return of([] as DialysisTreatment[]);
                })
            ).subscribe((data) => {
                this.treatments = data ?? [];
                this.loading = false;
                this.loadAnalyticsForTreatments(this.treatments);
            });

            return;
        }

        // Admin -> all treatments
        this.service.getTreatments().pipe(
            catchError((err) => {
                console.error(err);
                this.errorMessage = 'Failed to load treatments.';
                return of([] as DialysisTreatment[]);
            })
        ).subscribe((data) => {
            this.treatments = data ?? [];
            this.loading = false;
            this.loadAnalyticsForTreatments(this.treatments);
        });
    }

// helper (add it to the component)
    private addDaysISO(iso: string, days: number): string {
        const d = new Date(iso);
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }

    goToAuditLogs(): void {
        if (!this.isAdmin) return;
        this.router.navigate(['/dialysis/admin/audit']);
    }

    private loadAnalyticsForTreatments(list: DialysisTreatment[]): void {
        if (!list || list.length === 0) {
            this.metrics = {};
            this.analyticsLoading = false;
            return;
        }

        this.analyticsLoading = true;
        const week = this.getWeekBounds(new Date());

        const jobs = list.map((t) => {
            const id = t.id;

            const sessions$ = this.service.getSessionsByTreatment(id).pipe(
                catchError(() => of([] as DialysisSession[]))
            );

            const avg$ = this.service.getAverageKtV(id).pipe(
                map((res: any) => (typeof res?.averageKtV === 'number' ? res.averageKtV : null)),
                catchError(() => of(null))
            );

            return forkJoin({ sessions: sessions$, avgKtV: avg$ }).pipe(
                map(({ sessions, avgKtV }) => {
                    const sessionsSorted = (sessions ?? [])
                        .filter((s) => !!s.sessionDate)
                        .slice()
                        .sort(
                            (a, b) =>
                                new Date(b.sessionDate as any).getTime() -
                                new Date(a.sessionDate as any).getTime()
                        );

                    const sessionsThisWeek = sessionsSorted.filter((s) => {
                        const d = s.sessionDate ? new Date(s.sessionDate) : null;
                        return d ? d >= week.start && d <= week.end : false;
                    }).length;

                    const openSessionExists = (sessions ?? []).some((s) => s.weightAfter == null);

                    const lastSessionDateIso =
                        sessionsSorted.length > 0
                            ? new Date(sessionsSorted[0].sessionDate as any).toISOString()
                            : null;

                    const nextSessionDateIso = this.computeNextSessionDateIso(t, lastSessionDateIso);
                    const compliancePct = this.computeCompliancePct(
                        sessionsThisWeek,
                        Number(t.frequencyPerWeek ?? 0)
                    );
                    const trend = this.computeTrendFromSessions(sessionsSorted);

                    const m: TreatmentMetrics = {
                        avgKtV,
                        compliancePct,
                        sessionsThisWeek,
                        openSessionExists,
                        lastSessionDateIso,
                        nextSessionDateIso,
                        trend,
                    };

                    return { id, metrics: m };
                })
            );
        });

        forkJoin(jobs)
            .pipe(
                catchError((err) => {
                    console.error(err);
                    return of([] as Array<{ id: string; metrics: TreatmentMetrics }>);
                })
            )
            .subscribe((rows) => {
                const nextMap: Record<string, TreatmentMetrics> = {};
                for (const r of rows) nextMap[r.id] = r.metrics;
                this.metrics = nextMap;
                this.analyticsLoading = false;
            });
    }

    // ===============================
    // FILTERED VIEW
    // ===============================
    get filteredTreatments(): DialysisTreatment[] {
        const base = this.treatments ?? [];
        const q = this.searchText.trim().toLowerCase();

        return base.filter((t) => {
            if (this.statusFilter !== 'ALL' && t.status !== this.statusFilter) return false;

            if (this.lowKtVOnly) {
                const avg = this.metrics[t.id]?.avgKtV;
                if (!(typeof avg === 'number' && avg < 1.2)) return false;
            }

            if (q) {
                const hay = `${t.patientName ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }

            return true;
        });
    }

    // ===============================
    // UI HELPERS
    // ===============================
    getBadgeColor(status: string): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark' {
        switch (status) {
            case 'ACTIVE': return 'success';
            case 'SUSPENDED': return 'warning';
            case 'ARCHIVED': return 'error';
            default: return 'primary';
        }
    }

    complianceColor(t: DialysisTreatment): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        const pct = this.metrics[t.id]?.compliancePct;
        if (pct == null) return 'light';
        if (pct >= 100) return 'success';
        if (pct >= 70) return 'warning';
        return 'error';
    }

    complianceLabel(t: DialysisTreatment): string {
        const m = this.metrics[t.id];
        if (!m || m.compliancePct == null) return '-';
        return `${Math.round(m.compliancePct)}% (${m.sessionsThisWeek}/${t.frequencyPerWeek})`;
    }

    ktvColor(t: DialysisTreatment): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        const avg = this.metrics[t.id]?.avgKtV;
        if (avg == null) return 'light';
        return avg >= 1.2 ? 'success' : 'error';
    }

    trendIcon(t: DialysisTreatment): string {
        const tr = this.metrics[t.id]?.trend ?? 'NA';
        if (tr === 'UP') return 'UP';
        if (tr === 'DOWN') return 'DOWN';
        if (tr === 'FLAT') return 'FLAT';
        return '-';
    }

    trendColor(t: DialysisTreatment): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        const tr = this.metrics[t.id]?.trend ?? 'NA';
        if (tr === 'UP') return 'success';
        if (tr === 'DOWN') return 'warning';
        if (tr === 'FLAT') return 'info';
        return 'light';
    }

    nextSessionDateIso(t: DialysisTreatment): string | null {
        return this.metrics[t.id]?.nextSessionDateIso ?? null;
    }

    // Doctor permissions
    canSuspend(status: TreatmentStatus): boolean { return status === 'ACTIVE'; }
    canArchive(status: TreatmentStatus): boolean { return status !== 'ARCHIVED'; }
    canEdit(status: TreatmentStatus): boolean { return status === 'ACTIVE' || status === 'SUSPENDED'; }

    // ===============================
    // NAVIGATION
    // ===============================
    viewSessions(treatmentId: string): void {
        this.router.navigate(['/dialysis/sessions', treatmentId]);
    }

    // ===============================
    // NURSE: Start enablement
    // ===============================
    canStartSession(t: DialysisTreatment): boolean {
        if (!this.isNurse) return false;
        if (t.status !== 'ACTIVE') return false;

        const m = this.metrics[t.id];
        if (!m) return true; // analytics not loaded yet
        if (m.openSessionExists) return false;

        const freq = Number(t.frequencyPerWeek ?? 0);
        if (Number.isFinite(freq) && freq > 0 && m.sessionsThisWeek >= freq) return false;

        return true;
    }

    frequencyBadgeText(t: DialysisTreatment): string {
        const m = this.metrics[t.id];
        if (!m) return '-';
        return `${m.sessionsThisWeek}/${t.frequencyPerWeek}`;
    }

    frequencyBadgeColor(t: DialysisTreatment): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        const m = this.metrics[t.id];
        if (!m) return 'light';
        const freq = Number(t.frequencyPerWeek ?? 0);
        return (Number.isFinite(freq) && freq > 0 && m.sessionsThisWeek >= freq) ? 'info' : 'success';
    }

    // ===============================
    // DOCTOR: PATIENT SEARCH + DUP CHECK
    // ===============================
    loadPatientsIfNeeded(): void {
        if (!this.isDoctor) return;
        if (this.patientsLoadedOnce) return;

        this.patientsLoading = true;
        this.modalError = null;

        this.service.getPatients().pipe(
            catchError((err) => {
                console.error(err);
                this.modalError = 'Failed to load patients.';
                return of([] as PatientDto[]);
            })
        ).subscribe((data) => {
            this.patients = data ?? [];
            this.patientsLoading = false;
            this.patientsLoadedOnce = true;
        });
    }

    onPatientSearchInput(): void {
        // typing breaks selection
        this.formData.patientId = undefined;
        this.selectedPatientName = '';
        this.conflictActiveTreatment = null;
        this.filterPatients();
    }

    filterPatients(): void {
        const q = this.searchPatientText.trim().toLowerCase();
        if (!q) {
            this.filteredPatients = [];
            return;
        }

        this.filteredPatients = (this.patients ?? [])
            .filter((p) =>
                (p.fullName ?? '').toLowerCase().includes(q) ||
                (p.email ?? '').toLowerCase().includes(q)
            )
            .slice(0, 20);
    }

    selectPatient(patient: PatientDto): void {
        this.formData.patientId = patient.id;
        this.selectedPatientName = patient.fullName || 'Patient';
        this.searchPatientText = this.selectedPatientName;
        this.filteredPatients = [];
        this.checkDuplicateActiveTreatment(patient.id);
    }

    private ensureAllTreatmentsForDupCheckLoaded(): void {
        if (this.allTreatmentsForDupLoaded) return;
        this.allTreatmentsForDupLoaded = true;

        this.service.getTreatments().pipe(catchError(() => of(null))).subscribe((data) => {
            this.allTreatmentsForDupCheck = Array.isArray(data) ? data : null;
        });
    }

    private checkDuplicateActiveTreatment(patientId: string): void {
        if (!this.isDoctor) return;

        this.conflictActiveTreatment = null;
        this.conflictCheckLoading = true;

        this.ensureAllTreatmentsForDupCheckLoaded();

        const pool = this.allTreatmentsForDupCheck ?? this.treatments ?? [];
        const conflict = pool.find((t) => t.patientId === patientId && t.status === 'ACTIVE');

        this.conflictActiveTreatment = conflict ?? null;
        this.conflictCheckLoading = false;
    }

    archiveConflictingTreatment(): void {
        if (!this.isDoctor) return;
        if (!this.conflictActiveTreatment) return;

        this.modalError = null;
        this.submitting = true;

        this.service.archiveTreatment(this.conflictActiveTreatment.id).subscribe({
            next: () => {
                this.submitting = false;
                this.conflictActiveTreatment = null;
                this.loadTreatments();
            },
            error: (err) => {
                console.error(err);
                this.submitting = false;
                this.modalError = extractApiMessages(err).join(', ');
            },
        });
    }

    // ===============================
    // MODAL
    // ===============================
    openAddModal(): void {
        if (!this.isDoctor) return;

        this.modalMode = 'add';
        this.modalAttempted = false;
        this.modalError = null;
        this.submitting = false;

        this.loadPatientsIfNeeded();
        this.ensureAllTreatmentsForDupCheckLoaded();

        this.searchPatientText = '';
        this.selectedPatientName = '';
        this.filteredPatients = [];
        this.conflictActiveTreatment = null;

        this.formData = {
            dialysisType: 'HEMODIALYSIS',
            vascularAccessType: 'AV_FISTULA',
            frequencyPerWeek: 3,
            prescribedDurationMinutes: 240,
            targetDryWeight: 70,
            startDate: this.todayStr,
        };

        this.isModalOpen = true;
    }

    openEditModal(t: DialysisTreatment): void {
        if (!this.isDoctor) return;
        if (!this.canEdit(t.status as TreatmentStatus)) return;

        this.modalMode = 'edit';
        this.modalAttempted = false;
        this.modalError = null;
        this.submitting = false;

        this.formData = { ...t };
        this.selectedPatientName = t.patientName || 'Patient';
        this.searchPatientText = this.selectedPatientName;

        this.filteredPatients = [];
        this.conflictActiveTreatment = null;

        this.isModalOpen = true;
    }

    closeModal(): void {
        if (this.submitting) return; // avoid closing while busy
        this.isModalOpen = false;
        this.modalAttempted = false;
        this.modalError = null;
        this.filteredPatients = [];
        this.conflictActiveTreatment = null;
    }

    // ===============================
    // ACTIONS
    // ===============================
    suspendTreatment(t: DialysisTreatment): void {
        if (!this.isDoctor) return;
        if (!this.canSuspend(t.status as TreatmentStatus)) return;

        const reason = prompt('Enter reason for suspension:');
        if (!reason) return;

        this.errorMessage = null;

        this.service.suspendTreatment(t.id, reason).subscribe({
            next: () => this.loadTreatments(),
            error: (err) => {
                console.error(err);
                this.errorMessage = extractApiMessages(err).join(', ');
            },
        });
    }

    archiveTreatment(t: DialysisTreatment): void {
        if (!this.isDoctor) return;
        if (!this.canArchive(t.status as TreatmentStatus)) return;
        if (!confirm('Archive this treatment? This marks it as finished.')) return;

        this.errorMessage = null;

        this.service.archiveTreatment(t.id).subscribe({
            next: () => this.loadTreatments(),
            error: (err) => {
                console.error(err);
                this.errorMessage = extractApiMessages(err).join(', ');
            },
        });
    }

    deleteTreatment(t: DialysisTreatment): void {
        if (!this.isAdmin) return;

        const ok = confirm('Permanently delete this treatment?\n\nThis is irreversible (GDPR cleanup).');
        if (!ok) return;

        this.errorMessage = null;
        this.service.deleteTreatment(t.id).subscribe({
            next: () => this.loadTreatments(),
            error: (err) => {
                console.error(err);
                this.errorMessage = extractApiMessages(err).join(', ');
            },
        });
    }

    // ===============================
    // VALIDATION + SUBMIT
    // ===============================
    isFormInvalid(): boolean {
        const f = this.formData;

        if (this.modalMode === 'add') {
            if (!f.patientId) return true;
            if (this.conflictActiveTreatment) return true;
            if (!f.startDate) return true;
            if (String(f.startDate) < this.todayStr) return true;
        }

        if (!f.dialysisType) return true;
        if (!f.vascularAccessType) return true;

        const freq = Number(f.frequencyPerWeek);
        if (!Number.isFinite(freq) || freq < 1 || freq > 7) return true;

        const dur = Number(f.prescribedDurationMinutes);
        if (!Number.isFinite(dur) || dur < 30 || dur > 600) return true;

        const w = Number(f.targetDryWeight);
        if (!Number.isFinite(w) || w <= 0 || w > 500) return true;

        return false;
    }

    onSubmit(): void {
        if (!this.isDoctor) return;

        this.modalAttempted = true;
        this.modalError = null;

        if (this.isFormInvalid()) {
            if (this.modalMode === 'add' && !this.formData.patientId) {
                this.modalError = 'Select a patient from the list.';
            } else if (this.conflictActiveTreatment) {
                this.modalError = 'Patient already has an ACTIVE treatment. Archive it first.';
            } else {
                this.modalError = 'Please fix the highlighted fields.';
            }
            return;
        }

        this.submitting = true;

        if (this.modalMode === 'add') {
            const payload: CreateTreatmentRequest = {
                patientId: String(this.formData.patientId),
                dialysisType: this.formData.dialysisType as any,
                vascularAccessType: this.formData.vascularAccessType as any,
                frequencyPerWeek: Number(this.formData.frequencyPerWeek),
                prescribedDurationMinutes: Number(this.formData.prescribedDurationMinutes),
                targetDryWeight: Number(this.formData.targetDryWeight),
                startDate: String(this.formData.startDate),
            };

            this.service.addTreatment(payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    this.loadTreatments();
                },
                error: (err) => {
                    console.error(err);
                    this.submitting = false;
                    this.modalError = extractApiMessages(err).join(', ');
                },
            });
            return;
        }

        const id = String(this.formData.id ?? '');
        if (!id) {
            this.submitting = false;
            this.modalError = 'Missing treatment id.';
            return;
        }

        const payload: UpdateTreatmentRequest = {
            dialysisType: this.formData.dialysisType as any,
            vascularAccessType: this.formData.vascularAccessType as any,
            frequencyPerWeek: Number(this.formData.frequencyPerWeek),
            prescribedDurationMinutes: Number(this.formData.prescribedDurationMinutes),
            targetDryWeight: Number(this.formData.targetDryWeight),
        };

        this.service.updateTreatment(id, payload).subscribe({
            next: () => {
                this.submitting = false;
                this.closeModal();
                this.loadTreatments();
            },
            error: (err) => {
                console.error(err);
                this.submitting = false;
                this.modalError = extractApiMessages(err).join(', ');
            },
        });
    }

    isPatientSelectionMissing(): boolean {
        return this.modalMode === 'add' && !this.formData.patientId;
    }

    isStartDateInPast(): boolean {
        if (this.modalMode !== 'add') return false;
        if (!this.formData.startDate) return false;
        return String(this.formData.startDate) < this.todayStr;
    }

    // ===============================
    // CALC HELPERS
    // ===============================
    private computeCompliancePct(doneThisWeek: number, freqPerWeek: number): number {
        const f = Number(freqPerWeek);
        if (!Number.isFinite(f) || f <= 0) return 0;
        const pct = (doneThisWeek / f) * 100;
        return Math.max(0, Math.min(100, pct));
    }

    private computeTrendFromSessions(sessionsSortedDesc: DialysisSession[]): Trend {
        const ktvs = (sessionsSortedDesc ?? [])
            .filter((s) => typeof s.achievedKtV === 'number')
            .slice(0, 3)
            .map((s) => Number(s.achievedKtV));

        if (ktvs.length < 3) return 'NA';

        const [v0, v1, v2] = ktvs;
        if (v0 > v1 && v1 > v2) return 'UP';
        if (v0 < v1 && v1 < v2) return 'DOWN';
        return 'FLAT';
    }

    private computeNextSessionDateIso(t: DialysisTreatment, lastSessionDateIso: string | null): string | null {
        const freq = Number(t.frequencyPerWeek);
        if (!Number.isFinite(freq) || freq <= 0) return null;

        const base = lastSessionDateIso
            ? new Date(lastSessionDateIso)
            : t.startDate
                ? new Date(t.startDate)
                : new Date();

        const intervalDays = Math.max(1, Math.round(7 / freq));
        const next = new Date(base);
        next.setDate(next.getDate() + intervalDays);

        return next.toISOString();
    }

    private getWeekBounds(today: Date): { start: Date; end: Date } {
        const d = new Date(today);
        d.setHours(0, 0, 0, 0);

        const day = d.getDay();
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