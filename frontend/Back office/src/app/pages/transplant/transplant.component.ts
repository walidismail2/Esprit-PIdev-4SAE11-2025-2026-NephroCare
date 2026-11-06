import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KeycloakAdminService, KeycloakUser } from '../../services/keycloak-admin.service';
import {
  PreoperativeAssessment,
  TransplantAiRecommendationEnvelope,
  TransplantCandidacy,
  TransplantService
} from '../../services/transplant.service';

@Component({
  selector: 'app-transplant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transplant.component.html',
  styleUrls: ['./transplant.component.css']
})
export class TransplantComponent implements OnInit {
  private readonly selectedPatientStorageKey = 'transplant.selectedPatientId';
  // View states
  activeTab: 'candidacy' | 'assessment' | 'timeline' = 'candidacy';
  patientId: number | null = null;
  
  // Candidacy
  candidacyForm: FormGroup;
  candidacy: TransplantCandidacy | null = null;
  candidacyLoading = false;
  candidacyError: string | null = null;
  candidacySuccess: string | null = null;
  patientSelectionError: string | null = null;

  // Assessment
  assessmentForm: FormGroup;
  assessmentHistory: PreoperativeAssessment[] = [];
  currentAssessment: PreoperativeAssessment | null = null;
  assessmentLoading = false;
  assessmentError: string | null = null;
  assessmentSuccess: string | null = null;
  aiRecommendation: TransplantAiRecommendationEnvelope | null = null;
  aiLoading = false;
  aiError: string | null = null;

  // Enums
  candidacyStatuses = ['ELIGIBLE', 'INELIGIBLE', 'PENDING', 'WAITLISTED', 'TRANSPLANTED', 'DECLINED'];
  hlaLevels = ['LOW', 'MODERATE', 'HIGH'];
  dialysisModalities = ['IN_CENTER_HD', 'NOCTURNAL_HD', 'PD', 'HDF'];
  
  hivStatuses = ['NEGATIVE', 'POSITIVE', 'UNKNOWN'];
  hepatitisStatuses = ['NEGATIVE', 'POSITIVE', 'IMMUNE', 'UNKNOWN'];
  virusStatuses = ['POSITIVE', 'NEGATIVE', 'UNKNOWN'];
  assessmentStatuses = ['PENDING', 'CLEARED', 'CONTRAINDICATED', 'REVIEW_NEEDED'];

  // Patient Selection from Keycloak
  patientUsers: KeycloakUser[] = [];
  patientSelectionItems: Array<{ id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }> = [];
  patientNameById: Record<number, string> = {};
  patientSearch = '';
  dropdownOpen = false;
  patientsLoading = false;
  selectedPatient: KeycloakUser | null = null;

