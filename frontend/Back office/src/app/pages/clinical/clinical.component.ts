import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakAdminService, KeycloakUser } from '../../services/keycloak-admin.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  ClinicalService,
  Consultation,
  MedicalHistory,
  TriageAssessmentRequest,
  TriageLevel,
  TriageQueueItem
} from '../../services/clinical.service';
import { TriagePopupComponent } from '../../shared/components/ui/triage-popup/triage-popup.component';

@Component({
  selector: 'app-clinical',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FullCalendarModule, TriagePopupComponent],
  templateUrl: './clinical.component.html',
  styleUrls: ['./clinical.component.css']
})
export class ClinicalComponent implements OnInit, OnDestroy {
  consultations: Consultation[] = [];
  selectedCalendarDate = this.toIsoDate(new Date());
  selectedDayConsultations: Consultation[] = [];
  selectedConsultation: Consultation | null = null;
  calendarMonthTitle = '';
  consultationCountByStatus: Record<string, number> = {};
  calendarOptions: CalendarOptions = this.buildCalendarOptions([]);
  medicalHistories: MedicalHistory[] = [];
  form: FormGroup; // medical history form
  triageForm: FormGroup;
  queueItems: TriageQueueItem[] = [];
  submittingTriage = false;
  loadingQueue = false;
  triageSuccess: string | null = null;
  triageError: string | null = null;
  readonly triageLevels: TriageLevel[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
  private queueRefreshTimer: ReturnType<typeof setInterval> | null = null;
  triagePatients: Array<{ id: number; label: string }> = [];
  loggedInPatientId: number | null = null;
  availableDoctorIds: number[] = [];
  selectedDoctorByQueueId: Record<number, number | null> = {};
  doctorUsers: KeycloakUser[] = [];
  patientUsers: KeycloakUser[] = [];
  patientSelectionItems: Array<{ id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }> = [];
  patientsLoading = false;
  patientSearch = '';
  dropdownOpen = false;
  selectedPatient: KeycloakUser | null = null;
  patientNameById: Record<number, string> = {};
  doctorNameById: Record<number, string> = {};
  private latestConsultationByPatientId: Record<number, string> = {};

  editingId: number | null = null;
  error: string | null = null;
  success: string | null = null;

  // Popup properties
  isPopupOpen = false;
  popupType: 'confirm' | 'prompt' | 'triageOverride' = 'confirm';
  popupTitle = '';
  popupMessage = '';
  popupPlaceholder = '';
  popupDefaultValue = '';
  currentTriageItem: TriageQueueItem | null = null;
  defaultTriageLevel: TriageLevel = 'GREEN';

  constructor(
    private fb: FormBuilder,
    private clinicalService: ClinicalService,
    private keycloakService: KeycloakService,
    private keycloakAdminService: KeycloakAdminService,
    private cdRef: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      userId: [null],
      diagnosis: [''],
      allergies: [''],
      chronicConditions: [''],
      familyHistory: [''],
      notes: ['']
    });

