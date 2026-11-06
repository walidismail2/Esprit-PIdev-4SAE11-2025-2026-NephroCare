import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';
import { forkJoin, of } from 'rxjs';
import { SessionReportModalComponent } from './components/session-report-modal/session-report-modal.component';
import { catchError } from 'rxjs/operators';

import {
    DialysisService,
    DialysisShift,
    DialysisSeriesPoint,
    PatientWeeklyAdequacyRow,
    SolverSuggestResponse,
    NurseDto,
    ConfirmScheduleRequest,
    StartSessionRequest,
    EndSessionRequest,
    UpdateSessionRequest,
} from '../../../shared/services/dialysis.service';

import { DialysisSession, DialysisTreatment } from '../../../shared/models/dialysis.model';

import { SessionHeaderComponent } from './components/session-header/session-header.component';
import { SessionAnalyticsComponent } from './components/session-analytics/session-analytics.component';
import { SessionTableComponent } from './components/session-table/session-table.component';
import { SolverModalComponent } from './components/solver-modal/solver-modal.component';
import { StartSessionModalComponent } from './components/start-session-modal/start-session-modal.component';
import { EndSessionModalComponent } from './components/end-session-modal/end-session-modal.component';
import { EditSessionModalComponent } from './components/edit-session-modal/edit-session-modal.component';

type ViewMode = 'TREATMENT' | 'PATIENT_HISTORY';
type SessionFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';
type DateFilter = 'ALL' | 'TODAY';

@Component({
    selector: 'app-session-list',
    standalone: true,
    templateUrl: './session-list.component.html',
    imports: [
        CommonModule,
        SessionHeaderComponent,
        SessionAnalyticsComponent,
        SessionTableComponent,
        SolverModalComponent,
        StartSessionModalComponent,
        EndSessionModalComponent,
        EditSessionModalComponent,
        SessionReportModalComponent,
    ],
})
export class SessionListComponent implements OnInit {
    // route
    treatmentId = '';

    // roles
    isDoctor = false;
    isNurse = false;
    isAdmin = false;
    currentUserId: string | null = null;

    // meta
    treatment: DialysisTreatment | null = null;
    patientId: string | null = null;
    patientName: string | null = null;

    // data
    sessions: DialysisSession[] = [];
    avgKtV: number | null = null;

    // week
    sessionsThisWeek = 0;
    frequencyPerWeek = 0;

    // ui
    loading = true;
    errorMessage: string | null = null;
    submitting = false;

    viewMode: ViewMode = 'TREATMENT';
    statusFilter: SessionFilter = 'ALL';
    dateFilter: DateFilter = 'ALL';
    searchText = '';

    // ===== Feature 2 analytics state
    analyticsLoading = false;
    series: DialysisSeriesPoint[] = [];
    weekly: PatientWeeklyAdequacyRow[] = [];
    latestMetrics: { urr: number | null; spKtV: number | null; eKtV: number | null } = {
        urr: null,
        spKtV: null,
        eKtV: null,
    };

    // ===== modals open flags
    solverOpen = false;
    startOpen = false;
    endOpen = false;
    editOpen = false;

    // ===== solver state
    todayStr: string = new Date().toISOString().slice(0, 10);
    solverLoading = false;
    solverError: string | null = null;
    confirming = false;
    confirmError: string | null = null;
    confirmSuccess: string | null = null;

    solverFrom: string = this.todayStr;
    solverTo: string = this.addDaysISO(this.todayStr, 14);
    solverCount = 3;
    solverResult: SolverSuggestResponse | null = null;

    nursesLoading = false;
    nursesError: string | null = null;
    nurses: NurseDto[] = [];
    selectedNurseIds: string[] = [];
    nurseNameById: Record<string, string> = {};

    // ===== start modal state
    startShift: DialysisShift = 'MORNING';

    // ===== end/edit targets
    selectedSession: DialysisSession | null = null;
    editSession: DialysisSession | null = null;

    // ===== auto-start gating (FIX)
    private pendingAutoStart = false;
    private metaLoaded = false;
    private sessionsLoaded = false;

    reportOpen = false;
    reportLoading = false;
    reportError: string | null = null;
    reportData: import('../../../shared/services/dialysis.service').SessionReportDto | null = null;

