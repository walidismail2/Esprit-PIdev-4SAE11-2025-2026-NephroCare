import { Component, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { HospitalizationService, HospitalizationPayload } from '../../../services/hospitalization.service';
import { RoomService, Room } from '../../../services/Room.service';
import { KeycloakAdminService, KeycloakUser } from '../../../services/keycloak-admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

// ── Cross-field validator: discharge must be after admission ──────────────────
function dischargeDateValidator(group: AbstractControl): ValidationErrors | null {
  const admission = group.get('admissionDate')?.value;
  const discharge = group.get('dischargeDate')?.value;
  if (admission && discharge && new Date(discharge) <= new Date(admission)) {
    return { dischargeDateBeforeAdmission: true };
  }
  return null;
}

// ── Custom blood-pressure format validator ────────────────────────────────────
function bloodPressureValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val) return null;
  return /^\d{2,3}\/\d{2,3}$/.test(val) ? null : { bloodPressureFormat: true };
}

@Component({
  selector: 'app-hospitalization',
  templateUrl: './hospitalization.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  styleUrls: ['./hospitalization.component.css']
})
export class HospitalizationComponent implements OnInit {

  // ── Hospitalizations state ─────────────────────────────────────────────
  hospitalizations: any[]         = [];
  filteredHospitalizations: any[] = [];
  form!: FormGroup;
  editingId: number | null        = null;
  searchTerm: string              = '';
  todayIso = new Date().toISOString().slice(0, 16);

  // ── Keycloak current user ──────────────────────────────────────────────
  currentUserId:   string = '';
  currentUserName: string = '';
  currentUserRole: string = '';

  get isDoctor():  boolean { return this.currentUserRole === 'doctor'; }
  get isPatient(): boolean { return this.currentUserRole === 'patient'; }
  get isNurse():   boolean { return this.currentUserRole === 'nurse'; }
  get isAdmin():   boolean { return this.currentUserRole === 'admin'; }

  get canCreate(): boolean { return !this.isNurse; }
  get canDelete(): boolean { return !this.isNurse; }

  get formVisible(): boolean {
    if (this.isNurse) return this.editingId !== null;
    return true;
  }

  // ── Rooms (shared by hospitalization picker AND rooms CRUD) ───────────
  availableRooms: Room[] = [];
  allRooms:       Room[] = [];
  loadingRooms    = false;
  selectedRoom:   Room | null = null;

  readonly roomTypeLabels: Record<string, string> = {
    standard:  'Standard',
    intensive: 'ICU',
    isolation: 'Isolation',
    pediatric: 'Pediatric',
    maternity: 'Maternity',
  };

  readonly roomTypeColors: Record<string, string> = {
    standard:  'bg-blue-100 text-blue-700',
    intensive: 'bg-red-100 text-red-700',
    isolation: 'bg-amber-100 text-amber-700',
    pediatric: 'bg-pink-100 text-pink-700',
    maternity: 'bg-purple-100 text-purple-700',
  };

  // ── Rooms CRUD state ───────────────────────────────────────────────────
  roomForm!:        FormGroup;
  editingRoomId:    number | null = null;
  roomFormVisible:  boolean       = false;
  filteredRooms:    Room[]        = [];
  roomSearchTerm:   string        = '';
  roomTypeFilter:   string        = '';

  // ── Patients ───────────────────────────────────────────────────────────
  patientUsers:    KeycloakUser[] = [];
  patientsLoading  = false;
  patientSearch    = '';
  dropdownOpen     = false;
  selectedPatient: KeycloakUser | null = null;

