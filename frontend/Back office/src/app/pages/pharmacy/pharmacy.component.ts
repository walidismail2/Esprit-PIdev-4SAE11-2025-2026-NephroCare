import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PharmacyService, Medication } from '../../services/pharmacy.service';
import { PrescriptionService, Prescription, PrescriptionStatus } from '../../services/prescription.service';
import { StockService, StockMovement, StockStats, StockUpdateRequest } from '../../services/stock.service';
import { MedicationRoute } from '../../services/medication-route.enum';
import { NotificationService } from '../../services/notification.service';
import { KeycloakAdminService, KeycloakUser } from '../../services/keycloak-admin.service';

@Component({
  selector: 'app-pharmacy',
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  providers: [DatePipe]
})
export class PharmacyComponent implements OnInit {

  activeTab: 'medications' | 'prescriptions' | 'stock' = 'medications';

  medications:     Medication[] = [];
  medicationForm!: FormGroup;
  selectedMedId:   string | null = null;

  prescriptions:          Prescription[] = [];
  prescriptionForm!:      FormGroup;
  selectedPrescriptionId: string | null  = null;
  viewingPrescription:    Prescription | null = null;

  keycloakUsers:   KeycloakUser[] = [];
  filteredUsers:   KeycloakUser[] = [];
  userSearchQuery  = '';
  showUserDropdown = false;

  movements:    StockMovement[] = [];
  medMovements: StockMovement[] = [];
  stockStats:   StockStats | null = null;
  stockLoading  = false;
  historyMed:   Medication | null = null;

  showStockMedModal  = false;
  editingStockMedId: string | null = null;
  stockMedForm!:     FormGroup;
  stockMedLoading    = false;
  stockMedError      = '';

  showAdjustModal  = false;
  adjustTargetMed: Medication | null = null;
  adjustForm = {
    quantityChange: 1,
    isAddition:     true,
    reason:         'MANUAL_RESTOCK' as StockMovement['reason'],
    notes:          '',
    performedBy:    'Admin'
  };
  adjustError   = '';
  adjustLoading = false;

  stockSearch = '';
  stockFilter = '';

  routes   = Object.values(MedicationRoute);
  statuses: PrescriptionStatus[] = ['PENDING', 'APPROVED', 'DISPENSED', 'COMPLETED', 'CANCELLED'];

  readonly REASONS: { value: StockMovement['reason']; label: string }[] = [
    { value: 'MANUAL_RESTOCK', label: 'Manual Restock'   },
    { value: 'ADJUSTMENT',     label: 'Stock Adjustment' },
    { value: 'EXPIRED',        label: 'Expired Removal'  },
    { value: 'INITIAL_STOCK',  label: 'Initial Stock'    }
  ];

  readonly KIDNEY_MEDS: string[] = [
    'Ramipril', 'Losartan', 'Furosémide', 'Spironolactone',
    'Epoetin alfa', 'Sevelamer', 'Calcitriol', 'Tacrolimus',
    'Sodium bicarbonate', 'Calcium gluconate'
  ];

  readonly MED_DOSAGES: Record<string, string[]> = {
    'Ramipril':           ['1.25mg', '2.5mg', '5mg', '10mg'],
    'Losartan':           ['25mg', '50mg', '100mg'],
    'Furosémide':         ['20mg', '40mg', '80mg', '500mg'],
    'Spironolactone':     ['25mg', '50mg', '100mg'],
    'Epoetin alfa':       ['1000 UI', '2000 UI', '4000 UI', '10000 UI'],
    'Sevelamer':          ['400mg', '800mg'],
    'Calcitriol':         ['0.25mcg', '0.5mcg', '1mcg'],
    'Tacrolimus':         ['0.5mg', '1mg', '5mg'],
    'Sodium bicarbonate': ['500mg', '1g', '8.4%'],
    'Calcium gluconate':  ['500mg', '1g', '2g']
  };

  constructor(
    private fb:                  FormBuilder,
    private pharmacyService:     PharmacyService,
    private prescriptionService: PrescriptionService,
    private stockService:        StockService,
    private notif:               NotificationService,
    private keycloakAdmin:       KeycloakAdminService
  ) {}

  ngOnInit(): void {
    this.initMedicationForm();
    this.initPrescriptionForm();
    this.initStockMedForm();
    this.loadMedications();
    this.loadPrescriptions();
    this.loadStockData();
    this.loadPatients();
  }

