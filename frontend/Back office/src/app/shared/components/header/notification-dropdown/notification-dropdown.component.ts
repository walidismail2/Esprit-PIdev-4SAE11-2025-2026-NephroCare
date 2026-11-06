import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component';
import { NotificationService, Toast } from '../../../../services/notification.service';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent]
})
export class NotificationDropdownComponent implements OnInit {
  isOpen = false;
  notifying = false;
  toasts: Toast[] = [];
  unreadCount = 0;

  constructor(private notif: NotificationService) {}

  ngOnInit(): void {
    this.notif.toasts.subscribe((t: Toast[]) => {
      this.toasts = t;
      this.unreadCount = t.filter(n => !n.read).length;
      this.notifying = this.unreadCount > 0;
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.notif.markAllRead();
      this.notifying = false;
    }
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.notif.remove(id);
  }

  clearAll(): void {
    this.notif.clearAll();
  }

  timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  iconFor(type: string): string {
    const icons: Record<string, string> = {
      success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
    };
    return icons[type] || '🔔';
  }

  bgFor(type: string): string {
    const colors: Record<string, string> = {
      success: 'bg-green-100 dark:bg-green-500/10',
      error:   'bg-red-100 dark:bg-red-500/10',
      warning: 'bg-yellow-100 dark:bg-yellow-500/10',
      info:    'bg-blue-100 dark:bg-blue-500/10'
    };
    return colors[type] || 'bg-gray-100';
  }

  borderFor(type: string): string {
    const borders: Record<string, string> = {
      success: 'border-l-4 border-green-400',
      error:   'border-l-4 border-red-400',
      warning: 'border-l-4 border-yellow-400',
      info:    'border-l-4 border-blue-400'
    };
    return borders[type] || '';
  }
}