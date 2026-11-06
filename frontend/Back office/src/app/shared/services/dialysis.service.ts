import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DialysisTreatment, DialysisSession } from '../models/dialysis.model';
import { environment } from '../../../environments/environment';

export interface PatientDto {
    id: string;
    fullName: string;
    email?: string | null;
}
export interface NurseDto {
    id: string;
    fullName: string;
    email?: string | null;
}

export type DialysisType = 'HEMODIALYSIS' | 'PERITONEAL';
export type VascularAccessType = 'AV_FISTULA' | 'GRAFT' | 'CATHETER';
export type DialysisShift = 'MORNING' | 'AFTERNOON';
export type ScheduledStatus = 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export interface ScheduledSessionDto {
    id: string;
    treatmentId: string;
    patientId: string;
    day: string; // YYYY-MM-DD
    shift: DialysisShift;
    nurseId: string;
    status: ScheduledStatus;
    sessionId?: string | null;
    createdAt?: string | null;
    createdBy?: string | null;
}

export interface ConfirmSlotRequest {
    day: string;           // YYYY-MM-DD
    shift: DialysisShift;
    nurseId: string;
}

export interface ConfirmScheduleRequest {
    treatmentId: string;
    slots: ConfirmSlotRequest[];
}
export interface SystemConfigDto {
    id?: number;
    maxConcurrentSessionsPerShift: number;
    morningStart: string; // "08:00" or "08:00:00"
    morningEnd: string;
    afternoonStart: string;
    afternoonEnd: string;
    ktvAlertThreshold: number;
}

export interface CreateTreatmentRequest {
    patientId: string;
    dialysisType: DialysisType;
    vascularAccessType: VascularAccessType;
    frequencyPerWeek: number;
    prescribedDurationMinutes: number;
    targetDryWeight: number;
    startDate?: string;
}

export interface UpdateTreatmentRequest {
    dialysisType: DialysisType;
    vascularAccessType: VascularAccessType;
    frequencyPerWeek: number;
    prescribedDurationMinutes: number;
    targetDryWeight: number;
}

export interface StartSessionRequest {
    treatmentId: string;
    sessionDay: string; // YYYY-MM-DD
    shift: DialysisShift; // MORNING | AFTERNOON
    weightBefore: number;
    preBloodPressure?: string | null;
    complications?: string | null;
}

export interface UpdateSessionRequest {
    treatmentId: string;
    weightBefore: number;
    preBloodPressure?: string | null;
    complications?: string | null;
}

export interface EndSessionRequest {
    weightAfter: number;
    postDialysisUrea: number;
    preDialysisUrea: number;
}

export interface SuspendedTreatmentAuditDto {
    treatmentId: string;
    patientId?: string;
    doctorId?: string;
    patientName?: string | null;
    dialysisType: string;
    vascularAccessType: string;
    frequencyPerWeek?: number;
    suspensionReason: string;
    suspendedAt: string;
}

// ===== Solver types
export type ConstraintType =
    | 'CAPACITY_PER_SHIFT_DAY'
    | 'PATIENT_NO_DOUBLE_BOOKING_SAME_DAY'
    | 'TREATMENT_ONLY_ONE_OPEN_SESSION'
    | 'TREATMENT_MUST_BE_ACTIVE'
    | 'NURSE_ONLY_ONE_OPEN_SESSION'
    | 'PATIENT_WEEKLY_FREQUENCY'
    | 'SESSION_DAY_NOT_IN_PAST';

export interface SolverViolation {
    type: ConstraintType;
    message: string;
}

export interface SolverProposedSlot {
    day: string; // YYYY-MM-DD
    shift: DialysisShift; // 'MORNING' | 'AFTERNOON'
    nurseId?: string | null;
}

export interface SolverSuggestResponse {
    feasible: boolean;
    plan: SolverProposedSlot[];
    violations: SolverViolation[];
}

// ===== Feature 2 analytics types
export interface DialysisSeriesPoint {
    sessionId: string;
    sessionDate: string; // ISO
    urr: number | null;
    spKtV: number | null;
    eKtV: number | null;
    achievedKtV: number | null;
}

export interface PatientWeeklyAdequacyRow {
    weekStart: string; // YYYY-MM-DD
    weekEnd: string;   // YYYY-MM-DD
    sessionsCount: number;

