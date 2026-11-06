import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TestType = 'CREATININE' | 'POTASSIUM' | 'UREA' | 'GFR' | 'PROTEINURIA';

export interface AlertCreateDTO {
  message: string;
  value: number;
  type: TestType;
  patientMatricule: string;
  severity: string;
}

export interface AlertUpdateDTO {
  message: string;
  value: number;
  kidneyFunctionStage?: string;
}

export interface Alert {
  id: string;
  message: string;
  value: number;
  type: TestType | string;
  severity: Severity | string;
  resolved: boolean;
  patientMatricule: string;
  patientId?: string; // KEEP FOR UI
  orderId?: string;
  createdBy?: string;
  handledBy?: string;
  createdAt?: string;
  resolvedAt?: string;
  ageGroup?: string;
  kidneyFunctionStage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private readonly API = `${environment.apiUrl}/api/alerts`; // Uses Angular proxy proxy.conf.jsonport

  constructor(private http: HttpClient) { }

  // ───────────────── CRUD ─────────────────
  getAll(): Observable<Alert[]> { return this.http.get<Alert[]>(this.API); }
  getById(id: string): Observable<Alert> { return this.http.get<Alert>(`${this.API}/${id}`); }
  create(dto: AlertCreateDTO): Observable<Alert> { return this.http.post<Alert>(this.API, dto); }
  update(id: string, dto: AlertUpdateDTO): Observable<Alert> { return this.http.put<Alert>(`${this.API}/${id}`, dto); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.API}/${id}`); }

  // ───────────────── ALERT STATUS ─────────────────
  resolve(id: string, handledBy: string): Observable<Alert> {
    const params = new HttpParams().set('handledBy', handledBy);
    return this.http.patch<Alert>(`${this.API}/${id}/resolve`, {}, { params });
  }

  // ───────────────── FILTERS ─────────────────
  getActive(): Observable<Alert[]> { return this.http.get<Alert[]>(`${this.API}/active`); }
  getCritical(): Observable<Alert[]> { return this.http.get<Alert[]>(`${this.API}/critical`); }
  getBySeverity(level: string): Observable<Alert[]> { return this.http.get<Alert[]>(`${this.API}/severity/${level}`); }

  // ───────────────── DASHBOARD ─────────────────
  getRecentCritical(): Observable<Alert[]> { return this.http.get<Alert[]>(`${this.API}/dashboard/recent-critical`); }

  // ───────────────── PATIENT ─────────────────
  getCriticalForPatient(patientMatricule: string): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API}/patient/${patientMatricule}/critical`);
  }
  getPatientStats(patientMatricule: string): Observable<any> {
    return this.http.get<any>(`${this.API}/patient/${patientMatricule}/stats`);
  }
}