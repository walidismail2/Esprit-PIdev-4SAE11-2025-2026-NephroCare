import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED';
export type AppointmentType = 'CONSULTATION' | 'POST_TRANSPLANT' | 'FOLLOW_UP' | 'BIOPSY' | 'DIAGNOSTIC';

export interface AppointmentRequest {
  patientId: string;
  patientNom: string;
  patientMatricule: string;
  medecinId: string;
  medecinNom: string;
  medecinSpecialite?: string;
  appointmentDate: string;
  durationMinutes: number;
  type: string;
  status?: string;
  notes?: string;
}

export interface RescheduleRequest {
  /** Backend RescheduleRequest uses newDate (LocalDateTime) */
  newDate: string;
  reason?: string;
}

export interface ConflictCheckRequest {
  medecinId: string;
  patientId: string;
  appointmentDate: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
}

export interface ConflictResponse {
  hasConflict: boolean;
  message: string;
  conflicts: Appointment[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientNom?: string;
  patientMatricule?: string;
  medecinId: string;
  medecinNom?: string;
  medecinSpecialite?: string;
  appointmentDate: string;
  previousDate?: string;
  durationMinutes: number;
  type: AppointmentType | string;
  status: AppointmentStatus | string;
  reminderSent?: boolean;
  notes?: string;
  sessionId?: string;
  createdAt?: string;
}

export interface AppointmentHistoryDTO {
  id: string;
  appointmentDate: string;
  type: string;
  status: string;
  medecinNom?: string;
  medecinSpecialite?: string;
  durationMinutes: number;
  notes?: string;
  previousDate?: string;
  sessionId?: string;
}

export interface AppointmentStatsDTO {
  medecinId: string;
  medecinNom: string | null;
  type: string | null;
  total: number;
  noShowCount: number;
  noShowRate: number | null;
  cancelledCount: number;
  cancelRate: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private readonly API = `${environment.apiUrl}/api/appointments`; // Uses Angular proxy proxy.conf.json

  constructor(private http: HttpClient) { }

  // ── F0: CRUD ─────────────────────────────────────────────────
  getAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.API);
  }

  getById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.API}/${id}`);
  }

  create(dto: AppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.API, dto);
  }

  update(id: string, dto: AppointmentRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.API}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  // ── Confirmer / Annuler ───────────────────────────────────────
  confirm(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API}/${id}/confirm`, {});
  }

  cancel(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API}/${id}/cancel`, {});
  }

  // ── F4: Reprogrammation ───────────────────────────────────────
  reschedule(id: string, req: RescheduleRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API}/${id}/reschedule`, req);
  }

  // ── F1: Détection de conflits ─────────────────────────────────
  checkConflicts(req: ConflictCheckRequest): Observable<ConflictResponse> {
    return this.http.post<ConflictResponse>(`${this.API}/check-conflicts`, req);
  }

  // ── F2: Historique patient par matricule ──────────────────────
  getPatientHistory(matricule: string): Observable<AppointmentHistoryDTO[]> {
    return this.http.get<AppointmentHistoryDTO[]>(`${this.API}/patient/${matricule}/history`);
  }

  // ── F3: Statistiques par médecin ──────────────────────────────
  getStats(medecinId: string, from: string, to: string): Observable<AppointmentStatsDTO[]> {
    const params = new HttpParams()
      .set('medecinId', medecinId)
      .set('from', from)
      .set('to', to);
    return this.http.get<AppointmentStatsDTO[]>(`${this.API}/stats`, { params });
  }

  // ── Lier à une session ────────────────────────────────────────
  linkToSession(appointmentId: string, sessionId: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API}/${appointmentId}/link-session/${sessionId}`, {});
  }
}