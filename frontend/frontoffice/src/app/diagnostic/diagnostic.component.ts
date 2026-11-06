import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DiagnosticNotificationService,
  DiagnosticNotification,
} from '../services/diagnostic-notification.service';

// ══════════════════════════════════════════════
//   INTERFACES
// ══════════════════════════════════════════════

interface DiagnosticOrder {
  id?: string;
  orderType?: string;
  testName: string;
  orderDate: string;
  priority: string;
  status: string;
  clinicalNotes: string;
  userId: string;
  consultationId: string;
  orderedBy: string;
}

// Interface étendue pour l'affichage popup
interface PopupItem extends DiagnosticNotification {
  leaving: boolean;
  paused:  boolean;
  timerId?: ReturnType<typeof setTimeout>;
}

type SortField = 'testName' | 'orderDate' | 'priority' | 'status' | 'orderedBy' | '';
type SortDir   = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<string, number> = {
  EMERGENCY: 0, STAT: 1, URGENT: 2, ROUTINE: 3
};
const STATUS_WEIGHT: Record<string, number> = {
  IN_PROGRESS: 0, ORDERED: 1, SCHEDULED: 2, COMPLETED: 3, CANCELLED: 4
};

// Durées d'affichage popup par sévérité (ms)
const POPUP_DURATIONS: Record<string, number> = {
  critical: 8000,
  warning:  6000,
  info:     4500,
};

// ══════════════════════════════════════════════
//   COMPONENT
// ══════════════════════════════════════════════

@Component({
  selector: 'app-diagnostic',
  standalone: false,
  templateUrl: './diagnostic.component.html',
  styleUrls: ['./diagnostic.component.css']
})
export class DiagnosticComponent implements OnInit, OnDestroy {

  // ── Orders ────────────────────────────────────────────────────────────────
  backendUrl      = `${environment.apiUrl}/diagnostic/diagnostic-orders`;
  orders:          DiagnosticOrder[] = [];
  filteredOrders:  DiagnosticOrder[] = [];
  form:            FormGroup;
  editingId:       string | null = null;

  statusFilter = '';
  searchQuery  = '';
  sortField:    SortField = '';
  sortDir:      SortDir   = 'asc';
  todayIso = this.toLocalDatetimeInputValue(new Date());

  // ── Notifications (panneau in-page) ───────────────────────────────────────
  notifications:     DiagnosticNotification[] = [];
  notifFilter:       'all' | 'critical' | 'warning' | 'info' | 'unread' = 'all';
  showNotifPanel     = true;
  private notifSub?: Subscription;

  // ── Popups (coin bas-droite) ───────────────────────────────────────────────
  popups: PopupItem[] = [];
  private shownPopupIds = new Set<string>();