    constructor(
        private service: DialysisService,
        private route: ActivatedRoute,
        private keycloak: KeycloakService,
        private router: Router
    ) {}

    ngOnInit(): void {
        const roles = this.keycloak.getUserRoles(true);
        this.isDoctor = roles.includes('doctor');
        this.isNurse = roles.includes('nurse');
        this.isAdmin = roles.includes('admin');

        const kc = this.keycloak.getKeycloakInstance();
        this.currentUserId = ((kc?.subject as any) ?? (kc?.tokenParsed?.sub as any) ?? null) as string | null;

        this.treatmentId = this.route.snapshot.paramMap.get('id') || '';

        // Read query params for autoStart + shift, but DO NOT open modal until meta + sessions are loaded
        this.route.queryParamMap.subscribe((q) => {
            const auto = q.get('autoStart') === '1';
            const shift = q.get('shift') as DialysisShift | null;

            if (shift === 'MORNING' || shift === 'AFTERNOON') {
                this.startShift = shift;
            }
            if (auto) this.pendingAutoStart = true;

            this.tryAutoStart();
        });

        this.loadTreatmentMeta();
        this.loadTreatmentSessions();
    }
    openReport(s: DialysisSession): void {
        if (!(this.isDoctor || this.isAdmin)) return;
        this.reportOpen = true;
        this.reportLoading = true;
        this.reportError = null;
        this.reportData = null;

        this.service.getSessionReport(s.id).subscribe({
            next: (r) => {
                this.reportLoading = false;
                this.reportData = r;
            },
            error: (err) => {
                this.reportLoading = false;
                this.reportError = err?.error?.messages?.join(', ') || 'Failed to load report.';
            },
        });
    }

    closeReport(): void {
        this.reportOpen = false;
        this.reportLoading = false;
        this.reportError = null;
        this.reportData = null;
    }

    // ===============================
    // AUTO-START (FIX)
    // ===============================
    private tryAutoStart(): void {
        if (!this.pendingAutoStart) return;
        if (!this.metaLoaded || !this.sessionsLoaded) return;

        this.pendingAutoStart = false;

        if (this.canStartSession()) {
            this.openStartModal();
        } else {
            this.errorMessage = 'Cannot start session (treatment state / open session / weekly frequency).';
        }
    }

    // ===============================
    // LOADERS
    // ===============================
    loadTreatmentMeta(): void {
        this.service.getTreatmentById(this.treatmentId).subscribe({
            next: (t) => {
                this.treatment = t;
                this.patientId = (t as any)?.patientId ?? null;
                this.patientName = (t as any)?.patientName ?? null;
                this.frequencyPerWeek = Number((t as any)?.frequencyPerWeek ?? 0);

                this.metaLoaded = true;
                this.tryAutoStart();
            },
            error: () => {
                this.metaLoaded = true;
                this.tryAutoStart();
            },
        });
    }

    private resetFilters(): void {
        this.statusFilter = 'ALL';
        this.dateFilter = 'ALL';
        this.searchText = '';
    }

    loadTreatmentSessions(): void {
        this.viewMode = 'TREATMENT';
        this.resetFilters();
        this.loading = true;
        this.errorMessage = null;

        this.sessionsLoaded = false;

        this.service.getSessionsByTreatment(this.treatmentId).subscribe({
            next: (data) => {
                this.sessions = data ?? [];
                this.loading = false;

                this.recomputeWeekStats();
                this.loadAverageKtV();
                this.computeLatestFromSessions();

                // Analytics: only after at least 1 completed session
                if (this.hasCompletedSessions && this.patientId) {
                    this.loadAnalytics();
                } else {
                    this.series = [];
                    this.weekly = [];
                    this.analyticsLoading = false;
                }

                this.sessionsLoaded = true;
                this.tryAutoStart();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = err?.error?.messages?.join(', ') || 'Failed to load sessions.';
                this.loading = false;

                this.sessionsLoaded = true;
                this.tryAutoStart();
            },
        });
    }