  constructor(
    private fb: FormBuilder,
    private transplantService: TransplantService,
    private keycloakAdminService: KeycloakAdminService
  ) {
    this.candidacyForm = this.fb.group({
      status: ['PENDING', Validators.required],
      eligibilityScore: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      eligibilityNotes: ['', [Validators.required, Validators.maxLength(1000)]],
      ecdSuitable: [false],
      livingDonorSuitable: [false],
      hlaLevel: ['LOW', Validators.required],
      panelReactiveAntibody: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      cardiovascularClearance: [false],
      infectiousDiseaseCleanance: [false],
      psychologicalClearance: [false],
      socialSupportAssessment: [false],
      contraindications: ['', Validators.maxLength(1000)],
      dialysisModality: ['IN_CENTER_HD', Validators.required],
      waitlistDate: [null, this.noFutureDateValidator()]
    }, {
      validators: [
        this.requireWhenValidator('status', ['WAITLISTED'], 'waitlistDate'),
        this.requireWhenValidator('status', ['INELIGIBLE', 'DECLINED'], 'contraindications')
      ]
    });

    this.assessmentForm = this.fb.group({
      assessmentDate: [this.todayIsoDate(), [Validators.required, this.noFutureDateValidator()]],
      // Cardiac
      ecgResult: ['', [Validators.required, Validators.maxLength(255)]],
      echocardiogramResult: ['', [Validators.required, Validators.maxLength(1000)]],
      stressTestResult: ['', [Validators.required, Validators.maxLength(1000)]],
      ejectionFraction: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      cardiacClearance: [false],
      // Infectious
      hivStatus: ['NEGATIVE', Validators.required],
      hepBStatus: ['NEGATIVE', Validators.required],
      hepCStatus: ['NEGATIVE', Validators.required],
      cmvStatus: ['NEGATIVE', Validators.required],
      ebvStatus: ['NEGATIVE', Validators.required],
      tbScreening: ['', [Validators.required, Validators.maxLength(255)]],
      idClearance: [false],
      // Pulmonary
      pulmonaryFunctionTest: ['', [Validators.required, Validators.maxLength(255)]],
      chestXrayResult: ['', [Validators.required, Validators.maxLength(255)]],
      pulmonaryClearance: [false],
      // Renal
      preAssessmentCreatinine: [null, [Validators.required, Validators.min(0)]],
      preAssessmentGFR: [null, [Validators.required, Validators.min(0)]],
      urineProteinLevel: ['', [Validators.required, Validators.maxLength(255)]],
      // Psychological
      psychiatricEvaluation: ['', [Validators.required, Validators.maxLength(1000)]],
      patientComplianceScore: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      psychiatricClearance: [false],
      // Dental
      dentalExamDate: [null, this.noFutureDateValidator()],
      dentalTreatmentNeeded: [false],
      dentalClearance: [false],
      // Overall
      overallRiskScore: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: ['PENDING', Validators.required],
      recommendations: ['', [Validators.required, Validators.maxLength(1000)]],
      notes: ['', [Validators.required, Validators.maxLength(1000)]]
    }, {
      validators: [
        this.requireWhenValidator('status', ['REVIEW_NEEDED', 'CONTRAINDICATED'], 'recommendations')
      ]
    });
  }

  ngOnInit(): void {
    this.loadKeycloakPatients();
  }

  // ===== CANDIDACY MANAGEMENT =====
  saveCandidacy(): void {
    if (!this.patientId) {
      this.patientSelectionError = 'Please select a patient before saving.';
      this.candidacyError = 'Please select a patient first.';
      return;
    }
    this.patientSelectionError = null;

    if (this.candidacyForm.invalid) {
      this.candidacyForm.markAllAsTouched();
      this.candidacyError = 'Please fill required fields correctly.';
      return;
    }

    this.candidacyLoading = true;
    this.candidacyError = null;
    this.candidacySuccess = null;

    const formValue = this.candidacyForm.value;
    
    console.log('Creating candidacy with data:', { patientId: this.patientId, ...formValue });
    
    const candidacy: TransplantCandidacy = {
      patientId: this.patientId!,
      status: formValue.status,
      eligibilityScore: formValue.eligibilityScore,
      eligibilityNotes: formValue.eligibilityNotes,
      ecdSuitable: formValue.ecdSuitable,
      livingDonorSuitable: formValue.livingDonorSuitable,
      hlaLevel: formValue.hlaLevel,
      panelReactiveAntibody: formValue.panelReactiveAntibody,
      cardiovascularClearance: formValue.cardiovascularClearance,
      infectiousDiseaseCleanance: formValue.infectiousDiseaseCleanance,
      psychologicalClearance: formValue.psychologicalClearance,
      socialSupportAssessment: formValue.socialSupportAssessment,
      contraindications: formValue.contraindications,
      dialysisModality: formValue.dialysisModality,
      waitlistDate: formValue.waitlistDate
    };

    if (this.candidacy?.id) {
      this.transplantService.updateCandidacy(this.candidacy.id, candidacy).subscribe({
        next: (result) => {
          this.candidacy = result;
          this.aiRecommendation = null;
          this.aiError = null;
          this.candidacySuccess = 'Transplant candidacy updated successfully.';
          this.candidacyLoading = false;
        },
        error: (err) => {
          const errorMsg = this.extractErrorMessage(err);
          this.candidacyError = `Error updating candidacy: ${errorMsg}`;
          this.candidacyLoading = false;
          console.error('Update error:', err);
        }
      });
    } else {
      this.transplantService.createCandidacy(candidacy).subscribe({
        next: (result) => {
          this.candidacy = result;
          this.aiRecommendation = null;
          this.aiError = null;
          this.candidacySuccess = 'Transplant candidacy created successfully.';
          this.candidacyLoading = false;
          this.populateCandidacyForm(result);
        },
        error: (err) => {
          const errorMsg = this.extractErrorMessage(err);
          this.candidacyError = `Error creating candidacy: ${errorMsg}`;
          this.candidacyLoading = false;
          console.error('Create candidacy error:', err);
        }
      });
    }
  }