  constructor(
    private http:         HttpClient,
    private fb:           FormBuilder,
    public  notifService: DiagnosticNotificationService
  ) {
    this.form = this.fb.group({
      orderType:      ['', Validators.required],
      testName:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      orderDate:      ['', Validators.required],
      priority:       ['', Validators.required],
      status:         ['', Validators.required],
      clinicalNotes:  ['', Validators.maxLength(1000)],
      userId:         ['', Validators.required],
      consultationId: ['', Validators.required],
      orderedBy:      ['', Validators.required],
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadOrders();

    this.notifSub = this.notifService.notifications.subscribe(notifs => {
      this.notifications = notifs;

      // Afficher un popup pour chaque nouvelle notification jamais montrée
      notifs
        .filter(n => !this.shownPopupIds.has(n.id))
        .forEach(n => {
          this.shownPopupIds.add(n.id);
          this.showPopup(n);
        });
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    // Nettoyer tous les timers en cours
    this.popups.forEach(p => { if (p.timerId) clearTimeout(p.timerId); });
  }

  // ══════════════════════════════════════════════
  //   POPUP METHODS
  // ══════════════════════════════════════════════

  private showPopup(n: DiagnosticNotification): void {
    // Max 4 popups simultanés — retirer le plus ancien
    if (this.popups.length >= 4) {
      this.closePopup(this.popups[0]);
    }

    const popup: PopupItem = { ...n, leaving: false, paused: false };
    this.popups.push(popup);

    // Auto-fermeture
    popup.timerId = setTimeout(
      () => this.closePopup(popup),
      this.getPopupDuration(n.severity)
    );
  }

  closePopup(popup: PopupItem): void {
    if (popup.leaving) return;
    if (popup.timerId) clearTimeout(popup.timerId);

    popup.leaving = true;

    // Retirer après l'animation de sortie (320ms)
    setTimeout(() => {
      this.popups = this.popups.filter(p => p.id !== popup.id);
    }, 320);
  }

  pausePopup(popup: PopupItem): void {
    if (popup.timerId) clearTimeout(popup.timerId);
    popup.paused = true;
  }

  resumePopup(popup: PopupItem): void {
    popup.paused = false;
    // Redonner la moitié du temps restant après le hover
    popup.timerId = setTimeout(
      () => this.closePopup(popup),
      this.getPopupDuration(popup.severity) / 2
    );
  }

  getPopupDuration(severity: string): number {
    return POPUP_DURATIONS[severity] ?? 5000;
  }

  trackPopupById(_: number, popup: PopupItem): string {
    return popup.id;
  }

  // ══════════════════════════════════════════════
  //   ORDERS CRUD
  // ══════════════════════════════════════════════

  loadOrders(): void {
    this.http.get<DiagnosticOrder[]>(this.backendUrl).subscribe({
      next:  data => { this.orders = data || []; this.applyFilterAndSort(); },
      error: err  => console.error('Error loading orders', err)
    });
  }

  private formatDateForBackend(dateStr: string): string {
    if (!dateStr) return '';

    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return '';

    // Keep a safety margin to avoid @PastOrPresent failures caused by clock skew.
    const safetyNow = new Date(Date.now() - 2 * 60 * 1000);
    const safeDate = parsed.getTime() > safetyNow.getTime() ? safetyNow : parsed;
    return safeDate.toISOString().slice(0, 19);
  }

  private toLocalDatetimeInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  saveOrder(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const rawValue = this.form.value;
    const order: DiagnosticOrder = {
      ...rawValue,
      orderDate: this.formatDateForBackend(rawValue.orderDate)
    };

    if (this.editingId) {
      this.http.put<DiagnosticOrder>(`${this.backendUrl}/${this.editingId}`, order).subscribe({
        next: () => {
          this.notifService.pushCrudNotification('updated', { ...order, id: this.editingId });
          this.loadOrders();
          this.form.reset();
          this.editingId = null;
        },
        error: err => console.error('Error updating order', err)
      });
    } else {
      this.http.post<DiagnosticOrder>(this.backendUrl, order).subscribe({
        next: (created) => {
          this.notifService.pushCrudNotification('created', created || order);
          this.loadOrders();
          this.form.reset();
        },
        error: err => console.error('Error creating order', err)
      });
    }
  }

  editOrder(order: DiagnosticOrder): void {
    this.editingId = order.id || null;
    this.form.patchValue({
      ...order,
      orderDate: order.orderDate ? order.orderDate.substring(0, 16) : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteOrder(order: DiagnosticOrder): void {
    if (!order.id) return;
    if (!confirm(`Delete order "${order.testName}"?`)) return;

    this.http.delete(`${this.backendUrl}/${order.id}`).subscribe({
      next: () => {
        this.notifService.pushCrudNotification('deleted', order);
        this.loadOrders();
      },
      error: err => console.error('Error deleting order', err)
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset();
  }

  // ══════════════════════════════════════════════
  //   FILTER & SORT
  // ══════════════════════════════════════════════

  setFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilterAndSort();
  }

  onSearch():    void { this.applyFilterAndSort(); }
  clearSearch(): void { this.searchQuery = ''; this.applyFilterAndSort(); }

  setSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir   = 'asc';
    }
    this.applyFilterAndSort();
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  applyFilterAndSort(): void {
    let result = [...this.orders];

    if (this.statusFilter)
      result = result.filter(o => o.status === this.statusFilter);

    const q = this.searchQuery.trim().toLowerCase();
    if (q)
      result = result.filter(o =>
        o.testName?.toLowerCase().includes(q)       ||
        o.orderedBy?.toLowerCase().includes(q)      ||
        o.orderType?.toLowerCase().includes(q)      ||
        o.userId?.toLowerCase().includes(q)         ||
        o.consultationId?.toLowerCase().includes(q) ||
        o.clinicalNotes?.toLowerCase().includes(q)
      );

    if (this.sortField) {
      result.sort((a, b) => {
        let vA: any = (a as any)[this.sortField];
        let vB: any = (b as any)[this.sortField];
        if (this.sortField === 'priority')       { vA = PRIORITY_WEIGHT[vA] ?? 99; vB = PRIORITY_WEIGHT[vB] ?? 99; }
        else if (this.sortField === 'status')    { vA = STATUS_WEIGHT[vA]   ?? 99; vB = STATUS_WEIGHT[vB]   ?? 99; }
        else if (this.sortField === 'orderDate') { vA = new Date(vA).getTime();    vB = new Date(vB).getTime(); }
        else { vA = (vA || '').toLowerCase(); vB = (vB || '').toLowerCase(); }
        return vA < vB ? (this.sortDir === 'asc' ? -1 : 1)
             : vA > vB ? (this.sortDir === 'asc' ?  1 : -1) : 0;
      });
    }

    this.filteredOrders = result;
  }

  countByStatus(status: string):     number { return this.orders.filter(o => o.status   === status).length; }
  countByPriority(priority: string): number { return this.orders.filter(o => o.priority === priority).length; }

  isFieldInvalid(fieldName: string): boolean {
    const f = this.form.get(fieldName);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  // ══════════════════════════════════════════════
  //   NOTIFICATION HELPERS
  // ══════════════════════════════════════════════

  get filteredNotifs(): DiagnosticNotification[] {
    switch (this.notifFilter) {
      case 'critical': return this.notifications.filter(n => n.severity === 'critical');
      case 'warning':  return this.notifications.filter(n => n.severity === 'warning');
      case 'info':     return this.notifications.filter(n => n.severity === 'info');
      case 'unread':   return this.notifications.filter(n => !n.read);
      default:         return this.notifications;
    }
  }

  get criticalCount(): number { return this.notifications.filter(n => n.severity === 'critical').length; }
  get warningCount():  number { return this.notifications.filter(n => n.severity === 'warning').length; }
  get infoCount():     number { return this.notifications.filter(n => n.severity === 'info').length; }
  get unreadCount():   number { return this.notifications.filter(n => !n.read).length; }

  acknowledgeNotif(id: string): void { this.notifService.acknowledge(id); }
  markAllRead():                void  { this.notifService.markAllRead(); }
  clearAllNotifs():             void  {
    if (confirm('Clear all diagnostic notifications?')) this.notifService.clearAll();
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      emergency_order:  'bi-exclamation-octagon-fill',
      stat_order:       'bi-lightning-charge-fill',
      result_ready:     'bi-check-circle-fill',
      order_overdue:    'bi-clock-history',
      order_cancelled:  'bi-x-circle-fill',
      new_order:        'bi-plus-circle-fill',
    };
    return icons[type] || 'bi-bell-fill';
  }

  getNotifBg(severity: string): string {
    return severity === 'critical' ? '#fee2e2'
         : severity === 'warning'  ? '#fef3c7'
         : '#e0f2fe';
  }

  getNotifColor(severity: string): string {
    return severity === 'critical' ? '#dc2626'
         : severity === 'warning'  ? '#d97706'
         : '#0284c7';
  }

  getTimeAgo(date: Date): string {
    const diff  = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins  > 0) return `${mins}m ago`;
    return 'just now';
  }
}