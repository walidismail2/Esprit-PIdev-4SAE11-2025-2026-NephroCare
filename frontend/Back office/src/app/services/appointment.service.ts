import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppointmentService {

  private api = `${environment.apiUrl}/api/appointments`;

  constructor(private http: HttpClient) {}

  create(data: any) {
    return this.http.post(this.api, data);
  }

  getAll() {
  return this.http.get<any[]>(this.api);
}

  getById(id: string) {
    return this.http.get(`${this.api}/${id}`);
  }

  update(id: string, data: any) {
    return this.http.put(`${this.api}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }

  // 🔥 CONFLICT CHECK
  checkConflicts(data: any) {
    return this.http.post(`${this.api}/check-conflicts`, data);
  }

  // 🔥 HISTORY
  getHistory(matricule: string) {
    return this.http.get(`${this.api}/patient/${matricule}/history`);
  }

  // 🔥 STATS
  getStats(medecinId: string, from: string, to: string) {
    return this.http.get(`${this.api}/stats`, {
      params: { medecinId, from, to }
    });
  }

  // 🔥 RESCHEDULE
  reschedule(id: string, data: any) {
    return this.http.patch(`${this.api}/${id}/reschedule`, data);
  }

  confirm(id: string) {
    return this.http.patch(`${this.api}/${id}/confirm`, {});
  }

  cancel(id: string) {
    return this.http.patch(`${this.api}/${id}/cancel`, {});
  }

  linkSession(id: string, sessionId: string) {
    return this.http.patch(`${this.api}/${id}/link-session/${sessionId}`, {});
  }
}