  loadCandidacy(): void {
    if (!this.patientId) return;
    this.candidacyLoading = true;
    this.candidacyError = null;
    this.aiRecommendation = null;
    this.aiError = null;
    this.transplantService.getCandidacyByPatientId(this.patientId).subscribe({
      next: (candidacy) => {
        this.candidacy = candidacy;
        this.populateCandidacyForm(candidacy);
        this.candidacyLoading = false;
      },
      error: () => {
        this.candidacy = null;
        this.resetCandidacyForm();
        this.candidacyLoading = false;
      }
    });
  }

  private populateCandidacyForm(candidacy: TransplantCandidacy): void {
    this.candidacyForm.patchValue({
      status: candidacy.status,
      eligibilityScore: candidacy.eligibilityScore,
      eligibilityNotes: candidacy.eligibilityNotes,
      ecdSuitable: candidacy.ecdSuitable,
      livingDonorSuitable: candidacy.livingDonorSuitable,
      hlaLevel: candidacy.hlaLevel,
      panelReactiveAntibody: candidacy.panelReactiveAntibody,
      cardiovascularClearance: candidacy.cardiovascularClearance,
      infectiousDiseaseCleanance: candidacy.infectiousDiseaseCleanance,
      psychologicalClearance: candidacy.psychologicalClearance,
      socialSupportAssessment: candidacy.socialSupportAssessment,
      contraindications: candidacy.contraindications,
      dialysisModality: candidacy.dialysisModality,
      waitlistDate: candidacy.waitlistDate
    });
  }

  getEligibilityBadge(score: number | undefined): string {
    if (score == null) return 'PENDING';
    if (score >= 80) return 'HIGH';
    if (score >= 60) return 'MODERATE';
    return 'LOW';
  }

  getEligibilityColor(score: number | undefined): string {
    if (score == null) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  }

  getAiRiskColor(riskLevel: string | undefined): string {
    switch ((riskLevel || '').toUpperCase()) {
      case 'LOW':
        return 'green';
      case 'MEDIUM':
        return 'amber';
      case 'HIGH':
        return 'red';
      default:
        return 'gray';
    }
  }

  getAiRecommendationColor(recommendation: string | undefined): string {
    switch ((recommendation || '').toUpperCase()) {
      case 'ELIGIBLE':
        return 'green';
      case 'ELIGIBLE_WITH_CAUTION':
        return 'amber';
      case 'PENDING':
      case 'REVIEW_NEEDED':
        return 'yellow';
      case 'INELIGIBLE':
        return 'red';
      default:
        return 'gray';
    }
  }

  generateAiRecommendation(): void {
    if (!this.candidacy?.id) {
      this.aiError = 'Save the transplant candidacy before generating an AI recommendation.';
      return;
    }

    this.aiLoading = true;
    this.aiError = null;

    this.transplantService.generateAiRecommendation(this.candidacy.id).subscribe({
      next: (result) => {
        this.aiRecommendation = result;
        this.aiLoading = false;
      },
      error: (err) => {
        this.aiError = `Error generating AI recommendation: ${this.extractErrorMessage(err)}`;
        this.aiLoading = false;
      }
    });
  }

