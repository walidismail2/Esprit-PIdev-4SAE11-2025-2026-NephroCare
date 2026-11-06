import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ToastComponent implements OnInit {

  // ✅ Seulement les toasts RÉCENTS (moins de 5s) pour l'affichage visuel
  visibleToasts: Toast[] = [];
  private shownIds = new Set<string>();

  constructor(private notif: NotificationService) {}

  ngOnInit(): void {
    this.notif.toasts.subscribe((toasts: Toast[]) => {
      // Afficher seulement les nouveaux toasts (pas déjà montrés)
      toasts.forEach(t => {
        if (!this.shownIds.has(t.id)) {
          this.shownIds.add(t.id);
          this.visibleToasts.push(t);

          // ✅ Disparaît visuellement après 4s MAIS reste dans le service
          setTimeout(() => {
            this.visibleToasts = this.visibleToasts.filter(v => v.id !== t.id);
          }, 6000);
        }
      });
    });
  }

  dismiss(id: string): void {
    this.visibleToasts = this.visibleToasts.filter(v => v.id !== id);
  }

  iconFor(type: string): string {
    const icons: Record<string, string> = {
      success: 'fa-check-circle',
      error:   'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info:    'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
  }
}