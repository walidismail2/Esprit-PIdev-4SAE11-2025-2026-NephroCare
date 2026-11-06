import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 
export interface OrderStats {
  totalOrders:       number;
  pending:           number;
  confirmed:         number;
  processing:        number;
  shipped:           number;
  delivered:         number;
  cancelled:         number;
  deliveryRate:      number;
  cancellationRate:  number;
  confirmationRate:  number;
  totalRevenue:      number;
  averageOrderValue: number;
}
 
export interface DriverStat {
  driverName:  string;
  deliveries:  number;
  successes:   number;
  successRate: number;
}
 
export interface DeliveryStats {
  totalDeliveries: number;
  scheduled:       number;
  inTransit:       number;
  delivered:       number;
  failed:          number;
  returned:        number;
  successRate:     number;
  failureRate:     number;
  averageAttempts: number;
  topDrivers:      DriverStat[];
}
 
export interface GlobalStats {
  orders:     OrderStats;
  deliveries: DeliveryStats;
}
 
@Injectable({ providedIn: 'root' })
export class StatsService {
 
  private readonly BASE = `${environment.apiUrl}/orders/api/stats`;
 
  constructor(private http: HttpClient) {}
 
  getGlobalStats(): Observable<GlobalStats> {
    return this.http.get<GlobalStats>(`${this.BASE}/global`);
  }
 
  getOrderStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.BASE}/orders`);
  }
 
  getDeliveryStats(): Observable<DeliveryStats> {
    return this.http.get<DeliveryStats>(`${this.BASE}/deliveries`);
  }
}
 