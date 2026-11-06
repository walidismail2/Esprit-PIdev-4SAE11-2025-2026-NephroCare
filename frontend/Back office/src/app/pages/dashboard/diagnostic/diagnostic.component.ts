import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DiagnosticService } from '../../../services/diagnostic.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-diagnostic',
  templateUrl: './diagnostic.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  styleUrls: ['./diagnostic.component.css']
})
export class DiagnosticComponent implements OnInit {

  orders: any[] = [];
  filteredOrders: any[] = [];
  form!: FormGroup;
  editingId: string | null = null;
  searchTerm: string = '';

  todayIso = this.toLocalDatetimeInputValue(new Date());

  orderTypes = ['LABORATORY', 'RADIOLOGY', 'ULTRASOUND', 'CT_SCAN', 'MRI', 'X_RAY'];
  priorities = ['ROUTINE', 'URGENT', 'STAT', 'EMERGENCY'];
  statuses   = ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  constructor(
    private service: DiagnosticService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAll();
  }

  private initForm(): void {
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

  loadAll(): void {
    this.service.getAllOrders().subscribe({
      next: (data: any[]) => {
        this.orders = data || [];
        this.filterOrders();
      },
      error: err => console.error('Error loading diagnostic orders', err)
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;
    const orderDate = this.normalizeOrderDate(raw.orderDate);
    const payload = {
      ...raw,
      orderDate
    };

    const obs = this.editingId
      ? this.service.updateOrder(this.editingId, payload)
      : this.service.createOrder(payload);

    obs.subscribe({
      next: () => { this.loadAll(); this.cancel(); },
      error: err => console.error('Save error:', err)
    });
  }

  private normalizeOrderDate(rawValue: string | null): string | null {
    if (!rawValue) return null;

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return null;

    // Backend uses @PastOrPresent. In distributed env (browser vs k8s pod clock drift),
    // "current minute" can still be rejected as future.
    // Keep a small safety margin to avoid intermittent 500 on create.
    const nowUtc = new Date();
    const safetyNowUtc = new Date(nowUtc.getTime() - 2 * 60 * 1000);
    const safeUtc = parsed.getTime() > safetyNowUtc.getTime() ? safetyNowUtc : parsed;

    return safeUtc.toISOString().slice(0, 19);
  }

  private toLocalDatetimeInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  edit(order: any): void {
    this.editingId = order.id;
    this.form.patchValue({
      orderType:      order.orderType,
      testName:       order.testName,
      orderDate:      order.orderDate ? order.orderDate.substring(0, 16) : '',
      priority:       order.priority,
      status:         order.status,
      clinicalNotes:  order.clinicalNotes,
      userId:         order.userId,
      consultationId: order.consultationId,
      orderedBy:      order.orderedBy,
    });
  }

  delete(id: string): void {
    if (!id) return;
    if (!confirm('Delete this diagnostic order?')) return;
    this.service.deleteOrder(id).subscribe({
      next: () => this.loadAll(),
      error: err => console.error('Error deleting order', err)
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset();
  }

  filterOrders(): void {
    const term = this.searchTerm?.toLowerCase() || '';
    this.filteredOrders = this.orders.filter(o =>
      !term ||
      (o.testName     || '').toLowerCase().includes(term) ||
      (o.orderType    || '').toLowerCase().includes(term) ||
      (o.status       || '').toLowerCase().includes(term) ||
      (o.priority     || '').toLowerCase().includes(term) ||
      (o.orderedBy    || '').toLowerCase().includes(term) ||
      (o.userId       || '').toLowerCase().includes(term)
    );
  }

  fieldError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  priorityClass(p: string): string {
    switch (p) {
      case 'EMERGENCY': return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
      case 'STAT':      return 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-300';
      case 'URGENT':    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
      case 'ROUTINE':   return 'bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-400';
      default:          return 'bg-gray-100 text-gray-500';
    }
  }

  statusClass(s: string): string {
    switch (s) {
      case 'COMPLETED':   return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
      case 'IN_PROGRESS': return 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400';
      case 'ORDERED':     return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
      case 'SCHEDULED':   return 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400';
      case 'CANCELLED':   return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
      default:            return 'bg-gray-100 text-gray-500';
    }
  }
}