    loadPatientHistory(): void {
        if (!this.patientId) {
            this.errorMessage = 'Missing patientId for history.';
            return;
        }

        this.viewMode = 'PATIENT_HISTORY';
        this.resetFilters();
        this.loading = true;
        this.errorMessage = null;
        this.avgKtV = null;

        this.service.getPatientHistory(this.patientId).subscribe({
            next: (data) => {
                this.sessions = data ?? [];
                this.loading = false;
                this.recomputeWeekStats();
                this.computeLatestFromSessions();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = err?.error?.messages?.join(', ') || 'Failed to load patient history.';
                this.loading = false;
            },
        });
    }

    private loadAverageKtV(): void {
        this.avgKtV = null;
        this.service.getAverageKtV(this.treatmentId).subscribe({
            next: (res) => (this.avgKtV = typeof res?.averageKtV === 'number' ? res.averageKtV : 0),
            error: () => (this.avgKtV = null),
        });
    }

    // ===============================
    // FEATURE 2: ANALYTICS
    // ===============================
    loadAnalytics(): void {
        if (!this.patientId) return;
        if (!this.hasCompletedSessions) return;

        this.analyticsLoading = true;

        forkJoin({
            series: this.service
                .getTreatmentSeries(this.treatmentId, 20)
                .pipe(catchError(() => of([] as DialysisSeriesPoint[]))),
            weekly: this.service
                .getPatientWeeklyAdequacy(this.patientId, 8)
                .pipe(catchError(() => of([] as PatientWeeklyAdequacyRow[]))),
        }).subscribe({
            next: ({ series, weekly }) => {
                this.series = series ?? [];
                this.weekly = weekly ?? [];
                this.analyticsLoading = false;

                if (this.series.length > 0) {
                    const last = this.series
                        .slice()
                        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
                        .at(-1)!;

                    this.latestMetrics = {
                        urr: last.urr ?? null,
                        spKtV: last.spKtV ?? null,
                        eKtV: last.eKtV ?? null,
                    };
                } else {
                    this.computeLatestFromSessions();
                }
            },
            error: () => (this.analyticsLoading = false),
        });
    }

    private computeLatestFromSessions(): void {
        const completed = (this.sessions ?? []).filter(
            (s) => s.weightAfter != null || s.urr != null || s.spKtV != null || s.eKtV != null
        );

        const sorted = completed
            .filter((s) => !!s.sessionDate)
            .slice()
            .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime());

        const last = sorted.length ? sorted[sorted.length - 1] : null;