  // ===== ASSESSMENT MANAGEMENT =====
  saveAssessment(): void {
    if (!this.patientId) {
      this.patientSelectionError = 'Please select a patient before saving.';
      this.assessmentError = 'Please select a patient first.';
      return;
    }
    this.patientSelectionError = null;

    if (this.assessmentForm.invalid) {
      this.assessmentForm.markAllAsTouched();
      this.assessmentError = 'Please fill required fields correctly.';
      return;
    }

    this.assessmentLoading = true;
    this.assessmentError = null;
    this.assessmentSuccess = null;

    const formValue = this.assessmentForm.value;
    const assessment: PreoperativeAssessment = {
      patientId: this.patientId!,
      ...formValue
    };

    if (this.currentAssessment?.id) {
      this.transplantService.updateAssessment(this.currentAssessment.id, assessment).subscribe({
        next: (result) => {
          this.currentAssessment = result;
          this.populateAssessmentForm(result);
          this.assessmentSuccess = 'Assessment updated successfully.';
          this.assessmentLoading = false;
          this.loadAssessmentHistory();
        },
        error: (err) => {
          const errorMsg = this.extractErrorMessage(err);
          this.assessmentError = `Error updating assessment: ${errorMsg}`;
          this.assessmentLoading = false;
          console.error('Update assessment error:', err);
        }
      });
    } else {
      this.transplantService.createAssessment(assessment).subscribe({
        next: (result) => {
          this.currentAssessment = result;
          this.populateAssessmentForm(result);
          this.assessmentSuccess = 'Assessment saved successfully.';
          this.assessmentLoading = false;
          this.loadAssessmentHistory();
        },
        error: (err) => {
          const errorMsg = this.extractErrorMessage(err);
          this.assessmentError = `Error saving assessment: ${errorMsg}`;
          this.assessmentLoading = false;
          console.error('Create assessment error:', err);
        }
      });
    }
  }

  loadAssessmentHistory(): void {
    if (!this.patientId) return;
    this.assessmentLoading = true;
    this.assessmentError = null;
    this.transplantService.getAssessmentHistory(this.patientId).subscribe({
      next: (assessments) => {
        this.assessmentHistory = assessments;
        if (assessments.length > 0) {
          this.currentAssessment = assessments[0];
          this.populateAssessmentForm(assessments[0]);
        } else {
          this.currentAssessment = null;
          this.resetAssessmentForm();
        }
        this.assessmentLoading = false;
      },
      error: () => {
        this.assessmentHistory = [];
        this.currentAssessment = null;
        this.resetAssessmentForm();
        this.assessmentLoading = false;
      }
    });
  }

  selectAssessmentFromHistory(assessment: PreoperativeAssessment): void {
    this.currentAssessment = assessment;
    this.populateAssessmentForm(assessment);
  }

  private populateAssessmentForm(assessment: PreoperativeAssessment): void {
    this.assessmentForm.patchValue(assessment);
  }

  getAssessmentStatusBadge(status: string | undefined): { text: string; color: string } {
    switch (status) {
      case 'CLEARED':
        return { text: 'Cleared', color: 'green' };
      case 'CONTRAINDICATED':
        return { text: 'Contraindicated', color: 'red' };
      case 'REVIEW_NEEDED':
        return { text: 'Review Needed', color: 'amber' };
      default:
        return { text: 'Pending', color: 'gray' };
    }
  }

  getRiskScoreBadge(score: number | undefined): string {
    if (score == null) return 'UNKNOWN';
    if (score >= 70) return 'HIGH RISK';
    if (score >= 40) return 'MODERATE RISK';
    return 'LOW RISK';
  }

  getRiskScoreColor(score: number | undefined): string {
    if (score == null) return 'gray';
    if (score >= 70) return 'red';
    if (score >= 40) return 'amber';
    return 'green';
  }

  clearancesSummary(): { label: string; value: boolean | undefined }[] {
    return [
      { label: 'Cardiac Clearance', value: this.currentAssessment?.cardiacClearance },
      { label: 'ID Clearance', value: this.currentAssessment?.idClearance },
      { label: 'Pulmonary Clearance', value: this.currentAssessment?.pulmonaryClearance },
      { label: 'Psychiatric Clearance', value: this.currentAssessment?.psychiatricClearance },
      { label: 'Dental Clearance', value: this.currentAssessment?.dentalClearance }
    ];
  }

  candidacyClearancesSummary(): { label: string; value: boolean | undefined }[] {
    return [
      { label: 'Cardiovascular Clearance', value: this.candidacy?.cardiovascularClearance },
      { label: 'Infectious Disease Clearance', value: this.candidacy?.infectiousDiseaseCleanance },
      { label: 'Psychological Clearance', value: this.candidacy?.psychologicalClearance },
      { label: 'Social Support Assessment', value: this.candidacy?.socialSupportAssessment }
    ];
  }

