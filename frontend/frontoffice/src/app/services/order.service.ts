import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItemRequest {
  medicationId: string;
  medicationName: string;
  dosage: string;
  route: string;
  quantity: number;
}

export interface OrderItemResponse {
  medicationId: string;
  medicationName: string;
  dosage: string;
  route: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderRequest {
  patientId: string;
  patientName: string;
  deliveryAddress: string;
  phoneNumber: string;
  prescriptionId?: string;
  notes?: string;
  items: OrderItemRequest[];
}

export interface OrderResponse {
  id: string;
  patientId: string;
  patientName: string;
  status: OrderStatus;
  deliveryAddress: string;
  phoneNumber: string;
  prescriptionId?: string;
  notes?: string;
  trackingNumber?: string;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly API = `${environment.apiUrl}/orders/api/orders`;

  constructor(private http: HttpClient) {}

  getByPatient(patientId: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.API}/patient/${patientId}`);
  }

  getById(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.API}/${id}`);
  }

  create(order: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.API, order);
  }

  updateStatus(id: string, status: OrderStatus): Observable<OrderResponse> {
  return this.http.put<OrderResponse>(
    `${this.API}/${id}/status`,
    null,
    { params: { status } }   // ← le backend attend @RequestParam, pas un body
  );
}

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}