    avgURR: number | null;
    avgSpKtV: number | null;
    avgEKtV: number | null;

    adequacyPct: number | null;

    ktvThreshold: number | null;
    urrThreshold: number | null;
}
export interface SessionReportDto {
    id: string;
    sessionId: string;
    treatmentId: string;
    patientId: string;
    generatedAt: string;
    generatedBy?: string | null;
    ktvThreshold?: number | null;
    urrThreshold?: number | null;
    reportJson: any;
    reportText: string;
}
@Injectable({ providedIn: 'root' })
export class DialysisService {
    private baseUrl = `${environment.apiUrl}/dialysis/api`;

    constructor(private http: HttpClient) {}

    // ===============================
    // TREATMENTS
    // ===============================
    getTreatments(): Observable<DialysisTreatment[]> {
        return this.http.get<DialysisTreatment[]>(`${this.baseUrl}/treatments`);
    }

    getMyTreatments(): Observable<DialysisTreatment[]> {
        return this.http.get<DialysisTreatment[]>(`${this.baseUrl}/treatments/my`);
    }

    getTreatmentById(id: string): Observable<DialysisTreatment> {
        return this.http.get<DialysisTreatment>(`${this.baseUrl}/treatments/${id}`);
    }

    addTreatment(dto: CreateTreatmentRequest): Observable<DialysisTreatment> {
        return this.http.post<DialysisTreatment>(`${this.baseUrl}/treatments`, dto);
    }

    updateTreatment(id: string, dto: UpdateTreatmentRequest): Observable<DialysisTreatment> {
        return this.http.put<DialysisTreatment>(`${this.baseUrl}/treatments/${id}`, dto);
    }

    deleteTreatment(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/treatments/${id}`);
    }

    suspendTreatment(id: string, reason: string): Observable<DialysisTreatment> {
        return this.http.patch<DialysisTreatment>(`${this.baseUrl}/treatments/${id}/suspend`, { reason });
    }

    archiveTreatment(id: string): Observable<DialysisTreatment> {
        return this.http.patch<DialysisTreatment>(`${this.baseUrl}/treatments/${id}/archive`, null);
    }

    getSuspendedTreatmentsAudit(): Observable<SuspendedTreatmentAuditDto[]> {
        return this.http.get<SuspendedTreatmentAuditDto[]>(`${this.baseUrl}/treatments/audit/suspended`);
    }

    // ===============================
    // USERS
    // ===============================
    getPatients(): Observable<PatientDto[]> {
        return this.http.get<PatientDto[]>(`${this.baseUrl}/users/patients`);
    }
    getNurses(): Observable<NurseDto[]> {
        return this.http.get<NurseDto[]>(`${this.baseUrl}/users/nurses`);
    }

    // ===============================
    // SESSIONS
    // ===============================
    getSessionsByTreatment(treatmentId: string): Observable<DialysisSession[]> {
        return this.http.get<DialysisSession[]>(`${this.baseUrl}/sessions/treatment/${treatmentId}`);
    }

    getPatientHistory(patientId: string): Observable<DialysisSession[]> {
        return this.http.get<DialysisSession[]>(`${this.baseUrl}/sessions/patient/${patientId}/history`);
    }

    getAverageKtV(treatmentId: string): Observable<{ averageKtV: number }> {
        return this.http.get<{ averageKtV: number }>(`${this.baseUrl}/sessions/treatment/${treatmentId}/ktv-average`);
    }

    startSession(dto: StartSessionRequest): Observable<DialysisSession> {
        return this.http.post<DialysisSession>(`${this.baseUrl}/sessions`, dto);
    }

    updateSession(sessionId: string, dto: UpdateSessionRequest): Observable<DialysisSession> {
        return this.http.put<DialysisSession>(`${this.baseUrl}/sessions/${sessionId}`, dto);
    }

    endSession(sessionId: string, data: EndSessionRequest): Observable<DialysisSession> {
        return this.http.put<DialysisSession>(`${this.baseUrl}/sessions/${sessionId}/end`, data);
    }

    deleteSession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/sessions/${sessionId}`);
    }

    // ===============================
    // ADMIN CONFIG
    // ===============================
    getSystemConfig(): Observable<SystemConfigDto> {
        return this.http.get<SystemConfigDto>(`${this.baseUrl}/admin/config`);
    }

    updateSystemConfig(dto: SystemConfigDto): Observable<SystemConfigDto> {
        return this.http.put<SystemConfigDto>(`${this.baseUrl}/admin/config`, dto);
    }

    // ===============================
    // SOLVER (Feature 1)
    suggestSchedule(params: {
        treatmentId: string;
        from: string; // YYYY-MM-DD
        to: string;   // YYYY-MM-DD
        count: number;
        nurseIds?: string[];
    }): Observable<SolverSuggestResponse> {

        const { treatmentId, from, to, count, nurseIds } = params;

        const httpParams: any = {
            treatmentId,
            from,
            to,
            count: String(count),
        };

        if (nurseIds?.length) {
            httpParams.nurseIds = nurseIds; // repeated query params automatically
        }

        return this.http.get<SolverSuggestResponse>(
            `${this.baseUrl}/sessions/solver/suggest`,
            { params: httpParams }
        );
    }
    // ===============================