  // ===== PATIENT SELECTION FROM KEYCLOAK =====
  private loadKeycloakPatients(): void {
    this.patientsLoading = true;
    this.keycloakAdminService.getUsersByRole('patient').subscribe({
      next: (users) => {
        this.patientUsers = users;
        console.log(`Loaded ${users.length} patients from Keycloak`, users);
        
        users.forEach((user) => {
          const patientId = this.resolveNumericIdFromUser(user, ['patientId', 'userId', 'id']);
          if (patientId) {
            this.patientNameById[patientId] = KeycloakAdminService.displayName(user);
          }
        });
        
        this.updatePatientSelectionItems();
        this.patientsLoading = false;
      },
      error: (err) => {
        console.warn('Unable to load Keycloak patients', err);
        this.patientsLoading = false;
      }
    });
  }

  private updatePatientSelectionItems(): void {
    const items: Array<{ id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }> = [];

    this.patientUsers.forEach((user) => {
      const patientId = this.resolveNumericIdFromUser(user, ['patientId', 'userId', 'id']);
      if (!patientId) {
        return;
      }

      items.push({
          id: patientId,
          displayName: KeycloakAdminService.displayName(user),
          email: user.email,
          username: user.username,
          user
      });
    });

    items.sort((a, b) => a.displayName.localeCompare(b.displayName));

    this.patientSelectionItems = items;
    
    if (items.length === 0) {
      this.patientSelectionError = 'No Keycloak patients with a valid numeric patient ID were found.';
      console.warn('No transplant patients found with a usable numeric ID.', this.patientUsers);
    } else {
      this.patientSelectionError = null;
      this.restoreSelectedPatientFromStorage();
    }
  }

  private restoreSelectedPatientFromStorage(): void {
    if (this.patientId) {
      return;
    }

    const storedId = localStorage.getItem(this.selectedPatientStorageKey);
    const parsedId = storedId ? Number(storedId) : null;
    if (!parsedId || !Number.isInteger(parsedId) || parsedId <= 0) {
      return;
    }

    const patient = this.patientSelectionItems.find((item) => item.id === parsedId);
    if (!patient) {
      localStorage.removeItem(this.selectedPatientStorageKey);
      return;
    }

    this.selectPatient(patient);
  }

