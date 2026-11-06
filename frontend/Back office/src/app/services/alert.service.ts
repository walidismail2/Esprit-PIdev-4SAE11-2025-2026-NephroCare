import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Alert {
  id: string;
  message: string;
  severity: string;
  handled: boolean;
  handledBy?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {

  private api = `${environment.apiUrl}/api/alerts`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Alert[]>(this.api);
  }

  getActive() {
    return this.http.get<Alert[]>(`${this.api}/active`);
  }

  getCritical() {
    return this.http.get<Alert[]>(`${this.api}/critical`);
  }

  getRecentCritical() {
    return this.http.get<Alert[]>(`${this.api}/dashboard/recent-critical`);
  }

  getBySeverity(level: string) {
    return this.http.get<Alert[]>(`${this.api}/severity/${level}`);
  }

  resolve(id: string, handledBy: string) {
    return this.http.patch<Alert>(
      `${this.api}/${id}/resolve?handledBy=${handledBy}`, {}
    );
  }

  fromDiagnostic(data: any) {
    return this.http.post<Alert>(`${this.api}/from-diagnostic`, data);
  }

  getCriticalByPatient(matricule: string) {
    return this.http.get<Alert[]>(`${this.api}/patient/${matricule}/critical`);
  }

  getStats(matricule: string) {
    return this.http.get<any>(`${this.api}/patient/${matricule}/stats`);
  }
}