import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';

interface DiagnosticResult {
  id?: string;
  resultDate: string;
  resultValues: string;
  referenceRange: string;
  performedBy: string;
  isAbnormal: boolean;
  labFindings?: string;
  imageInterpretation?: string;
  orderId: string;
}

type SortField = 'resultDate' | 'performedBy' | 'resultValues' | 'orderId' | '';
type SortDir   = 'asc' | 'desc';

@Component({
  selector: 'app-diagnostic-result',
  standalone: false,
  templateUrl: './diagnostic-result.component.html',
  styleUrls: ['./diagnostic-result.component.css']
})
export class DiagnosticResultComponent implements OnInit {

  backendUrl = `${environment.apiUrl}/diagnostic/api/diagnostic-results`;
  results:         DiagnosticResult[] = [];
  filteredResults: DiagnosticResult[] = [];
  form:            FormGroup;
  editingId:       string | null = null;

  searchQuery  = '';
  abnormalFilter: '' | 'true' | 'false' = '';
  sortField:    SortField = '';
  sortDir:      SortDir   = 'asc';

  todayIso = new Date().toISOString().slice(0, 16);

  constructor(
    private http: HttpClient,
    private fb:   FormBuilder
  ) {
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

  ngOnInit(): void {
    this.loadResults();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  loadResults(): void {
    this.http.get<DiagnosticResult[]>(this.backendUrl).subscribe({
      next:  data => { this.results = data || []; this.applyFilterAndSort(); },
      error: err  => console.error('Error loading results', err)
    });
  }

  saveResult(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const raw = this.form.value;
    const payload: DiagnosticResult = {
      ...raw,
      resultDate: raw.resultDate ? raw.resultDate + ':00' : null,
      isAbnormal: !!raw.isAbnormal
    };

    if (this.editingId) {
      this.http.put<DiagnosticResult>(`${this.backendUrl}/${this.editingId}`, payload).subscribe({
        next: () => { this.loadResults(); this.cancelEdit(); },
        error: err => console.error('Error updating result', err)
      });
    } else {
      this.http.post<DiagnosticResult>(this.backendUrl, payload).subscribe({
        next: () => { this.loadResults(); this.cancelEdit(); },
        error: err => console.error('Error creating result', err)
      });
    }
  }

  editResult(result: DiagnosticResult): void {
    this.editingId = result.id || null;
    this.form.patchValue({
      ...result,
      resultDate: result.resultDate ? result.resultDate.substring(0, 16) : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteResult(result: DiagnosticResult): void {
    if (!result.id) return;
    if (!confirm(`Delete result for order "${result.orderId}"?`)) return;
    this.http.delete(`${this.backendUrl}/${result.id}`).subscribe({
      next: () => this.loadResults(),
      error: err => console.error('Error deleting result', err)
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ isAbnormal: false });
  }

  // ── FILTER & SORT ─────────────────────────────────────────────────────────

  setAbnormalFilter(val: '' | 'true' | 'false'): void {
    this.abnormalFilter = val;
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
    let result = [...this.results];

    if (this.abnormalFilter !== '') {
      const flag = this.abnormalFilter === 'true';
      result = result.filter(r => r.isAbnormal === flag);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(r =>
        (r.resultValues        || '').toLowerCase().includes(q) ||
        (r.referenceRange      || '').toLowerCase().includes(q) ||
        (r.performedBy         || '').toLowerCase().includes(q) ||
        (r.orderId             || '').toLowerCase().includes(q) ||
        (r.labFindings         || '').toLowerCase().includes(q) ||
        (r.imageInterpretation || '').toLowerCase().includes(q)
      );
    }

    if (this.sortField) {
      result.sort((a, b) => {
        let vA: any = (a as any)[this.sortField];
        let vB: any = (b as any)[this.sortField];
        if (this.sortField === 'resultDate') {
          vA = new Date(vA).getTime();
          vB = new Date(vB).getTime();
        } else {
          vA = (vA || '').toLowerCase();
          vB = (vB || '').toLowerCase();
        }
        return vA < vB ? (this.sortDir === 'asc' ? -1 : 1)
             : vA > vB ? (this.sortDir === 'asc' ?  1 : -1) : 0;
      });
    }

    this.filteredResults = result;
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  get totalCount():    number { return this.results.length; }
  get abnormalCount(): number { return this.results.filter(r => r.isAbnormal).length; }
  get normalCount():   number { return this.results.filter(r => !r.isAbnormal).length; }

  isFieldInvalid(fieldName: string): boolean {
    const f = this.form.get(fieldName);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  getLabFindingsLength(): number {
    return this.form.get('labFindings')?.value?.length || 0;
  }

  getImageInterpretationLength(): number {
    return this.form.get('imageInterpretation')?.value?.length || 0;
  }
}
