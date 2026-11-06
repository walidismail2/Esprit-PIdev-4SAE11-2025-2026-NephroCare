import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date; 
  read: boolean;   
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private toasts$ = new BehaviorSubject<Toast[]>([]);
  toasts = this.toasts$.asObservable();

  success(title: string, message: string): void {
    this.add('success', title, message);
  }

  error(title: string, message: string): void {
    this.add('error', title, message);
  }

  warning(title: string, message: string): void {
    this.add('warning', title, message);
  }

  info(title: string, message: string): void {
    this.add('info', title, message);
  }

  private add(type: Toast['type'], title: string, message: string): void {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),  
      read: false             
    };
    this.toasts$.next([toast, ...this.toasts$.value]);

  }

  markAllRead(): void {
    this.toasts$.next(
      this.toasts$.value.map(t => ({ ...t, read: true }))
    );
  }

  remove(id: string): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }

  clearAll(): void {
    this.toasts$.next([]);
  }

  get unreadCount(): number {
    return this.toasts$.value.filter(t => !t.read).length;
  }
}