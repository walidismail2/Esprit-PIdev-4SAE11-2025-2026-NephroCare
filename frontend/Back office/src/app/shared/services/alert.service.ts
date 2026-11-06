import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alert } from '../models/alert.model';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AlertService {
    private readonly baseUrl = `${environment.apiUrl}/dialysis/api/alerts`;

    constructor(private http: HttpClient) {}

    getOpenAlerts(): Observable<Alert[]> {
        return this.http.get<Alert[]>(`${this.baseUrl}/open`);
    }

    getAlertsByPatient(patientId: string): Observable<Alert[]> {
        return this.http.get<Alert[]>(`${this.baseUrl}/patient/${patientId}`);
    }

    acknowledge(alertId: string): Observable<Alert> {
        return this.http.patch<Alert>(`${this.baseUrl}/${alertId}/acknowledge`, {});
    }

    resolve(alertId: string): Observable<Alert> {
        return this.http.patch<Alert>(`${this.baseUrl}/${alertId}/resolve`, {});
    }
}