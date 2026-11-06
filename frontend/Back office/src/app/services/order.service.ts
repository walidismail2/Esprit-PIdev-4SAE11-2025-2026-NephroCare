import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 
export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
 
export interface OrderItemRequest {
  medicationId:   string;
  medicationName: string;
  dosage?:        string;
  route?:         string;
  quantity:       number;
}
 
export interface OrderRequest {
  patientId:       string;
  patientName:     string;
  prescriptionId?: string;
  deliveryAddress: string;
  phoneNumber:     string;
  notes?:          string;
  items:           OrderItemRequest[];
}
 
export interface OrderItemResponse {
  medicationId:   string;
  medicationName: string;
  dosage?:        string;
  route?:         string;
  quantity:       number;
  unitPrice:      number;
  subtotal:       number;
}
 
export interface OrderResponse {
  id:              string;
  patientId:       string;
  patientName:     string;
  prescriptionId?: string;
  status:          OrderStatus;
  deliveryAddress: string;
  phoneNumber:     string;
  notes?:          string;
  totalAmount:     number;
  items:           OrderItemResponse[];
  trackingNumber?: string;
  createdAt:       string;
  updatedAt:       string;
}
 
export interface OrderStats {
  pending:    number;
  confirmed:  number;
  processing: number;
  shipped:    number;
  delivered:  number;
  cancelled:  number;
}
 
@Injectable({ providedIn: 'root' })
export class OrderService {
 
  private base = `${environment.apiUrl}/orders/api/orders`;
 
  constructor(private http: HttpClient) {}
 
  create(req: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.base, req);
  }
 
  getAll(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(this.base);
  }
 
  getById(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.base}/${id}`);
  }
 
  getByPatient(patientId: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.base}/patient/${patientId}`);
  }
 
  updateStatus(id: string, status: OrderStatus): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.base}/${id}/status`, null,
      { params: { status } });
  }
 
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
 
  getStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.base}/stats`);
  }
}