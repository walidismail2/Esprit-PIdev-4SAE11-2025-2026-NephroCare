import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type DeliveryStatus =
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

export interface DeliveryResponse {
  id: string;
  orderId: string;
  patientId: string;
  trackingNumber: string;
  status: DeliveryStatus;
  driverName: string;
  deliveryAddress: string;
  scheduledAt: string;
  deliveredAt?: string;
  attempts: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly API = `${environment.apiUrl}/orders/api/deliveries`;

  constructor(private http: HttpClient) {}

  getByPatient(patientId: string): Observable<DeliveryResponse[]> {
    return this.http.get<DeliveryResponse[]>(`${this.API}/patient/${patientId}`);
  }

  getByOrder(orderId: string): Observable<DeliveryResponse> {
    return this.http.get<DeliveryResponse>(`${this.API}/order/${orderId}`);
  }

  getById(id: string): Observable<DeliveryResponse> {
    return this.http.get<DeliveryResponse>(`${this.API}/${id}`);
  }
}