  get filteredPatients(): KeycloakUser[] {
    const term = this.patientSearch.toLowerCase().trim();
    if (!term) return this.patientUsers;
    return this.patientUsers.filter(u =>
      KeycloakAdminService.displayName(u).toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term)
    );
  }

  private patientNameCache: Map<string, string> = new Map();
  private doctorNameCache = new Map<string, string>();

  private readonly NURSE_LOCKED_FIELDS = [
    'admissionDate', 'dischargeDate', 'roomId',
    'admissionReason', 'status', 'userId', 'attendingDoctorId'
  ];

  constructor(
    private service:         HospitalizationService,
    private roomService:     RoomService,
    private adminService:    KeycloakAdminService,
    private fb:              FormBuilder,
    private keycloakService: KeycloakService
  ) {}

  ngOnInit(): void {
    this.loadKeycloakUser();
    this.initForm();
    this.initRoomForm();
    this.loadAll();
    this.loadPatients();
    this.loadRooms();
  }

  // ══════════════════════════════════════════════
  //  KEYCLOAK
  // ══════════════════════════════════════════════
  private loadKeycloakUser(): void {
    const token: any = this.keycloakService.getKeycloakInstance().tokenParsed;
    if (!token) return;
    this.currentUserId   = token['sub'] || '';
    this.currentUserName = this.buildName(token);
    const realmRoles: string[]  = token['realm_access']?.roles || [];
    const clientAccess: any     = token['resource_access'] || {};
    const clientRoles: string[] = Object.values(clientAccess).flatMap((c: any) => c?.roles || []);
    const allRoles = [...realmRoles, ...clientRoles].map((r: string) => r.toLowerCase());
    const ROLE_PRIORITY = ['admin', 'doctor', 'nurse', 'patient'];
    this.currentUserRole = ROLE_PRIORITY.find(r => allRoles.includes(r)) || '';
  }

  private buildName(token: any): string {
    const first = token['given_name']  || '';
    const last  = token['family_name'] || '';
    return `${first} ${last}`.trim() || token['preferred_username'] || 'Unknown';
  }

  // ══════════════════════════════════════════════
  //  ROOMS – SHARED LOADER
  // ══════════════════════════════════════════════
  loadRooms(): void {
    this.loadingRooms = true;
    this.roomService.getAll().subscribe({
      next: rooms => {
        this.allRooms       = rooms;
        this.availableRooms = rooms.filter(r => r.available);
        this.loadingRooms   = false;
        this.filterRooms();            // sync the rooms table view
      },
      error: () => { this.loadingRooms = false; }
    });
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.form.get('roomId')?.setValue(room.id);
  }

  occupancyPercent(room: Room): number {
    return Math.round((room.currentOccupancy / room.capacity) * 100);
  }

  // ══════════════════════════════════════════════
  //  ROOMS CRUD
  // ══════════════════════════════════════════════

  /** Initialise (or reset) the room reactive form. */
  private initRoomForm(room?: Room): void {
    this.roomForm = this.fb.group({
      roomNumber:  [room?.roomNumber  || '', [Validators.required, Validators.maxLength(20)]],
      type:        [room?.type        || '', Validators.required],
      capacity:    [room?.capacity    ?? null, [Validators.required, Validators.min(1), Validators.max(10)]],
      description: [room?.description || '', Validators.maxLength(255)],
    });
  }

  /** Open the add-room form (blank). */
  showRoomForm(): void {
    this.editingRoomId  = null;
    this.roomFormVisible = true;
    this.initRoomForm();
    // Scroll the form into view smoothly
    setTimeout(() => {
      document.querySelector('[formGroup="roomForm"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /** Open the edit-room form pre-filled. */
  editRoom(room: Room): void {
    this.editingRoomId   = room.id;
    this.roomFormVisible = true;
    this.initRoomForm(room);
    // Scroll to the form
    setTimeout(() => {
      const el = document.getElementById('room-form-card');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /** Submit the room form (create or update). */
  saveRoom(): void {
    this.roomForm.markAllAsTouched();
    if (this.roomForm.invalid) return;

    const payload: Partial<Room> = this.roomForm.getRawValue();

    const obs = this.editingRoomId
      ? this.roomService.update(this.editingRoomId, payload)
      : this.roomService.create(payload);

    obs.subscribe({
      next: () => {
        this.loadRooms();    // refresh both the picker and the table
        this.cancelRoom();
      },
      error: (err: any) => {
        console.error('Room save error:', err?.error ?? err);
        // Surface the backend duplicate-number message if present
        const msg: string = err?.error?.message || err?.error?.error || '';
        if (msg.toLowerCase().includes('already exists')) {
          this.roomForm.get('roomNumber')?.setErrors({ duplicate: true });
        }
      }
    });
  }

  /** Delete a room (backend guards against occupied rooms). */
  deleteRoom(id: number): void {
    if (!confirm('Delete this room? This cannot be undone.')) return;
    this.roomService.delete(id).subscribe({
      next: () => this.loadRooms(),
      error: (err: any) => {
        const msg: string = err?.error?.message || err?.error?.error || 'Cannot delete this room.';
        alert(msg);
      }
    });
  }

  /** Cancel / close the room form. */
  cancelRoom(): void {
    this.roomFormVisible = false;
    this.editingRoomId   = null;
    this.roomForm.reset();
  }

  /** Filter the displayed rooms by search term and/or type. */
  filterRooms(): void {
    const term = this.roomSearchTerm?.toLowerCase() || '';
    const type = this.roomTypeFilter || '';
    this.filteredRooms = this.allRooms.filter(r =>
      (!term || r.roomNumber.toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term)) &&
      (!type || r.type === type)
    );
  }

  /** Helper: was a room-form field touched with a specific error? */
  roomFieldError(field: string, error: string): boolean {
    const ctrl = this.roomForm.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  // ══════════════════════════════════════════════
  //  PATIENTS
  // ══════════════════════════════════════════════
  loadPatients(): void {
    this.patientsLoading = true;
    this.adminService.getUsersByRole('patient').subscribe({
      next: users => {
        this.patientUsers    = users;
        this.patientsLoading = false;
        users.forEach(u => this.patientNameCache.set(u.id, KeycloakAdminService.displayName(u)));
      },
      error: () => {
        this.patientsLoading = false;
        this.buildPatientCacheFromHospitalizations();
      }
    });
  }

  private buildPatientCacheFromHospitalizations(): void {
    this.hospitalizations.forEach(h => {
      if (!h.userId) return;
      const name =
        (h.patientFirstName && h.patientLastName
          ? `${h.patientFirstName} ${h.patientLastName}`.trim() : null) ||
        h.patientName || h.patientFullName || h.userName || null;
      if (name) this.patientNameCache.set(h.userId, name);
    });
  }

  private resolveDoctorNames(): void {
  const uniqueIds = [...new Set(
    this.hospitalizations
      .map(h => h.attendingDoctorId)
      .filter(Boolean)
  )];
  uniqueIds.forEach(id => {
    if (this.doctorNameCache.has(id)) return; // already resolved
    this.adminService.getUserById(id).subscribe(user => {
      this.doctorNameCache.set(id, KeycloakAdminService.displayName(user));
    });
  });
}

getDoctorDisplayName(id: string): string {
  if (!id) return '—';
  if (id === this.currentUserId) return this.currentUserName; // self — no API call needed
  return this.doctorNameCache.get(id) ?? `Dr. ${id.slice(0, 8)}…`; // fallback while loading
}

  openDropdown(): void {
    if (this.isNurse) return;
    this.dropdownOpen  = true;
    this.patientSearch = '';
  }

  selectPatient(user: KeycloakUser): void {
    this.selectedPatient = user;
    this.form.get('userId')?.setValue(user.id);
    this.dropdownOpen  = false;
    this.patientSearch = '';
  }

  clearPatient(): void {
    if (this.isNurse) return;
    this.selectedPatient = null;
    this.form.get('userId')?.setValue('');
  }

  patientDisplayName(user: KeycloakUser): string {
    return KeycloakAdminService.displayName(user);
  }

  getInitials(user: KeycloakUser | null): string {
    if (!user) return '?';
    const name = KeycloakAdminService.displayName(user);
    return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  // ══════════════════════════════════════════════
  //  HOSPITALIZATION FORM
  // ══════════════════════════════════════════════
  private initForm(): void {
    this.form = this.fb.group(
      {
        admissionDate:     ['', Validators.required],
        dischargeDate:     [''],
        roomId:            [null, Validators.required],
        admissionReason:   ['', [Validators.required, Validators.maxLength(255)]],
        status:            ['', Validators.required],
        userId:            ['', Validators.required],
        attendingDoctorId: [{ value: this.currentUserId, disabled: false }, Validators.required],
        vitalSignsRecords: this.fb.array([])
      },
      { validators: dischargeDateValidator }
    );
  }

  private applyRolePermissions(): void {
    if (this.isNurse) {
      this.NURSE_LOCKED_FIELDS.forEach(f => this.form.get(f)?.disable());
    } else {
      this.NURSE_LOCKED_FIELDS.forEach(f => this.form.get(f)?.enable());
    }
  }

  // ══════════════════════════════════════════════
  //  VITAL SIGNS
  // ══════════════════════════════════════════════
  get vitalSigns(): FormArray {
    return this.form.get('vitalSignsRecords') as FormArray;
  }

  createVitalSignGroup(vs?: any): FormGroup {
    return this.fb.group({
      recordDate:       [vs?.recordDate       || '', Validators.required],
      temperature:      [vs?.temperature      || '', [Validators.required, Validators.min(30), Validators.max(45)]],
      bloodPressure:    [vs?.bloodPressure    || '', [Validators.required, bloodPressureValidator]],
      heartRate:        [vs?.heartRate        || '', [Validators.required, Validators.min(20), Validators.max(300)]],
      respiratoryRate:  [vs?.respiratoryRate  || '', [Validators.required, Validators.min(1),  Validators.max(100)]],
      oxygenSaturation: [vs?.oxygenSaturation || '', [Validators.required, Validators.min(0),  Validators.max(100)]],
      notes:            [vs?.notes            || '', Validators.maxLength(255)],
      recordedBy:       [{ value: vs?.recordedBy || this.currentUserName, disabled: true }]
    });
  }

  addVitalSign(vs?: any): void       { this.vitalSigns.push(this.createVitalSignGroup(vs)); }
  removeVitalSign(i: number): void   { this.vitalSigns.removeAt(i); }

  vsField(i: number, field: string): AbstractControl | null {
    return this.vitalSigns.at(i).get(field);
  }
  vsHasError(i: number, field: string, error: string): boolean {
    const ctrl = this.vsField(i, field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  // ══════════════════════════════════════════════
  //  HOSPITALIZATION CRUD
  // ══════════════════════════════════════════════
  loadAll(): void {
    this.service.getAll().subscribe({
      next: (data: any[]) => {
        this.hospitalizations = data || [];
        this.filterHospitalizations();
        this.buildPatientCacheFromHospitalizations();
        this.resolveDoctorNames(); // ← add this
      },
      error: err => console.error('Error loading hospitalizations', err)
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();

    const payload: HospitalizationPayload = {
      admissionDate:     raw.admissionDate ? raw.admissionDate + ':00' : '',
      dischargeDate:     raw.dischargeDate ? raw.dischargeDate + ':00' : null,
      room:              { id: raw.roomId },
      admissionReason:   raw.admissionReason,
      status:            raw.status,
      userId:            raw.userId,
      attendingDoctorId: raw.attendingDoctorId,
      vitalSignsRecords: raw.vitalSignsRecords,
    };

    const obs = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => { this.loadAll(); this.cancel(); },
      error: err => console.error('Save error:', err?.error ?? err)
    });
  }

  edit(h: any): void {
    this.editingId = h.id;

    const roomId = h.room?.id ?? null;
    this.selectedRoom    = roomId ? (this.allRooms.find(r => r.id === roomId) ?? null) : null;
    this.selectedPatient = this.patientUsers.find(u => u.id === h.userId) || null;

    this.form.patchValue({
      admissionDate:     this.formatDateForInput(h.admissionDate),
      dischargeDate:     this.formatDateForInput(h.dischargeDate),
      roomId:            roomId,
      admissionReason:   h.admissionReason,
      status:            h.status?.toLowerCase(),
      userId:            h.userId,
      attendingDoctorId: h.attendingDoctorId || this.currentUserId,
    });

    this.vitalSigns.clear();
    (h.vitalSignsRecords || []).forEach((vs: any) => this.addVitalSign(vs));

    this.applyRolePermissions();
  }

  delete(id?: number): void {
    if (!id || this.isNurse) return;
    if (!confirm('Delete this hospitalization record?')) return;
    this.service.delete(id).subscribe({
      next: () => this.loadAll(),
      error: err => console.error('Error deleting', err)
    });
  }

  cancel(): void {
    this.editingId       = null;
    this.selectedPatient = null;
    this.selectedRoom    = null;
    this.form.reset();
    this.form.get('attendingDoctorId')?.setValue(this.currentUserId);
    this.vitalSigns.clear();
    this.NURSE_LOCKED_FIELDS.forEach(f => this.form.get(f)?.enable());
    this.loadRooms(); // refresh availability after any changes
  }

  filterHospitalizations(): void {
    const term = this.searchTerm?.toLowerCase() || '';
    this.filteredHospitalizations = this.hospitalizations.filter(h =>
      !term ||
      (h.room?.roomNumber     || '').toLowerCase().includes(term) ||
      (h.admissionReason      || '').toLowerCase().includes(term) ||
      (h.status               || '').toLowerCase().includes(term) ||
      String(h.userId         || '').toLowerCase().includes(term) ||
      String(h.attendingDoctorId || '').includes(term)
    );
  }

  // ── Display helpers ────────────────────────────────────────────────────
  getPatientDisplayName(userId: string): string {
    if (!userId) return '—';
    const found = this.patientUsers.find(u => u.id === userId);
    if (found) return KeycloakAdminService.displayName(found);
    if (this.patientNameCache.has(userId)) return this.patientNameCache.get(userId)!;
    return this.patientsLoading ? 'Loading…' : `Patient #${userId.slice(0, 8)}`;
  }

  getPatientInitials(userId: string): string {
    const name = this.getPatientDisplayName(userId);
    if (!name || name.startsWith('Patient #') || name === 'Loading…') return '?';
    return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  get currentUserTitle(): string {
    if (this.isNurse)  return 'Nurse';
    if (this.isDoctor) return 'Dr.';
    return '';
  }

  private formatDateForInput(date: string | null): string | null {
    return date ? date.substring(0, 16) : null;
  }

  get f() { return this.form.controls; }

  fieldError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  get crossFieldError(): boolean {
    return !!(
      this.form.hasError('dischargeDateBeforeAdmission') &&
      (this.form.get('dischargeDate')?.dirty || this.form.get('dischargeDate')?.touched)
    );
  }
}