import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { NotificationService, ToastAlert } from './services/Notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrls: ['./app.component.css'],
})
export class AppComponent {

  toasts$: Observable<ToastAlert[]>;

  constructor(
    private router: Router,
    public notifService: NotificationService
  ) {
    this.toasts$ = this.notifService.toasts;
  }

  showHeaderFooter(): boolean {
    const hideOn = ['/login', '/register'];
    return !hideOn.includes(this.router.url);
  }
}