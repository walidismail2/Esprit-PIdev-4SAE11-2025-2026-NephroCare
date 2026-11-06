import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ClinicalService, Consultation, MedicalHistory } from '../services/clinical.service';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-clinical',
  standalone: false,
  templateUrl: './clinical.component.html',
  styleUrls: ['./clinical.component.css']
})
export class ClinicalComponent implements OnInit {
  form: FormGroup;
  medicalHistoryForm: FormGroup;
  error: string | null = null;
  success: string | null = null;
  isPatient = false;
  currentPatientId: number | null = null;
  currentPatientName: string | null = null;
  loadingProfile = false;
  showMedicalHistoryModal = false;
  savingMedicalHistory = false;

  constructor(
    private fb: FormBuilder,
    private clinicalService: ClinicalService,
    private keycloakService: KeycloakService
  ) {
    this.form = this.fb.group({
      patientId: [{ value: null, disabled: true }],
      consultationDate: ['', [Validators.required, this.notPastDateValidator]],
      diagnosis: ['', [Validators.required, this.noWhitespaceValidator, Validators.minLength(3), Validators.maxLength(120)]],
      treatmentPlan: ['', [Validators.required, this.noWhitespaceValidator, Validators.minLength(10), Validators.maxLength(1000)]]
    });

    this.medicalHistoryForm = this.fb.group(
      {
        allergies: ['', [Validators.maxLength(250)]],
        diagnosis: ['', [Validators.maxLength(120)]],
        chronicConditions: ['', [Validators.maxLength(1000)]],
        familyHistory: ['', [Validators.maxLength(1000)]],
        notes: ['', [Validators.maxLength(1000)]]
      },
      { validators: this.atLeastOneFilledValidator }
    );
  }

  ngOnInit(): void {
    this.loadCurrentUserContext();
  }

  get patientDisplayName(): string {
    return this.currentPatientName?.trim() || 'Unknown Patient';
  }