    this.triageForm = this.fb.group({
      patientId: [null, [Validators.required, Validators.min(1)]],
      arrivalTime: [this.defaultArrivalTime(), Validators.required],
      heartRate: [null, [Validators.min(60), Validators.max(220)]],
      systolicBp: [null, [Validators.min(70), Validators.max(140)]],
      spo2: [null, [Validators.min(70), Validators.max(100)]],
      painScore: [null, [Validators.min(0), Validators.max(10)]],
      age: [null, [Validators.min(0), Validators.max(15)]],
      severeComorbidity: [false],
      respiratoryDistress: [false]
    });
  }

  ngOnInit(): void {
    this.resolveLoggedInPatientFromToken();
    this.loadPatientsFromConsultations();
    this.loadKeycloakNames();
    this.loadAvailableDoctorIds();
    this.loadMedicalHistories();
    this.loadQueue();
    this.triageForm.get('patientId')?.valueChanges.subscribe((patientId) => {
      this.applyArrivalTimeFromSelectedPatient(patientId);
    });
    this.queueRefreshTimer = setInterval(() => this.loadQueue(false), 20000);
  }

  ngOnDestroy(): void {
    if (this.queueRefreshTimer) {
      clearInterval(this.queueRefreshTimer);
      this.queueRefreshTimer = null;
    }
  }

  loadMedicalHistories(): void {
    this.error = null;
    this.clinicalService.getAllMedicalHistories().subscribe({
      next: (data) => {
        this.medicalHistories = data;
      },
      error: (err) => {
        this.error = 'Failed to load medical histories: ' + err.message;
        console.error('Error loading medical histories', err);
      }
    });
  }

  submitTriageAssessment(): void {
    if (this.triageForm.invalid) {
      this.triageForm.markAllAsTouched();
      this.triageError = 'Please fill triage required fields correctly using pediatric ranges.';
      return;
    }

    this.submittingTriage = true;
    this.triageError = null;
    this.triageSuccess = null;

    const formValue = this.triageForm.value;
    const effectivePatientId = this.loggedInPatientId ?? Number(formValue.patientId);
    if (!Number.isInteger(effectivePatientId) || effectivePatientId <= 0) {
      this.submittingTriage = false;
      this.triageError = 'Unable to resolve logged-in patient ID.';
      return;
    }
    const payload: TriageAssessmentRequest = {
      patientId: effectivePatientId,
      arrivalTime: this.normalizeLocalDateTime(formValue.arrivalTime),
      heartRate: this.normalizeNumber(formValue.heartRate),
      systolicBp: this.normalizeNumber(formValue.systolicBp),
      spo2: this.normalizeNumber(formValue.spo2),
      painScore: this.normalizeNumber(formValue.painScore),
      age: this.normalizeNumber(formValue.age),
      severeComorbidity: !!formValue.severeComorbidity,
      respiratoryDistress: !!formValue.respiratoryDistress
    };

    this.clinicalService.createTriageAssessment(payload).subscribe({
      next: (res) => {
        this.submittingTriage = false;
        const sepsisSuffix = res.sepsisAlert ? ' | SEPSIS ALERT' : '';
        this.triageSuccess = `Assessment created. Queue #${res.queueItemId} | Level ${res.triageLevel} | Score ${res.score}${sepsisSuffix}`;
        this.triageForm.patchValue({
          arrivalTime: this.defaultArrivalTime(),
          heartRate: null,
          systolicBp: null,
          spo2: null,
          painScore: null,
          age: null,
          severeComorbidity: false,
          respiratoryDistress: false
        });
        this.loadQueue(false);
      },
      error: (err) => {
        this.submittingTriage = false;
        this.triageError = `Failed to create triage assessment: ${err.message}`;
      }
    });
  }

  loadPatientsFromConsultations(): void {
    this.clinicalService.getAllConsultations().subscribe({
      next: (consultations) => {
        this.consultations = [...(consultations || [])].sort(
          (a, b) => new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime()
        );
        this.refreshCalendarData();

        const ids = new Set<number>();
        const latestByPatient: Record<number, string> = {};
        (consultations || []).forEach((consultation) => {
          const id = Number(consultation.patientId);
          if (Number.isInteger(id) && id > 0) {
            ids.add(id);
            const currentLatest = latestByPatient[id];
            if (!currentLatest || new Date(consultation.consultationDate).getTime() > new Date(currentLatest).getTime()) {
              latestByPatient[id] = consultation.consultationDate;
            }
          }
        });

        this.triagePatients = Array.from(ids)
          .sort((a, b) => a - b)
          .map((id) => ({ id, label: this.getPatientLabel(id) }));
        this.latestConsultationByPatientId = latestByPatient;
        this.updatePatientSelectionItems();

        this.applyArrivalTimeFromSelectedPatient(this.triageForm.get('patientId')?.value);
      }
    });
  }

  private loadKeycloakNames(): void {
    this.loadKeycloakPatientNames();
    this.loadKeycloakDoctorNames();
  }

  private loadKeycloakPatientNames(): void {
    this.patientsLoading = true;
    this.keycloakAdminService.getUsersByRole('patient').subscribe({
      next: (users) => {
        this.patientUsers = users;
        users.forEach((user) => {
          const patientId = this.resolveNumericIdFromUser(user, ['patientId', 'userId', 'id']);
          if (patientId) {
            this.patientNameById[patientId] = KeycloakAdminService.displayName(user);
          }
        });
        this.updatePatientLabels();
        this.patientsLoading = false;
      },
      error: (err) => {
        console.warn('Unable to load Keycloak patient names', err);
        this.patientsLoading = false;
      }
    });
  }

  get filteredPatients(): Array<{ id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }> {
    const term = this.patientSearch.toLowerCase().trim();
    if (!term) return this.patientSelectionItems;
    return this.patientSelectionItems.filter((item) =>
      item.displayName.toLowerCase().includes(term) ||
      (item.email || '').toLowerCase().includes(term) ||
      (item.username || '').toLowerCase().includes(term)
    );
  }

  private loadKeycloakDoctorNames(): void {
    this.keycloakAdminService.getUsersByRole('doctor').subscribe({
      next: (users) => {
        this.doctorUsers = users;
        const keycloakDoctorIds = new Set<number>();
        users.forEach((user) => {
          const doctorId = this.resolveNumericIdFromUser(user, ['doctorId', 'userId', 'id']);
          if (doctorId) {
            this.doctorNameById[doctorId] = KeycloakAdminService.displayName(user);
            keycloakDoctorIds.add(doctorId);
          }
        });
        this.mergeAvailableDoctorIds(keycloakDoctorIds);
      },
      error: (err) => {
        console.warn('Unable to load Keycloak doctor names', err);
      }
    });
  }

  private updatePatientLabels(): void {
    this.triagePatients = this.triagePatients.map((patient) => ({
      id: patient.id,
      label: this.getPatientLabel(patient.id)
    }));
    this.updatePatientSelectionItems();
  }

  private updatePatientSelectionItems(): void {
    const patientById = new Map<number, KeycloakUser>();
    this.patientUsers.forEach((user) => {
      const patientId = this.resolveNumericIdFromUser(user, ['patientId', 'userId', 'id']);
      if (patientId) {
        patientById.set(patientId, user);
      }
    });

    const items = this.triagePatients.map((patient) => {
      const user = patientById.get(patient.id);
      return {
        id: patient.id,
        displayName: this.patientNameById[patient.id] || patient.label,
        email: user?.email,
        username: user?.username || '',
        user
      };
    });

    patientById.forEach((user, id) => {
      if (!items.some((item) => item.id === id)) {
        items.push({
          id,
          displayName: KeycloakAdminService.displayName(user),
          email: user.email,
          username: user.username,
          user
        });
      }
    });

    this.patientSelectionItems = items;
  }

  public resolveNumericIdFromUser(user: KeycloakUser, keys: string[]): number | null {
    for (const key of keys) {
      const candidate = this.getUserAttributeValue(user, key) ?? (user as any)[key];
      const parsed = this.parsePositiveId(candidate);
      if (parsed != null) {
        return parsed;
      }
    }

    const fallbackCandidates = [
      user.username,
      user.email,
      user.id,
      user.attributes
    ];

    for (const candidate of fallbackCandidates) {
      const parsed = this.parsePositiveId(candidate);
      if (parsed != null) {
        return parsed;
      }
    }

    return null;
  }

  private getUserAttributeValue(user: KeycloakUser, attributeName: string): string | undefined {
    return user.attributes?.[attributeName]?.[0];
  }

  private parsePositiveId(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value > 0 ? value : null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = this.parsePositiveId(item);
        if (parsed != null) {
          return parsed;
        }
      }
      return null;
    }

    if (value && typeof value === 'object') {
      for (const nestedValue of Object.values(value as Record<string, unknown>)) {
        const parsed = this.parsePositiveId(nestedValue);
        if (parsed != null) {
          return parsed;
        }
      }
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const direct = Number(trimmed);
    if (Number.isInteger(direct) && direct > 0) {
      return direct;
    }

    const match = trimmed.match(/\d+/);
    if (!match) {
      return null;
    }

    const extracted = Number(match[0]);
    return Number.isInteger(extracted) && extracted > 0 ? extracted : null;
  }

  public getUserLabel(user: KeycloakUser): string {
    return KeycloakAdminService.displayName(user);
  }

  public onPatientSelected(item: { id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }): void {
    this.selectedPatient = item.user ?? null;
    this.patientSearch = item.displayName;
    this.dropdownOpen = false;
    this.triageForm.patchValue({ patientId: item.id });
  }

  public getPatientInitials(item: { displayName: string } | KeycloakUser): string {
    const full = 'displayName' in item ? item.displayName : KeycloakAdminService.displayName(item);
    const parts = full.split(' ').filter(Boolean);
    if (!parts.length) {
      const fallback = 'displayName' in item ? item.displayName : item.username;
      return fallback.slice(0, 2).toUpperCase();
    }
    return parts.map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  }

  public getUserInitials(user: KeycloakUser): string {
    const full = KeycloakAdminService.displayName(user);
    const parts = full.split(' ').filter(Boolean);
    if (!parts.length) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return parts.map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  }

  public onPatientSearchBlur(): void {
    setTimeout(() => {
      this.dropdownOpen = false;
    }, 150);
  }

  public getPatientLabel(patientId: number | null | undefined): string {
    if (patientId == null) {
      return 'Unknown patient';
    }
    const name = this.patientNameById[patientId];
    return name || 'Unknown patient';
  }

  public getDoctorLabel(doctorId: number | null | undefined): string {
    if (doctorId == null) {
      return 'Unknown doctor';
    }
    const name = this.doctorNameById[doctorId];
    return name ? `Dr ${name}` : 'Unknown doctor';
  }

  onDateClick(arg: any): void {
    this.selectedCalendarDate = arg.dateStr;
    this.updateSelectedDayConsultations();
    this.selectedConsultation = null;
  }

  onCalendarEventClick(arg: EventClickArg): void {
    const consultationId = Number(arg.event.id);
    const found = this.consultations.find((item) => item.id === consultationId) ?? null;
    this.selectedConsultation = found;
    if (found) {
      this.selectedCalendarDate = this.toIsoDate(new Date(found.consultationDate));
      this.updateSelectedDayConsultations();
    }
  }

  onCalendarDatesSet(arg: any): void {
    setTimeout(() => {
      this.calendarMonthTitle = arg?.view?.title || '';
      this.cdRef.markForCheck();
    });
  }

  loadAvailableDoctorIds(): void {
    this.clinicalService.getAvailableDoctorIds().subscribe({
      next: (ids) => {
        const backendDoctorIds = (ids || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
          .sort((a, b) => a - b);

        this.mergeAvailableDoctorIds(backendDoctorIds);
      }
    });
  }

  private mergeAvailableDoctorIds(ids: Iterable<number>): void {
    const merged = new Set<number>(this.availableDoctorIds);
    for (const id of ids) {
      if (Number.isInteger(id) && id > 0) {
        merged.add(id);
      }
    }

    this.availableDoctorIds = Array.from(merged).sort((a, b) => a - b);
    this.queueItems.forEach((item) => {
      if (this.selectedDoctorByQueueId[item.queueItemId] == null) {
        this.selectedDoctorByQueueId[item.queueItemId] = item.assignedDoctorId ?? this.availableDoctorIds[0] ?? null;
      }
    });
  }

  loadQueue(showLoader = true): void {
    if (showLoader) {
      this.loadingQueue = true;
    }

    this.clinicalService.getTriageQueue().subscribe({
      next: (items) => {
        this.queueItems = items;
        items.forEach((item) => {
          this.selectedDoctorByQueueId[item.queueItemId] = item.assignedDoctorId ?? this.selectedDoctorByQueueId[item.queueItemId] ?? this.availableDoctorIds[0] ?? null;
        });
        this.loadingQueue = false;
      },
      error: (err) => {
        this.loadingQueue = false;
        this.triageError = `Failed to load triage queue: ${err.message}`;
      }
    });
  }

  startCare(item: TriageQueueItem): void {
    this.triageError = null;
    const selectedDoctorId = Number(this.selectedDoctorByQueueId[item.queueItemId]);
    const payload = Number.isInteger(selectedDoctorId) && selectedDoctorId > 0
      ? { doctorId: selectedDoctorId }
      : {};
    const doctorLabel = payload.doctorId ? this.getDoctorLabel(payload.doctorId) : 'Auto-assign from available doctors';

    this.currentTriageItem = item;
    this.popupType = 'confirm';
    this.popupTitle = 'Start Care';
    this.popupMessage = `Start triage for ${this.getPatientLabel(item.patientId)}?\nDoctor: ${doctorLabel}\nQueue #${item.queueItemId}`;
    this.isPopupOpen = true;
  }

  onStartCareConfirm(confirmed: boolean): void {
    if (!confirmed || !this.currentTriageItem) {
      this.currentTriageItem = null;
      return;
    }

    const item = this.currentTriageItem;
    const selectedDoctorId = Number(this.selectedDoctorByQueueId[item.queueItemId]);
    const payload = Number.isInteger(selectedDoctorId) && selectedDoctorId > 0
      ? { doctorId: selectedDoctorId }
      : {};

    this.clinicalService.startCare(item.queueItemId, payload).subscribe({
      next: (updatedItem) => {
        this.triageSuccess = `Queue #${item.queueItemId} started by ${this.getDoctorLabel(updatedItem.assignedDoctorId)}.`;
        this.loadQueue(false);
        this.currentTriageItem = null;
      },
      error: (err) => {
        this.triageError = `Start care failed: ${err.message}`;
        this.currentTriageItem = null;
      }
    });
  }

  closeQueueItem(item: TriageQueueItem): void {
    this.currentTriageItem = item;
    this.popupType = 'confirm';
    this.popupTitle = 'Close Queue Item';
    this.popupMessage = `Are you sure you want to close queue item #${item.queueItemId}?`;
    this.isPopupOpen = true;
  }

  onCloseQueueItemConfirm(confirmed: boolean): void {
    if (!confirmed || !this.currentTriageItem) {
      this.currentTriageItem = null;
      return;
    }

    const item = this.currentTriageItem;
    this.triageError = null;
    this.clinicalService.closeQueueItem(item.queueItemId).subscribe({
      next: () => {
        this.triageSuccess = `Queue #${item.queueItemId} marked as completed.`;
        this.loadQueue(false);
        this.currentTriageItem = null;
      },
      error: (err) => {
        this.triageError = `Close queue item failed: ${err.message}`;
        this.currentTriageItem = null;
      }
    });
  }

  overrideQueueItem(item: TriageQueueItem): void {
    this.currentTriageItem = item;
    this.popupType = 'triageOverride';
    this.popupTitle = `Override Triage Level for Queue #${item.queueItemId}`;
    this.popupMessage = `Patient: ${this.getPatientLabel(item.patientId)}`;
    this.defaultTriageLevel = item.triageLevel;
    this.isPopupOpen = true;
  }

  onTriageOverride(overrideData: {
    triageLevel: TriageLevel;
    maxWaitMinutes: number | null;
    overrideReason: string;
  }): void {
    if (!this.currentTriageItem) {
      return;
    }

    const item = this.currentTriageItem;
    this.triageError = null;
    
    this.clinicalService.overrideQueueItem(item.queueItemId, {
      triageLevel: overrideData.triageLevel,
      maxWaitMinutes: overrideData.maxWaitMinutes,
      overrideReason: overrideData.overrideReason
    }).subscribe({
      next: () => {
        this.triageSuccess = `Queue #${item.queueItemId} overridden to ${overrideData.triageLevel}.`;
        this.loadQueue(false);
        this.currentTriageItem = null;
      },
      error: (err) => {
        this.triageError = `Override failed: ${err.message}`;
        this.currentTriageItem = null;
      }
    });
  }

  canStart(item: TriageQueueItem): boolean {
    return item.status === 'WAITING' || item.status === 'IN_PROGRESS';
  }

  canClose(item: TriageQueueItem): boolean {
    return item.status === 'WAITING' || item.status === 'IN_PROGRESS';
  }

  canOverride(item: TriageQueueItem): boolean {
    return item.status === 'WAITING' || item.status === 'IN_PROGRESS';
  }

  levelClass(level: TriageLevel): string {
    switch (level) {
      case 'RED':
        return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
      case 'ORANGE':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300';
      case 'GREEN':
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400';
    }
  }

  getVitalLevel(
    fieldName: 'heartRate' | 'systolicBp' | 'spo2' | 'painScore'
  ): 'Low' | 'Medium' | 'High' | null {
    const rawValue = this.triageForm.get(fieldName)?.value;
    const value = this.normalizeNumber(rawValue);
    if (value == null) {
      return null;
    }

    switch (fieldName) {
      case 'heartRate':
        if (value < 80) {
          return 'Low';
        }
        if (value <= 140) {
          return 'Medium';
        }
        return 'High';
      case 'systolicBp':
        if (value < 90) {
          return 'Low';
        }
        if (value <= 110) {
          return 'Medium';
        }
        return 'High';
      case 'spo2':
        if (value < 95) {
          return 'Low';
        }
        if (value <= 100) {
          return 'Medium';
        }
        return 'High';
      case 'painScore':
        if (value <= 3) {
          return 'Low';
        }
        if (value <= 6) {
          return 'Medium';
        }
        return 'High';
      default:
        return null;
    }
  }

  getVitalLevelClass(level: 'Low' | 'Medium' | 'High' | null): string {
    switch (level) {
      case 'Low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
      case 'Medium':
        return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300';
      case 'High':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300';
    }
  }

  slaClass(deadlineAt: string, status: string): string {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      return 'text-slate-500 dark:text-slate-400';
    }

    const minutes = this.minutesToDeadline(deadlineAt);
    if (minutes < 0) {
      return 'text-red-600 dark:text-red-400 font-semibold';
    }
    if (minutes <= 10) {
      return 'text-orange-600 dark:text-orange-400 font-semibold';
    }
    return 'text-green-600 dark:text-green-400';
  }

  minutesToDeadline(deadlineAt: string): number {
    const now = Date.now();
    const deadline = new Date(deadlineAt).getTime();
    return Math.floor((deadline - now) / 60000);
  }

  formatTime(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString();
  }

  getStatusBadgeClass(status: string | null | undefined): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
      case 'NO_SHOW':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300';
    }
  }

  saveMedicalHistory(): void {
    if (this.editingId == null) {
      this.error = 'Creation is available in Front Office. Use Edit here to update existing records.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please fill in all required fields';
      return;
    }

    this.error = null;
    this.success = null;

    const formValue = this.form.value;
    const medicalHistory: MedicalHistory = {
      userId: this.editingId 
        ? (this.medicalHistories.find(m => m.id === this.editingId)?.userId || Number(formValue.userId)) 
        : Number(formValue.userId),
      diagnosis: formValue.diagnosis || '',
      allergies: formValue.allergies || '',
      chronicConditions: formValue.chronicConditions || '',
      familyHistory: formValue.familyHistory || '',
      notes: formValue.notes || ''
    };

    this.clinicalService.updateMedicalHistory(this.editingId, medicalHistory).subscribe({
      next: () => {
        this.success = 'Medical history updated successfully!';
        this.loadMedicalHistories();
        this.cancelEdit();
        setTimeout(() => this.success = null, 3000);
      },
      error: (err) => {
        this.error = 'Error updating medical history: ' + err.message;
        console.error('Error updating medical history', err);
      }
    });
  }

  editMedicalHistory(medicalHistory: MedicalHistory): void {
    this.error = null;
    this.success = null;
    this.editingId = medicalHistory.id ?? null;
    this.form.patchValue({
      userId: medicalHistory.userId,
      diagnosis: medicalHistory.diagnosis || '',
      allergies: medicalHistory.allergies || '',
      chronicConditions: medicalHistory.chronicConditions || '',
      familyHistory: medicalHistory.familyHistory || '',
      notes: medicalHistory.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMedicalHistory(id: number | undefined): void {
    if (id == null) {
      return;
    }

    if (!confirm('Are you sure you want to delete this medical history?')) {
      return;
    }

    this.error = null;
    this.clinicalService.deleteMedicalHistory(id).subscribe({
      next: () => {
        this.success = 'Medical history deleted successfully!';
        this.loadMedicalHistories();
        setTimeout(() => this.success = null, 3000);
      },
      error: (err) => {
        this.error = 'Error deleting medical history: ' + err.message;
        console.error('Error deleting medical history', err);
      }
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset();
    this.error = null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private defaultArrivalTime(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  private normalizeLocalDateTime(value: string): string {
    if (!value) {
      return value;
    }
    return value.length === 16 ? `${value}:00` : value;
  }

  private applyArrivalTimeFromSelectedPatient(patientId: unknown): void {
    const numericId = Number(patientId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return;
    }

    const fromConsultation = this.latestConsultationByPatientId[numericId];
    const arrivalTime = this.toDateTimeLocal(fromConsultation);
    if (!arrivalTime) {
      this.triageError = null;
      this.triageForm.patchValue({ arrivalTime: this.defaultArrivalTime() }, { emitEvent: false });
      return;
    }

    this.triageError = null;
    this.triageForm.patchValue({ arrivalTime }, { emitEvent: false });
  }

  private toDateTimeLocal(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private resolveLoggedInPatientFromToken(): void {
    const token: any = this.keycloakService.getKeycloakInstance()?.tokenParsed;
    if (!token) {
      return;
    }

    const candidates = [
      token['patientId'],
      token['patient_id'],
      token['userId'],
      token['user_id'],
      token['id'],
      token['preferred_username'],
      token['sub']
    ];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed > 0) {
        this.loggedInPatientId = parsed;
        this.triageForm.patchValue({ patientId: parsed });
        return;
      }
    }
  }

  private refreshCalendarData(): void {
    const events: EventInput[] = this.consultations.map((consultation) => ({
      id: consultation.id?.toString(),
      title: `${this.getPatientLabel(consultation.patientId)} • ${this.getDoctorLabel(consultation.doctorId)}`,
      start: consultation.consultationDate,
      end: consultation.followUpDate || undefined,
      backgroundColor: this.getStatusColor(consultation.status),
      borderColor: this.getStatusColor(consultation.status),
      extendedProps: { status: consultation.status }
    }));

    this.consultationCountByStatus = this.consultations.reduce<Record<string, number>>((acc, c) => {
      const key = (c.status || 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    this.calendarOptions = this.buildCalendarOptions(events);
    this.updateSelectedDayConsultations();
  }

  private updateSelectedDayConsultations(): void {
    const day = this.selectedCalendarDate;
    this.selectedDayConsultations = this.consultations
      .filter((c) => this.toIsoDate(new Date(c.consultationDate)) === day)
      .sort((a, b) => new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime());
  }

  private buildCalendarOptions(events: EventInput[]): CalendarOptions {
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      buttonText: {
        today: 'Today',
        month: 'Month',
        week: 'Week'
      },
      weekends: true,
      height: 'auto',
      dayMaxEvents: 3,
      events,
      dateClick: (arg) => this.onDateClick(arg),
      eventClick: (arg) => this.onCalendarEventClick(arg),
      datesSet: (arg) => this.onCalendarDatesSet(arg)
    };
  }

  private getStatusColor(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return '#2563EB';
      case 'IN_PROGRESS':
        return '#F59E0B';
      case 'COMPLETED':
        return '#16A34A';
      case 'CANCELLED':
        return '#DC2626';
      case 'NO_SHOW':
        return '#64748B';
      default:
        return '#475569';
    }
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Popup methods
  handlePopupClose(): void {
    this.isPopupOpen = false;
    this.currentTriageItem = null;
  }

  handlePopupConfirm(confirmed: boolean): void {
    if (this.popupType === 'confirm') {
      if (this.popupTitle === 'Start Care') {
        this.onStartCareConfirm(confirmed);
      } else if (this.popupTitle === 'Close Queue Item') {
        this.onCloseQueueItemConfirm(confirmed);
      }
    }
  }

  handleTriageOverride(overrideData: {
    triageLevel: TriageLevel;
    maxWaitMinutes: number | null;
    overrideReason: string;
  }): void {
    this.onTriageOverride(overrideData);
  }
}