  // ════════════════════════════════════════════════
  // ✅ UTILITAIRES DATE
  // ════════════════════════════════════════════════

  /** Date du jour au format YYYY-MM-DD (date système) */
  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * ✅ Validator cross-field : endDate doit être >= startDate.
   * Le champ "start" et "end" sont configurables (par défaut startDate/endDate).
   */
  static endAfterStartValidator(startField = 'startDate', endField = 'endDate') {
    return (group: AbstractControl): ValidationErrors | null => {
      const start = group.get(startField)?.value;
      const end   = group.get(endField)?.value;
      if (start && end && end < start) {
        return { endBeforeStart: true };
      }
      return null;
    };
  }

  /**
   * ✅ Validator individuel : la date ne peut pas être dans le passé.
   */
  static notPastDateValidator(control: AbstractControl): ValidationErrors | null {
    const today = new Date().toISOString().split('T')[0];
    if (control.value && control.value < today) {
      return { pastDate: true };
    }
    return null;
  }

  // ════════════════════════════════════════════════
  // KEYCLOAK PATIENTS
  // ════════════════════════════════════════════════

  loadPatients(): void {
    this.keycloakAdmin.getUsersByRole('patient').subscribe(users => {
      this.keycloakUsers = users;
      this.filteredUsers = [...users];
    });
  }

  onUserSearch(): void {
    const q = this.userSearchQuery.toLowerCase().trim();
    this.filteredUsers = q
      ? this.keycloakUsers.filter(u =>
          (u.username  || '').toLowerCase().includes(q) ||
          (u.firstName || '').toLowerCase().includes(q) ||
          (u.lastName  || '').toLowerCase().includes(q) ||
          (u.email     || '').toLowerCase().includes(q)
        )
      : [...this.keycloakUsers];
    this.showUserDropdown = true;
  }

  selectUser(user: KeycloakUser): void {
    this.prescriptionForm.get('userId')?.setValue(user.id);
    this.userSearchQuery  = KeycloakAdminService.displayName(user);
    this.showUserDropdown = false;
  }

  closeUserDropdown(): void { setTimeout(() => { this.showUserDropdown = false; }, 200); }

  clearUser(): void {
    this.prescriptionForm.get('userId')?.setValue('');
    this.userSearchQuery  = '';
    this.filteredUsers    = [...this.keycloakUsers];
    this.showUserDropdown = false;
  }

  getUserName(userId: string): string {
    const user = this.keycloakUsers.find(u => u.id === userId);
    return user ? KeycloakAdminService.displayName(user) : (userId?.slice(0, 8) + '...' || '—');
  }

  // ════════════════════════════════════════════════
  // MEDICATIONS
  // ════════════════════════════════════════════════

  initMedicationForm(): void {
    this.medicationForm = this.fb.group({
      medicationName: ['', Validators.required],
      dosage:         [''],
      frequency:      [null],
      route:          [null],
      duration:       [null],
      quantity:       [0, [Validators.required, Validators.min(0)]],
      startDate:      [''],
      endDate:        ['', Validators.required]
    });
  }

  loadMedications(): void {
    this.pharmacyService.getAll().subscribe({
      next: data => {
        this.medications = data;
        const out = data.filter(m => m.quantity === 0);
        const low = data.filter(m => m.quantity! > 0 && m.quantity! < 10);
        if (out.length) this.notif.error('Out of Stock!', `${out.length} medication(s) are out of stock`);
        if (low.length) this.notif.warning('Low Stock Alert', `${low.length} medication(s) have less than 10 units`);
      },
      error: () => this.notif.error('Load Failed', 'Could not load medications')
    });
  }

  submitMedication(): void {
    if (this.medicationForm.invalid) return;
    const med: Medication = this.medicationForm.value;
    if (this.selectedMedId) {
      this.pharmacyService.update(this.selectedMedId, med).subscribe({
        next: () => { this.notif.success('Updated!', `${med.medicationName} updated`); this.resetMedicationForm(); },
        error: () => this.notif.error('Update Failed', `Could not update ${med.medicationName}`)
      });
    } else {
      this.pharmacyService.create(med).subscribe({
        next: () => { this.notif.success('Medication Added!', `${med.medicationName} added`); this.resetMedicationForm(); },
        error: () => this.notif.error('Create Failed', `Could not add ${med.medicationName}`)
      });
    }
  }

