import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DiagnosticNotificationService } from '../services/diagnostic-notification.service';
import { environment } from '../../environments/environment';

interface DiagnosticOrder {
  id?: string;
  orderType: string;
  testName: string;
  orderDate: string;
  priority: string;
  status: string;
  clinicalNotes: string;
  userId: string;
  consultationId: string;
  orderedBy: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  orders: DiagnosticOrder[];
}

@Component({
  selector: 'app-diagnostic-calendar',
  standalone: false,
  templateUrl: './diagnostic-calendar.component.html',
  styleUrls: ['./diagnostic-calendar.component.css']
})
export class DiagnosticCalendarComponent implements OnInit {

  private backendUrl = `${environment.apiUrl}/diagnostic/diagnostic-orders`;

  orders: DiagnosticOrder[] = [];
  calendarWeeks: CalendarDay[][] = [];
  selectedDay: CalendarDay | null = null;
  currentDate = new Date();

  showModal  = false;
  editingId: string | null = null;
  form: FormGroup;
  submitted  = false;

  readonly weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  readonly months   = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  constructor(
    private http: HttpClient,
    private fb:   FormBuilder,
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

  ngOnInit(): void { this.loadOrders(); }

  // ─────────────────────────────────────────────
  //  LOAD → BUILD CALENDAR  (called after every CRUD)
  // ─────────────────────────────────────────────
  loadOrders(): void {
    this.http.get<DiagnosticOrder[]>(this.backendUrl).subscribe({
      next: data => {
        this.orders = data || [];
        this.buildCalendar();
        // keep selected day in sync
        if (this.selectedDay) {
          const found = this.calendarWeeks.flat()
            .find(d => this.isSameDay(d.date, this.selectedDay!.date));
          this.selectedDay = found ?? null;
        }
      },
      error: err => console.error(err)
    });
  }

  buildCalendar(): void {
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());

    this.calendarWeeks = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cur);
        week.push({
          date,
          isCurrentMonth: date.getMonth() === month,
          isToday:   this.isSameDay(date, today),
          isSelected: this.selectedDay ? this.isSameDay(date, this.selectedDay.date) : false,
          orders:    this.orders.filter(o => o.orderDate && this.isSameDay(new Date(o.orderDate), date))
        });
        cur.setDate(cur.getDate() + 1);
      }
      this.calendarWeeks.push(week);
    }
  }

  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  // ── Navigation ────────────────────────────────
  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
  }
  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
  }
  goToToday(): void {
    this.currentDate = new Date();
    this.buildCalendar();
    const cell = this.calendarWeeks.flat().find(d => d.isToday);
    if (cell) this.selectDay(cell);
  }

  // ── Day click ─────────────────────────────────
  selectDay(day: CalendarDay): void {
    this.selectedDay = day;
    this.buildCalendar();
  }

  // ── Modal open ────────────────────────────────
  openModal(date?: Date, order?: DiagnosticOrder): void {
    this.submitted = false;
    this.editingId = order?.id || null;
    this.form.reset();
    if (order) {
      this.form.patchValue({ ...order, orderDate: order.orderDate?.substring(0, 10) || '' });
    } else if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      this.form.patchValue({ orderDate: `${y}-${m}-${d}` });
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false; this.editingId = null; this.submitted = false; this.form.reset();
  }

  // ── CRUD  (each calls loadOrders() → calendar rebuilds immediately) ──────
  saveOrder(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;
    const order = { ...raw, orderDate: this._fmt(raw.orderDate) };

    if (this.editingId) {
      this.http.put<DiagnosticOrder>(`${this.backendUrl}/${this.editingId}`, order).subscribe({
        next: () => {
          this.notifService.pushCrudNotification('updated', { ...order, id: this.editingId });
          this.closeModal();
          this.loadOrders();   // ← calendar updates instantly
        }
      });
    } else {
      this.http.post<DiagnosticOrder>(this.backendUrl, order).subscribe({
        next: created => {
          this.notifService.pushCrudNotification('created', created || order);
          this.closeModal();
          this.loadOrders();   // ← calendar updates instantly
        }
      });
    }
  }

  deleteOrder(order: DiagnosticOrder, e: Event): void {
    e.stopPropagation();
    if (!order.id || !confirm(`Delete "${order.testName}"?`)) return;
    this.http.delete(`${this.backendUrl}/${order.id}`).subscribe({
      next: () => {
        this.notifService.pushCrudNotification('deleted', order);
        this.loadOrders();     // ← calendar updates instantly
      }
    });
  }

  // ── Helpers ───────────────────────────────────
  private _fmt(s: string): string {
    if (!s || s.includes('T')) return s;
    const n = new Date();
    return `${s}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:00`;
  }

  isFieldInvalid(f: string): boolean {
    const c = this.form.get(f);
    return !!(c && c.invalid && (this.submitted || c.dirty || c.touched));
  }

  // Couleur dominante du jour (ordre le plus urgent)
  getDayAccentColor(orders: DiagnosticOrder[]): string {
    if (!orders.length) return 'transparent';
    const w: any = { EMERGENCY:0, STAT:1, URGENT:2, ROUTINE:3 };
    const top = orders.reduce((a,b) => (w[a.priority]??9) <= (w[b.priority]??9) ? a : b);
    return this.getPriorityColor(top.priority);
  }

  getDayBg(orders: DiagnosticOrder[]): string {
    if (!orders.length) return '';
    const w: any = { EMERGENCY:0, STAT:1, URGENT:2, ROUTINE:3 };
    const top = orders.reduce((a,b) => (w[a.priority]??9) <= (w[b.priority]??9) ? a : b);
    return this.getPriorityBg(top.priority);
  }

  getPriorityColor(p: string): string {
    return ({EMERGENCY:'#dc2626',STAT:'#f97316',URGENT:'#d97706',ROUTINE:'#0284c7'} as any)[p?.toUpperCase()] || '#64748b';
  }
  getPriorityBg(p: string): string {
    return ({EMERGENCY:'#fee2e2',STAT:'#ffedd5',URGENT:'#fef3c7',ROUTINE:'#e0f2fe'} as any)[p?.toUpperCase()] || '#f1f5f9';
  }
  getStatusColor(s: string): string {
    return ({IN_PROGRESS:'#16a34a',ORDERED:'#d97706',SCHEDULED:'#0284c7',COMPLETED:'#64748b',CANCELLED:'#dc2626'} as any)[s?.toUpperCase()] || '#64748b';
  }
  getTypeIcon(t: string): string {
    return ({LABORATORY:'🔬',RADIOLOGY:'☢️',ULTRASOUND:'📡',CT_SCAN:'🧠',MRI:'🧲',X_RAY:'🦴'} as any)[t?.toUpperCase()] || '🔬';
  }

  get monthLabel(): string {
    return `${this.months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }
  get selectedLabel(): string {
    return this.selectedDay?.date.toLocaleDateString('en-GB',
      {weekday:'long',day:'numeric',month:'long',year:'numeric'}) || '';
  }
}