  get patientInitials(): string {
    const parts = this.patientDisplayName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'PT';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  saveConsultation(): void {
    const effectivePatientId = this.currentPatientId;

    if (effectivePatientId == null) {
      this.error = 'Unable to determine patient ID from your account.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please fill in all required fields';
      return;
    }

    this.error = null;
    this.success = null;

    const formValue = this.form.getRawValue();
    const consultation: Consultation = {
      patientId: effectivePatientId,
      doctorId: null,
      consultationDate: formValue.consultationDate,
      diagnosis: this.cleanText(formValue.diagnosis),
      treatmentPlan: this.cleanText(formValue.treatmentPlan),
      followUpDate: null,
      status: 'SCHEDULED'
    };

    this.clinicalService.createConsultation(consultation).subscribe({
      next: () => {
        this.success = 'Consultation created successfully!';
        this.form.reset({
          patientId: this.currentPatientName,
          consultationDate: '',
          diagnosis: '',
          treatmentPlan: ''
        });
        setTimeout(() => (this.success = null), 3000);
      },
      error: (err) => {
        this.error = 'Error creating consultation: ' + err.message;
        console.error('Error creating consultation', err);
      }
    });
  }

  openMedicalHistoryModal(): void {
    this.error = null;
    this.showMedicalHistoryModal = true;
  }

  closeMedicalHistoryModal(): void {
    this.showMedicalHistoryModal = false;
    this.medicalHistoryForm.reset();
  }

  saveMedicalHistory(): void {
    const effectivePatientId = this.currentPatientId;
    if (effectivePatientId == null) {
      this.error = 'Unable to determine patient ID from your account.';
      return;
    }

    if (this.medicalHistoryForm.invalid) {
      this.medicalHistoryForm.markAllAsTouched();
      this.error = 'Please fill at least one field and fix invalid values.';
      return;
    }

    const formValue = this.medicalHistoryForm.value;
    const medicalHistory: MedicalHistory = {
      userId: effectivePatientId,
      diagnosis: this.cleanText(formValue.diagnosis),
      allergies: this.cleanText(formValue.allergies),
      chronicConditions: this.cleanText(formValue.chronicConditions),
      familyHistory: this.cleanText(formValue.familyHistory),
      notes: this.cleanText(formValue.notes)
    };

    this.error = null;
    this.savingMedicalHistory = true;

    this.clinicalService.createMedicalHistory(medicalHistory).subscribe({
      next: () => {
        this.success = 'Medical history created successfully!';
        this.closeMedicalHistoryModal();
        setTimeout(() => (this.success = null), 3000);
      },
      error: (err) => {
        this.error = 'Error creating medical history: ' + err.message;
        console.error('Error creating medical history', err);
      },
      complete: () => {
        this.savingMedicalHistory = false;
      }
    });
  }

  private async loadCurrentUserContext(): Promise<void> {
    this.loadingProfile = true;
    this.isPatient = this.keycloakService.isUserInRole('patient');
    this.currentPatientId = this.isPatient ? this.extractTokenUserId() : null;
    this.currentPatientName = this.isPatient ? this.extractTokenPatientName() : null;

    if (this.isPatient && (this.currentPatientId == null || !this.currentPatientName)) {
      try {
        const profile = await this.keycloakService.loadUserProfile();
        if (this.currentPatientId == null) {
          this.currentPatientId = this.extractProfileUserId(profile);
        }
        if (!this.currentPatientName) {
          this.currentPatientName = this.extractProfileDisplayName(profile);
        }
      } catch (err) {
        console.warn('Unable to load profile fallback', err);
      }
    }

    this.form.patchValue({
      patientId: this.isPatient ? this.currentPatientName : ''
    });

    this.loadingProfile = false;
  }

  private extractTokenUserId(): number | null {
    const tokenParsed: any = this.keycloakService.getKeycloakInstance()?.tokenParsed;
    if (!tokenParsed) {
      return null;
    }

    const candidates = [
      tokenParsed?.id,
      tokenParsed?.userId,
      tokenParsed?.user_id,
      tokenParsed?.patientId,
      tokenParsed?.patient_id,
      tokenParsed?.patient?.id,
      tokenParsed?.attributes?.patientId,
      tokenParsed?.attributes?.patient_id,
      tokenParsed?.preferred_username,
      tokenParsed?.username,
      tokenParsed?.email,
      tokenParsed?.uid,
      tokenParsed?.sub
    ];

    for (const value of candidates) {
      const parsed = this.parsePositiveId(value);
      if (parsed != null) {
        return parsed;
      }
    }

    return null;
  }

  private extractTokenPatientName(): string | null {
    const tokenParsed: any = this.keycloakService.getKeycloakInstance()?.tokenParsed;
    if (!tokenParsed) {
      return null;
    }

    const fullName = `${tokenParsed?.given_name ?? ''} ${tokenParsed?.family_name ?? ''}`.trim();
    const candidates = [
      tokenParsed?.name,
      fullName,
      tokenParsed?.preferred_username,
      tokenParsed?.username,
      tokenParsed?.email
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private extractProfileUserId(profile: any): number | null {
    const candidates = [
      profile?.userId,
      profile?.id,
      profile?.attributes?.userId,
      profile?.attributes?.patientId,
      profile?.username,
      profile?.email
    ];

    for (const value of candidates) {
      const parsed = this.parsePositiveId(value);
      if (parsed != null) {
        return parsed;
      }
    }

    return null;
  }

  private extractProfileDisplayName(profile: any): string | null {
    const fullName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
    const candidates = [fullName, profile?.username, profile?.email];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private parsePositiveId(value: any): number | null {
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


  hasError(controlName: string, formGroup: FormGroup = this.form): boolean {
    const control = formGroup.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  fieldError(controlName: string, formGroup: FormGroup = this.form): string | null {
    const control = formGroup.get(controlName);
    if (!control || !this.hasError(controlName, formGroup)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (control.hasError('whitespace')) {
      return 'Only spaces are not allowed.';
    }
    if (control.hasError('minlength')) {
      const requiredLength = control.getError('minlength')?.requiredLength;
      return `Minimum ${requiredLength} characters required.`;
    }
    if (control.hasError('maxlength')) {
      const requiredLength = control.getError('maxlength')?.requiredLength;
      return `Maximum ${requiredLength} characters allowed.`;
    }
    if (control.hasError('pastDate')) {
      return 'Consultation date cannot be in the past.';
    }

    return 'Invalid value.';
  }

  medicalHistoryGroupError(): string | null {
    if (
      this.medicalHistoryForm.hasError('atLeastOneRequired') &&
      (this.medicalHistoryForm.dirty || this.medicalHistoryForm.touched)
    ) {
      return 'Please fill at least one medical history field.';
    }
    return null;
  }

  private cleanText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value !== 'string') {
      return null;
    }
    return control.value.trim().length > 0 ? null : { whitespace: true };
  }

  private notPastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const selectedDate = new Date(control.value);
    if (Number.isNaN(selectedDate.getTime())) {
      return { pastDate: true };
    }

    return selectedDate.getTime() < Date.now() ? { pastDate: true } : null;
  }

  private atLeastOneFilledValidator(control: AbstractControl): ValidationErrors | null {
    const formGroup = control as FormGroup;
    const hasAnyValue = Object.values(formGroup.controls).some((childControl) => {
      const value = childControl.value;
      return typeof value === 'string' ? value.trim().length > 0 : !!value;
    });

    return hasAnyValue ? null : { atLeastOneRequired: true };
  }
}
