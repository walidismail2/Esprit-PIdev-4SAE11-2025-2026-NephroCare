import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medication } from './pharmacy.service';
import { environment } from '../../environments/environment';

export type PrescriptionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISPENSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Prescription {
  id?: string;
  prescriptionDate?: string;   
  status?: PrescriptionStatus;
  validUntil?: string;         
  instructions?: string;
  consultationId?: string;
  userId?: string;
  prescribedBy?: string;
  medications?: Medication[];
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  private baseUrl = `${environment.apiUrl}/pharmacy/api/pharmacy/prescriptions`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(this.baseUrl);
  }

  getById(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.baseUrl}/${id}`);
  }

  create(prescription: Prescription): Observable<Prescription> {
    return this.http.post<Prescription>(this.baseUrl, prescription);
  }

  updateStatus(id: string, status: PrescriptionStatus): Observable<Prescription> {
    const params = new HttpParams().set('status', status);
    return this.http.put<Prescription>(
      `${this.baseUrl}/${id}/status`,
      null,
      { params }
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}