export type DialysisType = 'HEMODIALYSIS' | 'PERITONEAL';
export type VascularAccessType = 'AV_FISTULA' | 'GRAFT' | 'CATHETER';
export type TreatmentStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface DialysisTreatment {
    id: string;

    patientId: string;
    doctorId: string;

    patientName?: string;
    doctorName?: string;

    dialysisType: DialysisType;
    vascularAccessType: VascularAccessType;

    frequencyPerWeek: number;
    prescribedDurationMinutes: number;

    targetDryWeight: number;
    status: TreatmentStatus;

    startDate: string;
}

export interface DialysisSession {
    id: string;
    treatmentId: string;
    nurseId: string;

    sessionDate?: string;

    weightBefore: number;
    weightAfter?: number | null;
    ultrafiltrationVolume?: number | null;

    preDialysisUrea?: number | null;
    postDialysisUrea?: number | null;

    // legacy (keep)
    achievedKtV?: number | null;

    // Feature 2
    urr?: number | null;    // %
    spKtV?: number | null;  // Daugirdas spKt/V
    eKtV?: number | null;   // equilibrated Kt/V estimate

    preBloodPressure?: string | null;
    complications?: string | null;
}