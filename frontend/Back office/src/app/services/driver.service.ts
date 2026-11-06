import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeliveryResponse, DeliveryStatus } from './delivery.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriverService {

  private readonly BASE = `${environment.apiUrl}/orders/api/deliveries`;


  constructor(private http: HttpClient) {}

  /** Toutes les livraisons assignées à ce livreur */
  getMyDeliveries(driverName: string): Observable<DeliveryResponse[]> {
    const params = new HttpParams().set('driverName', driverName); // ✅ query param, pas de problème d'espaces
    return this.http.get<DeliveryResponse[]>(`${this.BASE}/by-driver`, { params });
  }

  /** Changer le statut d'une livraison */
  updateStatus(id: string, status: DeliveryStatus): Observable<DeliveryResponse> {
    return this.http.put<DeliveryResponse>(
      `${this.BASE}/${id}/status`,
      null,
      { params: { status } }
    );
  }

  /** Récupérer une livraison par ID */
  getById(id: string): Observable<DeliveryResponse> {
    return this.http.get<DeliveryResponse>(`${this.BASE}/${id}`);
  }
}