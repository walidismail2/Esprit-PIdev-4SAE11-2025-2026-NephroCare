// src/app/services/room.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Room {
  id:               number;
  roomNumber:       string;
  type:             string;       // 'standard' | 'intensive' | 'isolation' | 'pediatric' | 'maternity'
  capacity:         number;
  description?:     string;
  available:        boolean;      // computed by the backend
  currentOccupancy: number;       // computed by the backend
}

@Injectable({ providedIn: 'root' })
export class RoomService {

  // Routed through the API Gateway:
  //   Gateway path /hospitalization/**  →  stripPrefix(1)  →  /api/rooms/**
  private readonly baseUrl = `${environment.apiUrl}/hospitalization/api/rooms`;

  constructor(private http: HttpClient) {}

  /** GET /api/rooms — all rooms with live occupancy + availability flag */
  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(this.baseUrl);
  }

  /** GET /api/rooms/available — only rooms that still have free beds */
  getAvailable(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.baseUrl}/available`);
  }

  /** GET /api/rooms/:id */
  getById(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/rooms */
  create(room: Partial<Room>): Observable<Room> {
    return this.http.post<Room>(this.baseUrl, room);
  }

  /** PUT /api/rooms/:id */
  update(id: number, room: Partial<Room>): Observable<Room> {
    return this.http.put<Room>(`${this.baseUrl}/${id}`, room);
  }

  /** DELETE /api/rooms/:id */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}