import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DiagnosticResultService } from '../../../services/diagnostic-result.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-diagnostic-result',
  templateUrl: './diagnostic-result.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  styleUrls: ['./diagnostic-result.component.css']
})
export class DiagnosticResultComponent implements OnInit {

  private service = inject(DiagnosticResultService);
  private fb      = inject(FormBuilder);

  results: any[]         = [];
  filteredResults: any[] = [];
  form!: FormGroup;
  editingId: string | null = null;
  searchTerm = '';
  todayIso = this.toLocalDatetimeInputValue(new Date());

  ngOnInit(): void {
    this.initForm();
    this.loadAll();
  }

  private initForm(): void {
    this.form = this.fb.group({
      resultDate:          ['', Validators.required],
      resultValues:        ['', Validators.required],
      referenceRange:      ['', Validators.required],
      performedBy:         ['', Validators.required],
      isAbnormal:          [false],
      labFindings:         ['', Validators.maxLength(2000)],
      imageInterpretation: ['', Validators.maxLength(2000)],
      orderId:             ['', Validators.required],
    });
  }

  loadAll(): void {
    this.service.getAllResults().subscribe({
      next: (data: any[]) => {
        this.results = data || [];
        this.filterResults();
      },
      error: err => console.error('Error loading diagnostic results', err)
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;
    const resultDate = this.normalizeResultDate(raw.resultDate);
    const payload = {
      ...raw,
      resultDate
    };

    const obs = this.editingId
      ? this.service.updateResult(this.editingId, payload)
      : this.service.createResult(payload);

    obs.subscribe({
      next: () => { this.loadAll(); this.cancel(); },
      error: err => console.error('Save error:', err)
    });
  }

  edit(result: any): void {
    this.editingId = result.id;
    this.form.patchValue({
      resultDate:          result.resultDate ? result.resultDate.substring(0, 16) : '',
      resultValues:        result.resultValues,
      referenceRange:      result.referenceRange,
      performedBy:         result.performedBy,
      isAbnormal:          result.isAbnormal,
      labFindings:         result.labFindings,
      imageInterpretation: result.imageInterpretation,
      orderId:             result.orderId,
    });
  }

  delete(id: string): void {
    if (!id) return;
    if (!confirm('Delete this diagnostic result?')) return;
    this.service.deleteResult(id).subscribe({
      next: () => this.loadAll(),
      error: err => console.error('Error deleting result', err)
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset({ isAbnormal: false });
  }

  filterResults(): void {
    const term = this.searchTerm?.toLowerCase() || '';
    this.filteredResults = this.results.filter(r =>
      !term ||
      (r.resultValues        || '').toLowerCase().includes(term) ||
      (r.referenceRange      || '').toLowerCase().includes(term) ||
      (r.performedBy         || '').toLowerCase().includes(term) ||
      (r.orderId             || '').toLowerCase().includes(term) ||
      (r.labFindings         || '').toLowerCase().includes(term)
    );
  }

  fieldError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  abnormalClass(isAbnormal: boolean): string {
    return isAbnormal
      ? 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400'
      : 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
  }

  private normalizeResultDate(rawValue: string | null): string | null {
    if (!rawValue) return null;

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return null;

    const nowUtc = new Date();
    const safeUtc = parsed.getTime() > nowUtc.getTime() ? nowUtc : parsed;

    return safeUtc.toISOString().slice(0, 19);
  }

  private toLocalDatetimeInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
}