  editMedication(med: Medication): void {
    this.selectedMedId = med.id!;
    this.medicationForm.patchValue(med);
    this.activeTab = 'medications';
    this.notif.info('Edit Mode', `Now editing: ${med.medicationName}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMedication(id?: string): void {
    if (!id) return;
    const med = this.medications.find(m => m.id === id);
    if (confirm('Delete this medication?')) {
      this.pharmacyService.delete(id).subscribe({
        next: () => { this.notif.success('Deleted!', `${med?.medicationName} deleted`); this.loadMedications(); this.loadStockData(); },
        error: () => this.notif.error('Delete Failed', 'Could not delete medication')
      });
    }
  }

  resetMedicationForm(): void {
    this.medicationForm.reset();
    this.selectedMedId = null;
    this.loadMedications();
    this.loadStockData();
  }

  // ════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ════════════════════════════════════════════════

  initPrescriptionForm(): void {
    this.prescriptionForm = this.fb.group(
      {
        // ✅ date par défaut = aujourd'hui | pas de passé
        prescriptionDate: [this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]],
        // ✅ validUntil par défaut = aujourd'hui | pas de passé
        validUntil:       [this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]],
        instructions:     [''],
        consultationId:   [''],
        userId:           ['', Validators.required],
        prescribedBy:     ['', Validators.required],
        status:           ['PENDING'],
        medications:      this.fb.array([])
      },
      // ✅ validUntil doit être >= prescriptionDate (cross-field)
      { validators: PharmacyComponent.endAfterStartValidator('prescriptionDate', 'validUntil') }
    );
  }

  get medicationsArray(): FormArray {
    return this.prescriptionForm.get('medications') as FormArray;
  }

  newMedicationGroup(data?: any): FormGroup {
    return this.fb.group(
      {
        medicationName: [data?.medicationName || '', Validators.required],
        dosage:         [data?.dosage         || ''],
        frequency:      [data?.frequency      || 1,  [Validators.required, Validators.min(1)]],
        route:          [data?.route          || null],
        duration:       [data?.duration       || 1,  [Validators.required, Validators.min(1)]],
        quantity:       [data?.quantity       || 1,  [Validators.required, Validators.min(1)]],
        // ✅ startDate par défaut = aujourd'hui | pas de passé
        startDate:      [data?.startDate      || this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]],
        // ✅ endDate par défaut = aujourd'hui | pas de passé
        endDate:        [data?.endDate        || this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]]
      },
      // ✅ endDate >= startDate (cross-field)
      { validators: PharmacyComponent.endAfterStartValidator() }
    );
  }

  addMedicationRow(): void               { this.medicationsArray.push(this.newMedicationGroup()); }
  removeMedicationRow(i: number): void   { this.medicationsArray.removeAt(i); }

  getSingleFormDosages(): string[] {
    const name = this.medicationForm.get('medicationName')?.value as string;
    return this.MED_DOSAGES[name] || [];
  }

  getDosages(index: number): string[] {
    const name = this.medicationsArray.at(index)?.get('medicationName')?.value as string;
    return this.MED_DOSAGES[name] || [];
  }

  onMedicationNameChange(index: number): void {
    this.medicationsArray.at(index)?.get('dosage')?.setValue('');
  }

  /**
   * ✅ Quand startDate change dans un médicament →
   * si endDate est avant la nouvelle startDate, on aligne endDate sur startDate
   */
  onMedStartDateChange(index: number): void {
    const group    = this.medicationsArray.at(index) as FormGroup;
    const startVal = group.get('startDate')?.value;
    const endVal   = group.get('endDate')?.value;
    if (startVal && endVal && endVal < startVal) {
      group.get('endDate')?.setValue(startVal);
    }
    group.updateValueAndValidity();
  }

  /**
   * ✅ Quand prescriptionDate change →
   * si validUntil est avant, on aligne validUntil sur prescriptionDate
   */
  onPrescriptionDateChange(): void {
    const startVal = this.prescriptionForm.get('prescriptionDate')?.value;
    const endVal   = this.prescriptionForm.get('validUntil')?.value;
    if (startVal && endVal && endVal < startVal) {
      this.prescriptionForm.get('validUntil')?.setValue(startVal);
    }
    this.prescriptionForm.updateValueAndValidity();
  }

  /** ✅ min dynamique pour validUntil = prescriptionDate courante */
  getPrescriptionMinValidUntil(): string {
    return this.prescriptionForm.get('prescriptionDate')?.value || this.today();
  }

  /** ✅ min dynamique pour endDate d'un médicament = sa startDate courante */
  getMedMinEndDate(index: number): string {
    return this.medicationsArray.at(index)?.get('startDate')?.value || this.today();
  }

  loadPrescriptions(): void {
    this.prescriptionService.getAll().subscribe({
      next: data => {
        this.prescriptions = data;
        const expired = data.filter(p => this.isExpired(p.validUntil));
        const pending  = data.filter(p => p.status === 'PENDING');
        if (expired.length) this.notif.warning('Expired Prescriptions', `${expired.length} prescription(s) have expired`);
        if (pending.length) this.notif.info('Pending Prescriptions', `${pending.length} prescription(s) awaiting approval`);
      },
      error: () => this.notif.error('Load Failed', 'Could not load prescriptions')
    });
  }

  submitPrescription(): void {
    if (this.prescriptionForm.invalid) return;
    const prescription: Prescription = this.prescriptionForm.value;
    if (this.selectedPrescriptionId) {
      this.prescriptionService.delete(this.selectedPrescriptionId).subscribe({
        next: () => {
          this.prescriptionService.create(prescription).subscribe({
            next: () => { this.notif.success('Updated!', 'Prescription updated successfully'); this.resetPrescriptionForm(); },
            error: () => this.notif.error('Update Failed', 'Could not update prescription')
          });
        },
        error: () => this.notif.error('Update Failed', 'Could not update prescription')
      });
    } else {
      this.prescriptionService.create(prescription).subscribe({
        next: () => { this.notif.success('Prescription Created!', 'New prescription saved'); this.resetPrescriptionForm(); },
        error: () => this.notif.error('Create Failed', 'Could not create prescription')
      });
    }
  }

  editPrescription(p: Prescription): void {
    this.selectedPrescriptionId = p.id!;
    while (this.medicationsArray.length) this.medicationsArray.removeAt(0);
    const existingUser = this.keycloakUsers.find(u => u.id === p.userId);
    this.userSearchQuery = existingUser ? KeycloakAdminService.displayName(existingUser) : p.userId || '';
    this.prescriptionForm.patchValue({
      prescriptionDate: p.prescriptionDate,
      validUntil:       p.validUntil,
      instructions:     p.instructions,
      consultationId:   p.consultationId,
      userId:           p.userId,
      prescribedBy:     p.prescribedBy,
      status:           p.status
    });
    p.medications?.forEach(med => this.medicationsArray.push(this.newMedicationGroup(med)));
    this.notif.info('Edit Mode', `Editing prescription from Dr. ${p.prescribedBy}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateStatus(id: string, status: PrescriptionStatus): void {
    this.prescriptionService.updateStatus(id, status).subscribe({
      next: () => {
        if (status === 'DISPENSED') this.notif.info('Stock Updated', 'Medication stock automatically decremented');
        this.notif.success('Status Updated!', `Prescription is now ${status}`);
        this.loadPrescriptions();
        this.loadStockData();
      },
      error: (err) => { const msg = err?.error?.message || 'Could not update status'; this.notif.error('Update Failed', msg); }
    });
  }

  deletePrescription(id?: string): void {
    if (!id) return;
    if (confirm('Delete this prescription?')) {
      this.prescriptionService.delete(id).subscribe({
        next: () => { this.notif.success('Deleted!', 'Prescription deleted'); this.loadPrescriptions(); },
        error: () => this.notif.error('Delete Failed', 'Could not delete prescription')
      });
    }
  }

  viewPrescription(p: Prescription): void  { this.viewingPrescription = p; }
  closeView(): void                         { this.viewingPrescription = null; }

  resetPrescriptionForm(): void {
    this.prescriptionForm.reset({
      status:           'PENDING',
      prescriptionDate: this.today(),  // ✅ reset avec date du jour
      validUntil:       this.today()
    });
    while (this.medicationsArray.length) this.medicationsArray.removeAt(0);
    this.selectedPrescriptionId = null;
    this.userSearchQuery        = '';
    this.filteredUsers          = [...this.keycloakUsers];
    this.loadPrescriptions();
  }

  // ════════════════════════════════════════════════
  // STOCK
  // ════════════════════════════════════════════════

  loadStockData(): void {
    this.stockLoading = true;
    this.stockService.getAllMovements().subscribe({
      next: d => { this.movements = d; this.stockLoading = false; },
      error: () => { this.stockLoading = false; }
    });
    this.stockService.getStats().subscribe({ next: d => this.stockStats = d });
  }

  get filteredStockMeds(): Medication[] {
    return this.medications.filter(m => {
      const matchSearch = !this.stockSearch || m.medicationName.toLowerCase().includes(this.stockSearch.toLowerCase());
      const matchFilter = !this.stockFilter ||
        (this.stockFilter === 'out' && m.quantity === 0) ||
        (this.stockFilter === 'low' && m.quantity! > 0 && m.quantity! <= 10) ||
        (this.stockFilter === 'ok'  && m.quantity! > 10);
      return matchSearch && matchFilter;
    });
  }

  openMedHistory(med: Medication): void {
    this.historyMed   = med;
    this.medMovements = [];
    this.stockService.getMovementsByMedication(med.id!).subscribe({
      next: d => this.medMovements = d,
      error: () => this.notif.error('Error', 'Could not load movement history')
    });
  }

  closeHistory(): void { this.historyMed = null; this.medMovements = []; }

  openAdjustModal(med: Medication): void {
    this.adjustTargetMed = med;
    this.adjustForm      = { quantityChange: 1, isAddition: true, reason: 'MANUAL_RESTOCK', notes: '', performedBy: 'Admin' };
    this.adjustError     = '';
    this.showAdjustModal = true;
  }

  submitAdjust(): void {
    if (!this.adjustTargetMed?.id) return;
    if (this.adjustForm.quantityChange <= 0) { this.adjustError = 'Quantity must be greater than 0.'; return; }
    this.adjustLoading = true;
    this.adjustError   = '';
    const finalQty = this.adjustForm.isAddition ? this.adjustForm.quantityChange : -this.adjustForm.quantityChange;
    const req: StockUpdateRequest = { quantityChange: finalQty, reason: this.adjustForm.reason, notes: this.adjustForm.notes || undefined, performedBy: this.adjustForm.performedBy || 'Admin' };
    this.stockService.updateStock(this.adjustTargetMed.id, req).subscribe({
      next: () => {
        this.adjustLoading = false; this.showAdjustModal = false;
        this.notif.success('Stock Updated!', `${this.adjustForm.quantityChange} units ${this.adjustForm.isAddition ? 'added to' : 'removed from'} ${this.adjustTargetMed!.medicationName}`);
        this.loadMedications(); this.loadStockData();
        if (this.historyMed?.id === this.adjustTargetMed!.id) this.openMedHistory(this.adjustTargetMed!);
      },
      error: err => { this.adjustLoading = false; this.adjustError = err?.error?.message || 'Stock update failed.'; this.notif.error('Update Failed', this.adjustError); }
    });
  }

  // ════════════════════════════════════════════════
  // STOCK CRUD
  // ════════════════════════════════════════════════

  initStockMedForm(): void {
    this.stockMedForm = this.fb.group(
      {
        medicationName: ['',  Validators.required],
        dosage:         ['',  Validators.required],
        frequency:      [1,   [Validators.required, Validators.min(1)]],
        route:          [null, Validators.required],
        duration:       [1,   [Validators.required, Validators.min(1)]],
        quantity:       [1,   [Validators.required, Validators.min(1)]],
        // ✅ date du jour par défaut | pas de passé
        startDate:      [this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]],
        endDate:        [this.today(), [Validators.required, PharmacyComponent.notPastDateValidator]]
      },
      // ✅ endDate >= startDate
      { validators: PharmacyComponent.endAfterStartValidator() }
    );
  }

  getStockFormDosages(): string[] {
    const name = this.stockMedForm.get('medicationName')?.value as string;
    return this.MED_DOSAGES[name] || [];
  }

  onStockMedNameChange(): void { this.stockMedForm.get('dosage')?.setValue(''); }

  /** ✅ Quand startDate change dans le formulaire stock → aligne endDate si nécessaire */
  onStockStartDateChange(): void {
    const startVal = this.stockMedForm.get('startDate')?.value;
    const endVal   = this.stockMedForm.get('endDate')?.value;
    if (startVal && endVal && endVal < startVal) {
      this.stockMedForm.get('endDate')?.setValue(startVal);
    }
    this.stockMedForm.updateValueAndValidity();
  }

  /** ✅ min dynamique pour endDate du formulaire stock */
  getStockMinEndDate(): string {
    return this.stockMedForm.get('startDate')?.value || this.today();
  }

  openStockCreate(): void {
    this.editingStockMedId = null;
    // ✅ reset avec date du jour
    this.stockMedForm.reset({ quantity: 1, frequency: 1, duration: 1, startDate: this.today(), endDate: this.today() });
    this.stockMedError     = '';
    this.showStockMedModal = true;
  }

  openStockEdit(med: Medication): void {
    this.editingStockMedId = med.id!;
    this.stockMedForm.patchValue({
      medicationName: med.medicationName, dosage: med.dosage, frequency: med.frequency,
      route: med.route, duration: med.duration, quantity: med.quantity,
      startDate: med.startDate, endDate: med.endDate
    });
    this.stockMedError     = '';
    this.showStockMedModal = true;
  }

  submitStockMed(): void {
    if (this.stockMedForm.invalid) return;
    this.stockMedLoading = true;
    this.stockMedError   = '';
    const med  = this.stockMedForm.value;
    const call = this.editingStockMedId ? this.pharmacyService.update(this.editingStockMedId, med) : this.pharmacyService.create(med);
    call.subscribe({
      next: () => { this.stockMedLoading = false; this.showStockMedModal = false; this.notif.success('Success!', `${med.medicationName} ${this.editingStockMedId ? 'updated' : 'added'}`); this.loadMedications(); this.loadStockData(); },
      error: err => { this.stockMedLoading = false; this.stockMedError = err?.error?.message || 'Operation failed.'; }
    });
  }

  deleteStockMed(med: Medication): void {
    if (!med.id) return;
    if (confirm(`Delete "${med.medicationName}"?\nThis will remove it from stock.`)) {
      this.pharmacyService.delete(med.id).subscribe({
        next: () => { this.notif.success('Deleted!', `${med.medicationName} removed`); this.loadMedications(); this.loadStockData(); if (this.historyMed?.id === med.id) this.closeHistory(); },
        error: () => this.notif.error('Delete Failed', 'Could not delete medication')
      });
    }
  }

  // ════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════

  enforceMin(event: Event, min: number): void {
    const input = event.target as HTMLInputElement;
    const val   = parseInt(input.value, 10);
    if (isNaN(val) || val < min) {
      input.value = String(min);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  isKidneyMed(name: string): boolean      { return this.KIDNEY_MEDS.includes(name); }
  stockLevel(qty?: number): 'out'|'low'|'ok' { if (!qty || qty === 0) return 'out'; if (qty <= 10) return 'low'; return 'ok'; }
  stockBarWidth(qty?: number): number      { return Math.min(100, qty || 0); }
  reasonLabel(r: string): string           { const m: Record<string,string> = { PRESCRIPTION_DISPENSED:'Prescription Dispensed', MANUAL_RESTOCK:'Manual Restock', ADJUSTMENT:'Adjustment', EXPIRED:'Expired Removal', INITIAL_STOCK:'Initial Stock' }; return m[r]||r; }
  reasonIcon(r: string): string            { const m: Record<string,string> = { PRESCRIPTION_DISPENSED:'fa-file-prescription', MANUAL_RESTOCK:'fa-truck', ADJUSTMENT:'fa-sliders-h', EXPIRED:'fa-calendar-times', INITIAL_STOCK:'fa-box-open' }; return m[r]||'fa-circle'; }
  statusClass(s?: string): string          { const m: Record<string,string> = { PENDING:'badge-pending', APPROVED:'badge-approved', DISPENSED:'badge-dispensed', COMPLETED:'badge-completed', CANCELLED:'badge-cancelled' }; return m[s||'']||''; }
  isExpired(d?: string): boolean           { if (!d) return false; return new Date(d) < new Date(); }
  trackById(_: number, item: any): string  { return item.id; }
}