// SCHEDULING (Feature 1.5)
// ===============================
    getMyTodaySchedule(): Observable<ScheduledSessionDto[]> {
        return this.http.get<ScheduledSessionDto[]>(`${this.baseUrl}/schedule/my-today`);
    }

    confirmSchedule(dto: ConfirmScheduleRequest): Observable<ScheduledSessionDto[]> {
        return this.http.post<ScheduledSessionDto[]>(`${this.baseUrl}/schedule/confirm`, dto);
    }

// Optional: doctor view - schedules by treatment (only if you implement backend endpoint)
    getScheduledByTreatment(treatmentId: string): Observable<ScheduledSessionDto[]> {
        return this.http.get<ScheduledSessionDto[]>(`${this.baseUrl}/schedule/treatment/${treatmentId}`);
    }

    // ===============================
    // ANALYTICS (Feature 2)
    // ===============================
    getTreatmentSeries(treatmentId: string, limit = 20): Observable<DialysisSeriesPoint[]> {
        return this.http.get<DialysisSeriesPoint[]>(`${this.baseUrl}/analytics/treatment/${treatmentId}/series`, {
            params: { limit: String(limit) },
        });
    }

    getPatientWeeklyAdequacy(patientId: string, weeks = 8): Observable<PatientWeeklyAdequacyRow[]> {
        return this.http.get<PatientWeeklyAdequacyRow[]>(`${this.baseUrl}/analytics/patient/${patientId}/weekly`, {
            params: { weeks: String(weeks) },
        });
    }
    getMySchedule(from: string, to: string): Observable<ScheduledSessionDto[]> {
        return this.http.get<ScheduledSessionDto[]>(`${this.baseUrl}/schedule/my`, {
            params: { from, to },
        });
    }
    getSessionReport(sessionId: string) {
        return this.http.get<SessionReportDto>(`${this.baseUrl}/reports/session/${sessionId}`);
    }
    downloadReportPdf(sessionId: string) {
        return this.http.get(`${this.baseUrl}/reports/session/${sessionId}/pdf`, {
            responseType: 'blob'
        });
    }
    // ===============================
// NOTIFICATIONS
// ===============================
    getMyNotifications() {
        return this.http.get<any[]>(`${this.baseUrl}/notifications/my`);
    }

    getMyUnreadNotificationCount() {
        return this.http.get<{ count: number }>(`${this.baseUrl}/notifications/my/unread-count`);
    }

    markNotificationRead(id: string) {
        return this.http.post<void>(`${this.baseUrl}/notifications/${id}/read`, {});
    }

// ===== Nurse assignment actions (backoffice nurse)
    getMyPendingAssignments() {
        return this.http.get<ScheduledSessionDto[]>(`${this.baseUrl}/schedule/my/pending`);
    }

    acceptAssignment(scheduledSessionId: string) {
        return this.http.post(`${this.baseUrl}/schedule/${scheduledSessionId}/accept`, {});
    }

    rejectAssignment(scheduledSessionId: string, reason: string) {
        return this.http.post(`${this.baseUrl}/schedule/${scheduledSessionId}/reject`, { reason });
    }
}