import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedicationRoute } from './medication-route.enum';
import { environment } from '../../environments/environment';

export interface Medication {
  id?: string;
  medicationName: string;
  dosage?: string;
  frequency?: number;
  route?: MedicationRoute;
  duration?: number;
  quantity: number;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyService {

  private baseUrl = `${environment.apiUrl}/pharmacy/api/medications`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Medication[]> {
    return this.http.get<Medication[]>(this.baseUrl);
  }

  create(medication: Medication): Observable<Medication> {
    return this.http.post<Medication>(this.baseUrl, medication);
  }

  update(id: string, medication: Medication): Observable<Medication> {
    return this.http.put<Medication>(`${this.baseUrl}/${id}`, medication);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}