// src/app/services/hospitalization.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HospitalizationRoom {
  id:              number;
  roomNumber:      string;
  type:            string;
  capacity:        number;
  description?:    string;
  available?:      boolean;
  currentOccupancy?: number;
}

/** Shape returned by GET /api/hospitalizations */
export interface Hospitalization {
  id?:               number;
  admissionDate:     string;
  dischargeDate?:    string;
  room:              HospitalizationRoom;          // convenience getter exposed by backend
  admissionReason:   string;
  status:            string;
  userId:            string;
  attendingDoctorId: string;
  vitalSignsRecords?: any[];
}

/** Shape sent by POST / PUT */
export interface HospitalizationPayload {
  id?:               number;
  admissionDate:     string;
  dischargeDate?:    string | null;
  room:              { id: number };  // backend only needs the id
  admissionReason:   string;
  status:            string;
  userId:            string;
  attendingDoctorId: string;
  vitalSignsRecords?: any[];
}

@Injectable({ providedIn: 'root' })
export class HospitalizationService {

  // ── URL fixed: removed the extra /hospitalization prefix ──────────────
  private readonly backendUrl = `${environment.apiUrl}/hospitalization/api/hospitalizations`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hospitalization[]> {
    return this.http.get<Hospitalization[]>(this.backendUrl);
  }

  getById(id: number): Observable<Hospitalization> {
    return this.http.get<Hospitalization>(`${this.backendUrl}/${id}`);
  }

  create(payload: HospitalizationPayload): Observable<Hospitalization> {
    return this.http.post<Hospitalization>(this.backendUrl, payload);
  }

  update(id: number, payload: HospitalizationPayload): Observable<Hospitalization> {
    return this.http.put<Hospitalization>(`${this.backendUrl}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.backendUrl}/${id}`);
  }

  getByStatus(status: string): Observable<Hospitalization[]> {
    return this.http.get<Hospitalization[]>(`${this.backendUrl}/by-status/${status}`);
  }
}