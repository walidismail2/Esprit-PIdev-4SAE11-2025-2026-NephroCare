import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MovementType   = 'IN' | 'OUT';
export type MovementReason =
  | 'PRESCRIPTION_DISPENSED'
  | 'MANUAL_RESTOCK'
  | 'ADJUSTMENT'
  | 'EXPIRED'
  | 'INITIAL_STOCK';

export interface StockMovement {
  id:              string;
  medicationId:    string;
  medicationName:  string;
  type:            MovementType;
  quantity:        number;
  stockBefore:     number;
  stockAfter:      number;
  reason:          MovementReason;
  prescriptionId?: string;
  notes?:          string;
  performedBy:     string;
  createdAt:       string;
}

export interface StockUpdateRequest {
  quantityChange:  number;
  reason:          MovementReason;
  prescriptionId?: string;
  notes?:          string;
  performedBy?:    string;
}

export interface StockStats {
  total:          number;
  available:      number;
  low:            number;
  out:            number;
  totalMovements: number;
  totalIn:        number;
  totalOut:       number;
}

@Injectable({ providedIn: 'root' })
export class StockService {

  private base = `${environment.apiUrl}/pharmacy/api/stock`;

  // ✅ Options communes — désactive Keycloak interceptor
  private opts = { withCredentials: false };

  constructor(private http: HttpClient) {}

  // ── CRUD Medications ───────────────────────────

  createMedication(med: any): Observable<any> {
    return this.http.post(`${this.base}/medications`, med, this.opts);
  }

  updateMedication(id: string, med: any): Observable<any> {
    return this.http.put(`${this.base}/medications/${id}`, med, this.opts);
  }

  deleteMedication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/medications/${id}`, this.opts);
  }

  // ── Stock Adjust ───────────────────────────────

  updateStock(medicationId: string, req: StockUpdateRequest): Observable<any> {
    return this.http.patch(
      `${this.base}/medications/${medicationId}`, req, this.opts
    );
  }

  // ── Movements ─────────────────────────────────

  getAllMovements(): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.base}/movements`, this.opts);
  }

  getMovementsByMedication(id: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(
      `${this.base}/movements/medication/${id}`, this.opts
    );
  }

  // ── Stats ──────────────────────────────────────

  getStats(): Observable<StockStats> {
    return this.http.get<StockStats>(`${this.base}/stats`, this.opts);
  }
}