        this.latestMetrics = {
            urr: last?.urr ?? null,
            spKtV: last?.spKtV ?? null,
            eKtV: last?.eKtV ?? null,
        };
    }

    // ===============================
    // WEEK / FILTERS
    // ===============================
    private recomputeWeekStats(): void {
        const freq = Number((this.treatment as any)?.frequencyPerWeek ?? this.frequencyPerWeek ?? 0);
        this.frequencyPerWeek = Number.isFinite(freq) ? freq : 0;

        const { start, end } = this.getWeekBounds(new Date());
        this.sessionsThisWeek = (this.sessions ?? []).filter((s) => {
            const dt = (s as any).sessionDate;
            if (!dt) return false;
            const d = new Date(dt as any);
            return d >= start && d <= end;
        }).length;
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

    isOpenSession(s: DialysisSession): boolean {
        return (s as any).weightAfter == null;
    }

    hasAnyOpenSession(): boolean {
        return (this.sessions ?? []).some((s) => this.isOpenSession(s));
    }

    frequencyLimitReached(): boolean {
        if (!this.isNurse) return false;
        if (!this.treatment) return false;
        if ((this.treatment as any).status !== 'ACTIVE') return true;
        if (!Number.isFinite(this.frequencyPerWeek) || this.frequencyPerWeek <= 0) return false;
        return this.sessionsThisWeek >= this.frequencyPerWeek;
    }

    private isToday(dateLike: any): boolean {
        if (!dateLike) return false;
        const d = new Date(dateLike);
        const now = new Date();
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        );
    }

    get filteredSessions(): DialysisSession[] {
        const base = this.sessions ?? [];
        const q = this.searchText.trim().toLowerCase();

        return base.filter((s) => {
            const open = this.isOpenSession(s);
            if (this.statusFilter === 'IN_PROGRESS' && !open) return false;
            if (this.statusFilter === 'COMPLETED' && open) return false;

            if (this.dateFilter === 'TODAY' && !this.isToday((s as any).sessionDate)) return false;

            if (q) {
                const hay =
                    `${(s as any).preBloodPressure ?? ''} ${(s as any).complications ?? ''} ${(s as any).sessionDate ?? ''} ` +
                    `${(s as any).achievedKtV ?? ''} ${(s as any).spKtV ?? ''} ${(s as any).eKtV ?? ''} ${(s as any).urr ?? ''} ` +
                    `${(s as any).weightBefore ?? ''} ${(s as any).weightAfter ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }

            return true;
        });
    }

    // ===============================
    // PERMISSIONS
    // ===============================
    canSeeActionsColumn(): boolean {
        return(this.viewMode === 'TREATMENT') && (this.isNurse || this.isAdmin || this.isDoctor);
    }

    canStartSession(): boolean {
        if (!this.isNurse) return false;
        if (this.viewMode !== 'TREATMENT') return false;
        if (!this.treatment) return false;

        if ((this.treatment as any).status !== 'ACTIVE') return false;
        if (this.hasAnyOpenSession()) return false;
        if (this.frequencyLimitReached()) return false;

        return true;
    }

    canEditSession(s: DialysisSession): boolean {
        if (!this.isNurse) return false;
        if (this.viewMode !== 'TREATMENT') return false;
        if (!this.isOpenSession(s)) return false;
        if (!this.currentUserId) return false;

        return (
            String((s as any).nurseId ?? '').toLowerCase() === String(this.currentUserId).toLowerCase()
        );
    }

    // ===============================
    // UI labels
    // ===============================
    sessionStatusLabel(s: DialysisSession): string {
        return this.isOpenSession(s) ? 'IN PROGRESS' : 'COMPLETED';
    }

    sessionStatusColor(
        s: DialysisSession
    ): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        return this.isOpenSession(s) ? 'warning' : 'success';
    }

    adequacyLabel(): string {
        if (this.avgKtV == null) return '-';
        return this.avgKtV >= 1.2 ? 'ADEQUATE' : 'INSUFFICIENT';
    }

    adequacyColor(): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        if (this.avgKtV == null) return 'light';
        return this.avgKtV >= 1.2 ? 'success' : 'warning';
    }

    metricColor(
        v: number | null,
        type: 'URR' | 'KTV'
    ): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'light' | 'dark' {
        if (v == null) return 'light';
        if (type === 'URR') return v >= 65 ? 'success' : 'warning';
        return v >= 1.2 ? 'success' : 'warning';
    }

    // ===============================
    // SOLVER (Feature 1 + confirm)
    // ===============================
    private addDaysISO(iso: string, days: number): string {
        const d = new Date(iso);
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }

    canUseSolver(): boolean {
        return (this.isDoctor || this.isAdmin) && this.viewMode === 'TREATMENT';
    }

    openSolverModal(): void {
        this.solverOpen = true;
        this.solverError = null;
        this.solverResult = null;
        this.confirmError = null;
        this.confirmSuccess = null;

        this.todayStr = new Date().toISOString().slice(0, 10);
        this.solverFrom = this.todayStr;
        this.solverTo = this.addDaysISO(this.todayStr, 14);
        this.solverCount = Math.max(1, Number(this.frequencyPerWeek || 3));

        this.loadNursesIfNeeded();
    }

    closeSolverModal(): void {
        this.solverOpen = false;
    }

    private loadNursesIfNeeded(): void {
        if (this.nursesLoading) return;
        if (this.nurses.length > 0) return;

        this.nursesLoading = true;
        this.nursesError = null;

        this.service.getNurses().subscribe({
            next: (data) => {
                this.nursesLoading = false;
                this.nurses = data ?? [];
                this.nurseNameById = {};
                for (const n of this.nurses)
                    if (n?.id) this.nurseNameById[n.id] = n.fullName || n.email || n.id;
                this.selectedNurseIds = this.nurses.map((n) => n.id).filter(Boolean);
            },
            error: (err) => {
                this.nursesLoading = false;
                this.nursesError = err?.error?.messages?.join(', ') || err?.error?.message || 'Failed to load nurses.';
            },
        });
    }

    nurseLabel(nurseId: string | null | undefined): string {
        if (!nurseId) return '-';
        return this.nurseNameById[nurseId] || nurseId;
    }

    runSolver(): void {
        this.solverError = null;
        this.solverResult = null;
        this.confirmError = null;
        this.confirmSuccess = null;

        if (!this.treatmentId) return void (this.solverError = 'Missing treatmentId.');
        if (!this.solverFrom || !this.solverTo) return void (this.solverError = 'From/To are required.');
        if (this.solverTo < this.solverFrom) return void (this.solverError = '"To" must be after "From".');
        if (!this.selectedNurseIds.length) return void (this.solverError = 'Select at least one nurse.');

        this.solverLoading = true;
        this.service
            .suggestSchedule({
                treatmentId: this.treatmentId,
                from: this.solverFrom,
                to: this.solverTo,
                count: Number(this.solverCount),
                nurseIds: this.selectedNurseIds,
            })
            .subscribe({
                next: (res) => {
                    this.solverLoading = false;
                    this.solverResult = res;
                },
                error: (err) => {
                    this.solverLoading = false;
                    this.solverError = err?.error?.messages?.join(', ') || err?.error?.message || 'Solver call failed.';
                },
            });
    }

    canConfirmPlan(): boolean {
        return !!(this.solverResult?.feasible && this.solverResult.plan?.length);
    }

    confirmPlan(): void {
        this.confirmError = null;
        this.confirmSuccess = null;
        if (!this.canConfirmPlan()) return;

        const dto: ConfirmScheduleRequest = {
            treatmentId: this.treatmentId,
            slots: this.solverResult!.plan.map((p) => ({
                day: p.day,
                shift: p.shift,
                nurseId: String(p.nurseId),
            })),
        };

        if (dto.slots.some((s) => !s.nurseId || s.nurseId === 'null' || s.nurseId === 'undefined')) {
            this.confirmError = 'Solver did not assign nurses. Select nurses and run solver again.';
            return;
        }

        this.confirming = true;
        this.service.confirmSchedule(dto).subscribe({
            next: () => {
                this.confirming = false;
                this.confirmSuccess = 'Schedule confirmed and saved.';
            },
            error: (err) => {
                this.confirming = false;
                this.confirmError = err?.error?.messages?.join(', ') || err?.error?.message || 'Confirm failed.';
            },
        });
    }

    // ===============================
    // START / END / EDIT orchestrations
    // ===============================
    openStartModal(): void {
        this.startOpen = true;
        this.todayStr = new Date().toISOString().slice(0, 10);
        // IMPORTANT: do not reset shift here (it may come from query params)
    }

    closeStartModal(): void {
        this.startOpen = false;
    }

    onStartSubmit(payload: {
        shift: DialysisShift;
        weightBefore: number;
        preBloodPressure?: string | null;
        complications?: string | null;
    }): void {
        const today = new Date().toISOString().slice(0, 10);
        const req: StartSessionRequest = {
            treatmentId: this.treatmentId,
            sessionDay: today,
            shift: payload.shift,
            weightBefore: payload.weightBefore,
            preBloodPressure: payload.preBloodPressure ?? null,
            complications: payload.complications ?? null,
        };

        this.submitting = true;
        this.service.startSession(req).subscribe({
            next: () => {
                this.submitting = false;
                this.closeStartModal();
                this.loadTreatmentSessions();
            },
            error: (err) => {
                this.submitting = false;
                this.errorMessage = err?.error?.messages?.join(', ') || err?.error?.message || 'Failed to start session.';
            },
        });
    }

    openEndModal(s: DialysisSession): void {
        this.selectedSession = s;
        this.endOpen = true;
    }
    closeEndModal(): void {
        this.selectedSession = null;
        this.endOpen = false;
    }

    onEndSubmit(payload: { weightAfter: number; preDialysisUrea: number; postDialysisUrea: number }): void {
        if (!this.selectedSession) return;
        const req: EndSessionRequest = payload;

        this.submitting = true;
        this.service.endSession(this.selectedSession.id, req).subscribe({
            next: () => {
                this.submitting = false;
                this.closeEndModal();
                this.loadTreatmentSessions();
            },
            error: (err) => {
                this.submitting = false;
                this.errorMessage = err?.error?.messages?.join(', ') || 'Failed to end session.';
            },
        });
    }

    openEditModal(s: DialysisSession): void {
        this.editSession = s;
        this.editOpen = true;
    }
    closeEditModal(): void {
        this.editSession = null;
        this.editOpen = false;
    }

    onEditSubmit(payload: { weightBefore: number; preBloodPressure?: string | null; complications?: string | null }): void {
        if (!this.editSession) return;

        const req: UpdateSessionRequest = {
            treatmentId: this.treatmentId,
            weightBefore: payload.weightBefore,
            preBloodPressure: payload.preBloodPressure ?? null,
            complications: payload.complications ?? null,
        };

        this.submitting = true;
        this.service.updateSession(this.editSession.id, req).subscribe({
            next: () => {
                this.submitting = false;
                this.closeEditModal();
                this.loadTreatmentSessions();
            },
            error: (err) => {
                this.submitting = false;
                this.errorMessage = err?.error?.messages?.join(', ') || 'Failed to update session.';
            },
        });
    }

    deleteSession(s: DialysisSession): void {
        if (!this.isAdmin) return;
        if (!confirm('Permanently delete this session? This is irreversible.')) return;

        this.submitting = true;
        this.service.deleteSession(s.id).subscribe({
            next: () => {
                this.submitting = false;
                this.viewMode === 'TREATMENT' ? this.loadTreatmentSessions() : this.loadPatientHistory();
            },
            error: (err) => {
                this.submitting = false;
                this.errorMessage = err?.error?.messages?.join(', ') || 'Failed to delete session.';
            },
        });
    }

    // ===============================
    // Derived flags (optional)
    // ===============================
    get hasAnySessions(): boolean {
        return (this.sessions ?? []).length > 0;
    }

    get hasCompletedSessions(): boolean {
        return (this.sessions ?? []).some(
            (s) => s.weightAfter != null || s.urr != null || s.spKtV != null || s.eKtV != null
        );
    }

    get hasAnyAnalyticsData(): boolean {
        const hasWeekly = (this.weekly ?? []).some((w) => (w.sessionsCount ?? 0) > 0);
        const hasSeries = (this.series ?? []).some((p) => p.urr != null || p.spKtV != null || p.eKtV != null);
        return hasWeekly || hasSeries;
    }

    get showAnalytics(): boolean {
        return this.viewMode === 'TREATMENT' && this.hasCompletedSessions && this.hasAnyAnalyticsData && !this.analyticsLoading;
    }

    goMySchedule(): void {
        this.router.navigate(['/dialysis/my-schedule']);
    }
    // ===============================
// Decision Support (AI-like rules)
// ===============================
    private ktvThreshold = 1.2;
    private urrThreshold = 65;

    isInadequateSession(s: DialysisSession): boolean {
        // Evaluate only completed sessions
        if (s.weightAfter == null) return false;

        const ktvBad = typeof s.spKtV === 'number' && s.spKtV < this.ktvThreshold;
        const urrBad = typeof s.urr === 'number' && s.urr < this.urrThreshold;

        return ktvBad || urrBad;
    }

    riskLevel(): 'NONE' | 'MODERATE' | 'HIGH' {
        const completed = (this.sessions ?? [])
            .filter(s => s.weightAfter != null && !!s.sessionDate)
            .slice()
            .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime());

        if (completed.length < 3) return 'NONE';

        const last3 = completed.slice(-3);
        const badCount = last3.filter(s => this.isInadequateSession(s)).length;

        if (badCount >= 2) return 'HIGH';
        if (badCount === 1) return 'MODERATE';
        return 'NONE';
    }

    riskMessage(): string {
        const level = this.riskLevel();
        if (level === 'NONE') return 'No adequacy alerts based on recent sessions.';
        if (level === 'MODERATE') return 'Moderate alert: 1 of the last 3 sessions is inadequate.';
        return 'High alert: ≥2 of the last 3 sessions are inadequate.';
    }

    recommendations(): string[] {
        return [
            'Verify vascular access function (recirculation / catheter dysfunction).',
            'Consider increasing prescribed duration or frequency if clinically appropriate.',
            'Check blood flow / dialysate flow settings and anticoagulation.',
            'Ensure correct pre/post-urea sampling timing.',
        ];
    }
}