import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TreatmentStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type DialysisTreatmentDto = {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  dialysisType: 'HEMODIALYSIS' | 'PERITONEAL';
  vascularAccessType: 'AV_FISTULA' | 'GRAFT' | 'CATHETER';
  frequencyPerWeek: number;
  prescribedDurationMinutes: number;
  targetDryWeight: number;
  status: TreatmentStatus;
  startDate: string; // yyyy-MM-dd
};

export type DialysisSessionDto = {
  id: string;
  treatmentId: string;
  nurseId: string;
  sessionDate: string; // ISO LocalDateTime

  weightBefore: number | null;
  weightAfter: number | null;
  ultrafiltrationVolume: number | null;

  preDialysisUrea: number | null;
  postDialysisUrea: number | null;

  achievedKtV: number | null; // legacy
  urr: number | null;         // %
  spKtV: number | null;
  eKtV: number | null;        // backend uses "eKtV" via @JsonProperty

  preBloodPressure: string | null;
  complications: string | null;
};

@Injectable({ providedIn: 'root' })
export class DialysisFrontService {
  // Replace with environment.apiUrl if you have it.
  // Example: private readonly baseUrl = environment.apiUrl;
  private readonly baseUrl = `${environment.apiUrl}/dialysis/api`;

  constructor(private http: HttpClient) {}

  // PATIENT: all my treatments
  getMyTreatments(): Observable<DialysisTreatmentDto[]> {
    return this.http.get<DialysisTreatmentDto[]>(`${this.baseUrl}/treatments/patient/my`);
  }

  // PATIENT: all my sessions
  getMyHistory(): Observable<DialysisSessionDto[]> {
    return this.http.get<DialysisSessionDto[]>(`${this.baseUrl}/sessions/my-history`);
  }

  /**
   * PATIENT: report for my session
   * Works with:
   * - PDF (Content-Type: application/pdf) -> downloads file
   * - JSON (DTO) -> downloads JSON file
   */
  getMySessionReportRaw(sessionId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/reports/my/session/${sessionId}`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
  getMySessionReportPdf(sessionId: string) {
    return this.http.get(`${this.baseUrl}/reports/my/session/${sessionId}/pdf`, {
      responseType: 'blob'
    });
  }
}