  public resolveNumericIdFromUser(user: KeycloakUser, keys: string[]): number | null {
    for (const key of keys) {
      const candidate = this.getUserAttributeValue(user, key) ?? (user as any)[key];
      const parsed = this.parsePositiveId(candidate);
      if (parsed != null) {
        return parsed;
      }
    }

    for (const candidate of [user.username, user.email, user.id, user.attributes]) {
      const parsed = this.parsePositiveId(candidate);
      if (parsed != null) {
        return parsed;
      }
    }

    return null;
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

  private getUserAttributeValue(user: KeycloakUser, attributeName: string): string | undefined {
    return user.attributes?.[attributeName]?.[0];
  }

  get filteredPatients(): Array<{ id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }> {
    const term = this.patientSearch.toLowerCase().trim();
    if (!term) return this.patientSelectionItems;
    return this.patientSelectionItems.filter((item) =>
      item.displayName.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.username?.toLowerCase().includes(term) ||
      item.id.toString().includes(term)
    );
  }

  selectPatient(patient: { id: number; displayName: string; email?: string; username?: string; user?: KeycloakUser }): void {
    this.patientId = patient.id;
    this.selectedPatient = patient.user || null;
    localStorage.setItem(this.selectedPatientStorageKey, String(patient.id));
    this.patientSelectionError = null;
    this.patientSearch = '';
    this.dropdownOpen = false;
    this.candidacy = null;
    this.assessmentHistory = [];
    this.currentAssessment = null;
    this.aiRecommendation = null;
    this.aiError = null;
    this.candidacyError = null;
    this.candidacySuccess = null;
    this.assessmentError = null;
    this.assessmentSuccess = null;
    this.resetCandidacyForm();
    this.resetAssessmentForm();
    this.loadCandidacy();
    this.loadAssessmentHistory();
  }

  clearPatientSelection(): void {
    this.patientId = null;
    this.selectedPatient = null;
    localStorage.removeItem(this.selectedPatientStorageKey);
    this.patientSelectionError = null;
    this.patientSearch = '';
    this.dropdownOpen = false;
    this.candidacy = null;
    this.assessmentHistory = [];
    this.currentAssessment = null;
    this.aiRecommendation = null;
    this.aiError = null;
    this.candidacyError = null;
    this.candidacySuccess = null;
    this.assessmentError = null;
    this.assessmentSuccess = null;
    this.resetCandidacyForm();
    this.resetAssessmentForm();
  }

  private extractErrorMessage(err: any): string {
    // Try to get detailed validation errors from backend
    if (err.error) {
      if (typeof err.error === 'string') {
        return err.error;
      }
      if (err.error.message) {
        return err.error.message;
      }
      if (err.error.error) {
        return err.error.error;
      }
      if (err.error.errors && typeof err.error.errors === 'object') {
        const messages = Object.entries(err.error.errors)
          .map(([field, msg]: any) => `${field}: ${msg}`)
          .join(', ');
        return messages || JSON.stringify(err.error.errors);
      }
    }
    return err.message || err.statusText || 'Unknown error occurred';
  }

  private resetCandidacyForm(): void {
    this.candidacyForm.reset({
      status: 'PENDING',
      eligibilityScore: null,
      eligibilityNotes: '',
      ecdSuitable: false,
      livingDonorSuitable: false,
      hlaLevel: 'LOW',
      panelReactiveAntibody: null,
      cardiovascularClearance: false,
      infectiousDiseaseCleanance: false,
      psychologicalClearance: false,
      socialSupportAssessment: false,
      contraindications: '',
      dialysisModality: 'IN_CENTER_HD',
      waitlistDate: null
    });
    this.candidacyForm.markAsPristine();
    this.candidacyForm.markAsUntouched();
  }

  private resetAssessmentForm(): void {
    this.assessmentForm.reset({
      assessmentDate: this.todayIsoDate(),
      ecgResult: '',
      echocardiogramResult: '',
      stressTestResult: '',
      ejectionFraction: null,
      cardiacClearance: false,
      hivStatus: 'NEGATIVE',
      hepBStatus: 'NEGATIVE',
      hepCStatus: 'NEGATIVE',
      cmvStatus: 'NEGATIVE',
      ebvStatus: 'NEGATIVE',
      tbScreening: '',
      idClearance: false,
      pulmonaryFunctionTest: '',
      chestXrayResult: '',
      pulmonaryClearance: false,
      preAssessmentCreatinine: null,
      preAssessmentGFR: null,
      urineProteinLevel: '',
      psychiatricEvaluation: '',
      patientComplianceScore: null,
      psychiatricClearance: false,
      dentalExamDate: null,
      dentalTreatmentNeeded: false,
      dentalClearance: false,
      overallRiskScore: 50,
      status: 'PENDING',
      recommendations: '',
      notes: ''
    });
    this.assessmentForm.markAsPristine();
    this.assessmentForm.markAsUntouched();
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private noFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      return inputDate > today ? { futureDate: true } : null;
    };
  }

  private requireWhenValidator(sourceControlName: string, triggerValues: string[], targetControlName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const source = group.get(sourceControlName)?.value;
      const target = group.get(targetControlName)?.value;
      const hasValue = target !== null && target !== undefined && String(target).trim() !== '';

      return triggerValues.includes(source) && !hasValue
        ? { [`${targetControlName}Required`]: true }
        : null;
    };
  }

  getFormControlError(form: FormGroup, controlName: string): string {
    const errors = form.errors || {};
    if (errors[`${controlName}Required`]) {
      switch (controlName) {
        case 'waitlistDate':
          return 'Waitlist date is required when the status is WAITLISTED.';
        case 'contraindications':
          return 'Contraindications are required when the status is INELIGIBLE or DECLINED.';
        case 'recommendations':
          return 'Recommendations are required when the assessment needs review or is contraindicated.';
        default:
          return 'This field is required.';
      }
    }

    return '';
  }

  hasError(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(form: FormGroup, controlName: string, label: string): string {
    const control = form.get(controlName);
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${label} is required.`;
    }
    if (control.errors['min']) {
      return `${label} must be greater than or equal to ${control.errors['min'].min}.`;
    }
    if (control.errors['max']) {
      return `${label} must be less than or equal to ${control.errors['max'].max}.`;
    }
    if (control.errors['maxlength']) {
      return `${label} cannot exceed ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['futureDate']) {
      return `${label} cannot be in the future.`;
    }

    return `${label} is invalid.`;
  }
}

