import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 
export type DeliveryStatus =
  | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';
 
export interface DeliveryRequest {
  orderId:      string;
  driverName:   string;
  scheduledAt?: string;
  notes?:       string;
}
 
export interface DeliveryResponse {
  id:              string;
  orderId:         string;
  patientName:     string;
  deliveryAddress: string;
  phoneNumber:     string;
  driverName:      string;
  trackingNumber:  string;
  status:          DeliveryStatus;
  attempts:        number;
  scheduledAt:     string;
  deliveredAt?:    string;
  notes?:          string;
  createdAt:       string;
}
 
@Injectable({ providedIn: 'root' })
export class DeliveryService {
 
  private base = `${environment.apiUrl}/orders/api/deliveries`;
 
  constructor(private http: HttpClient) {}
 
  create(req: DeliveryRequest): Observable<DeliveryResponse> {
    return this.http.post<DeliveryResponse>(this.base, req);
  }
 
  getAll(): Observable<DeliveryResponse[]> {
    return this.http.get<DeliveryResponse[]>(this.base);
  }
 
  getById(id: string): Observable<DeliveryResponse> {
    return this.http.get<DeliveryResponse>(`${this.base}/${id}`);
  }
 
  getByOrder(orderId: string): Observable<DeliveryResponse> {
    return this.http.get<DeliveryResponse>(`${this.base}/order/${orderId}`);
  }
 
  getByPatient(patientId: string): Observable<DeliveryResponse[]> {
    return this.http.get<DeliveryResponse[]>(`${this.base}/patient/${patientId}`);
  }
 
  updateStatus(id: string, status: DeliveryStatus): Observable<DeliveryResponse> {
    return this.http.put<DeliveryResponse>(`${this.base}/${id}/status`, null,
      { params: { status } });
  }
}