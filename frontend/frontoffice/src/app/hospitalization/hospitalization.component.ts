import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HospitalizationService } from '../services/hospitalization.service';
import { RoomService, Room } from '../services/Room.service';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-hospitalization',
  standalone: false,
  templateUrl: './hospitalization.component.html',
  styleUrls: ['./hospitalization.component.css']
})
export class HospitalizationComponent implements OnInit {

  hospitalizations: any[]         = [];
  filteredHospitalizations: any[] = [];
  form: FormGroup;
  editingId: number | null         = null;
  searchTerm: string               = '';
  activeFilter: string             = 'all';
  sortField: string                = 'date-desc';
  criticalCount: number            = 0;

  private currentUserId: string | null = null;
  isDoctor = false;

  // ── Room lookup map ────────────────────────────────────────────────────
  private roomMap = new Map<number, Room>();

  constructor(
    private service:     HospitalizationService,
    private roomService: RoomService,
    private fb:          FormBuilder,
    private cdr:         ChangeDetectorRef,
    private keycloakService: KeycloakService
  ) {
    this.form = this.fb.group({
      admissionDate:     [''],
      dischargeDate:     [''],
      admissionReason:   [''],
      status:            [''],
      userId:            [''],
      attendingDoctorId: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const tokenParsed: any = this.keycloakService.getKeycloakInstance().tokenParsed ?? {};
      this.currentUserId =
        tokenParsed.sub ??
        tokenParsed.preferred_username ??
        tokenParsed.email ??
        null;
    } catch (err) {
      console.error('Failed to load Keycloak user profile', err);
      this.currentUserId = null;
    }

    this.isDoctor = this.keycloakService.isUserInRole('doctor');
    this.loadAll();
  }

  // ── Load both hospitalizations and rooms in parallel ──────────────────
  loadAll(): void {
    forkJoin({
      hospitalizations: this.service.getAll(),
      rooms:            this.roomService.getAll()
    }).subscribe({
      next: ({ hospitalizations, rooms }) => {
        // Build id → Room lookup
        this.roomMap = new Map(rooms.map(r => [r.id, r]));

        const data = hospitalizations as any[];

        if (this.isDoctor) {
          this.hospitalizations = data;
        } else {
          this.hospitalizations = data.filter(h =>
            String(h.userId) === String(this.currentUserId)
          );
        }

        this.applyFilters();
        this.updateCriticalCount();
        this.cdr.detectChanges();
      },
      error: err => console.error('Error loading data', err)
    });
  }

  // ── Room helpers ───────────────────────────────────────────────────────

  /** Returns the Room object for a hospitalization (supports both roomId and legacy room.id) */
  getRoom(h: any): Room | null {
    const id = h.roomId ?? h.room?.id ?? null;
    if (id == null) return null;
    return this.roomMap.get(id) ?? null;
  }

  /** Returns the room number string for display */
  getRoomNumber(h: any): string {
    return this.getRoom(h)?.roomNumber ?? '—';
  }

  /** Returns the room type string for display */
  getRoomType(h: any): string {
    return this.getRoom(h)?.type ?? '';
  }

  readonly roomTypeLabels: Record<string, string> = {
    standard:  'Standard',
    intensive: 'ICU',
    isolation: 'Isolation',
    pediatric: 'Pediatric',
    maternity: 'Maternity',
  };

  // ── Filter + Sort ──────────────────────────────────────────────────────
  applyFilters(): void {
    let list = [...this.hospitalizations];

    if (this.activeFilter !== 'all') {
      list = list.filter(h => h.status === this.activeFilter);
    }

    const term = this.searchTerm?.toLowerCase().trim() || '';
    if (term) {
      list = list.filter(h =>
        this.getRoomNumber(h).toLowerCase().includes(term) ||
        (h.admissionReason || '').toLowerCase().includes(term) ||
        (h.status          || '').toLowerCase().includes(term) ||
        String(h.userId            || '').includes(term) ||
        String(h.attendingDoctorId || '').includes(term)
      );
    }

    this.filteredHospitalizations = this.sortList(list);
  }

  private sortList(list: any[]): any[] {
    return list.sort((a, b) => {
      if (this.sortField === 'date-desc')
        return new Date(b.admissionDate || 0).getTime() - new Date(a.admissionDate || 0).getTime();
      if (this.sortField === 'date-asc')
        return new Date(a.admissionDate || 0).getTime() - new Date(b.admissionDate || 0).getTime();
      if (this.sortField === 'room')
        return this.getRoomNumber(a).localeCompare(this.getRoomNumber(b));
      return 0;
    });
  }

  setFilter(status: string): void { this.activeFilter = status; this.applyFilters(); }

  clearFilters(): void {
    this.searchTerm = ''; this.activeFilter = 'all'; this.sortField = 'date-desc';
    this.applyFilters();
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  countByStatus(status: string): number {
    return this.hospitalizations.filter(h => h.status === status).length;
  }

  private updateCriticalCount(): void {
    this.criticalCount = this.hospitalizations.filter(h => this.hasCriticalVitals(h)).length;
  }

  // ── Vital sign helpers ─────────────────────────────────────────────────
  hasCriticalVitals(h: any): boolean {
    return !!(h.vitalSignsRecords?.some((vs: any) => this.isVsCritical(vs)));
  }

  isVsCritical(vs: any): boolean {
    return (
      (vs.temperature      != null && (vs.temperature > 39    || vs.temperature < 35))    ||
      (vs.heartRate        != null && (vs.heartRate > 120      || vs.heartRate < 45))      ||
      (vs.oxygenSaturation != null &&  vs.oxygenSaturation < 92)                          ||
      (vs.respiratoryRate  != null && (vs.respiratoryRate > 25 || vs.respiratoryRate < 8))
    );
  }

  getAbnormalCount(h: any): number {
    return h.vitalSignsRecords?.filter((vs: any) => this.isVsAbnormal(vs)).length ?? 0;
  }

  private isVsAbnormal(vs: any): boolean {
    return (
      (vs.temperature      != null && (vs.temperature > 38     || vs.temperature < 36))     ||
      (vs.heartRate        != null && (vs.heartRate > 100       || vs.heartRate < 60))       ||
      (vs.oxygenSaturation != null &&  vs.oxygenSaturation < 95)                             ||
      (vs.respiratoryRate  != null && (vs.respiratoryRate > 20  || vs.respiratoryRate < 12))
    );
  }

  // ── Timeline helpers ───────────────────────────────────────────────────
  getStayDuration(h: any): string {
    if (!h.admissionDate) return '—';
    const start = new Date(h.admissionDate).getTime();
    const end   = h.dischargeDate ? new Date(h.dischargeDate).getTime() : Date.now();
    const days  = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    if (days === 0) return '< 1 day';
    return days === 1 ? '1 day' : `${days} days`;
  }

  getProgressPercent(h: any): number {
    if (!h.admissionDate) return 0;
    if (!h.dischargeDate) return 100;
    const start = new Date(h.admissionDate).getTime();
    const end   = new Date(h.dischargeDate).getTime();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / total) * 100)));
  }

  getVsPosition(h: any, vs: any): number {
    if (!h.admissionDate || !vs.recordDate) return 0;
    const start  = new Date(h.admissionDate).getTime();
    const end    = h.dischargeDate ? new Date(h.dischargeDate).getTime() : Date.now();
    const vsTime = new Date(vs.recordDate).getTime();
    const total  = end - start;
    if (total <= 0) return 0;
    return Math.min(95, Math.max(5, Math.round(((vsTime - start) / total) * 100)));
  }

  scrollToFirstCritical(): void {
    const first = this.filteredHospitalizations.find(h => this.hasCriticalVitals(h));
    if (!first) return;
    document.getElementById('critical-' + first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────
  filterHospitalizations(): void { this.applyFilters(); }

  save(): void {
    const v = this.form.value;
    const payload = {
      ...v,
      admissionDate: v.admissionDate ? v.admissionDate + ':00' : null,
      dischargeDate: v.dischargeDate ? v.dischargeDate + ':00' : null
    };
    const obs = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);
    obs.subscribe({ next: () => { this.loadAll(); this.cancel(); }, error: e => console.error(e) });
  }

  edit(h: any): void {
    this.editingId = h.id;
    this.form.patchValue({
      ...h,
      admissionDate: this.formatDateForInput(h.admissionDate),
      dischargeDate: this.formatDateForInput(h.dischargeDate)
    });
  }

  delete(id?: number): void {
    if (!id || !confirm('Delete this record?')) return;
    this.service.delete(id).subscribe({ next: () => this.loadAll(), error: e => console.error(e) });
  }

  cancel(): void { this.editingId = null; this.form.reset(); }

  private formatDateForInput(date: string | null): string | null {
    return date ? date.substring(0, 16) : null;
  }
}