import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

export interface NotificationDto {
    id: string;
    type: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    payloadJson?: string | null;
    readAt?: string | null;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
    private baseUrl = `${environment.apiUrl}/api/notifications`;

    constructor(private http: HttpClient) {}

    my(): Observable<NotificationDto[]> {
        return this.http.get<NotificationDto[]>(`${this.baseUrl}/my`).pipe(
            catchError(() => of([]))
        );
    }

    unreadCount(): Observable<number> {
        return this.http.get<number>(`${this.baseUrl}/my/unread-count`).pipe(
            catchError(() => of(0))
        );
    }

    markRead(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/read`, null);
    }
}