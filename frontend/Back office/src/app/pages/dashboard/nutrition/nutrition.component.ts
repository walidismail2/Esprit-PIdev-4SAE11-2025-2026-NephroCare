// src/app/features/nutrition/nutrition.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import {
  NutritionService, NutritionPlan,
  MealRecord, DailySummary, RiskAssessment, WeeklyTrend
} from '../../../services/nutrition.service';
import {
  PatientNutritionProfileService,
  PatientNutritionProfile
} from '../../../services/patient-nutrition-profile.service';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakAdminService } from '../../../services/keycloak-admin.service';

type ActiveTab = 'summary' | 'plan' | 'risk' | 'trend' | 'meals' | 'profile';

@Component({
  selector: 'app-nutrition',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './nutrition.component.html',
})
export class NutritionComponent implements OnInit {

  currentUserName: string = '';
  hospitalizationId!: number;
  patientUserId: string = '';
  patientFullName: string = '';

  // ── State ─────────────────────────────────────────────────────────────
  plan:    NutritionPlan           | null = null;
  summary: DailySummary            | null = null;
  risk:    RiskAssessment          | null = null;
  trend:   WeeklyTrend             | null = null;
  profile: PatientNutritionProfile | null = null;
  meals:   MealRecord[]                   = [];

  activeTab: ActiveTab = 'summary';

  loadingPlan    = false;
  loadingSummary = false;
  loadingRisk    = false;
  loadingTrend   = false;
  loadingMeals   = false;
  loadingProfile = false;
  savingPlan     = false;
  savingMeal     = false;
  savingProfile  = false;

  planError:      string = '';
  summaryError:   string = '';
  mealError:      string = '';
  profileError:   string = '';
  profileSuccess: string = '';

  summaryDate: string = new Date().toISOString().slice(0, 10);
  todayIso            = new Date().toISOString().slice(0, 16);

  // ── Forms ─────────────────────────────────────────────────────────────
  planForm!:    FormGroup;
  mealForm!:    FormGroup;
  profileForm!: FormGroup;
  showMealForm  = false;

  readonly dietTypes = [
    { value: 'STANDARD',     label: 'Standard' },
    { value: 'DIABETIC',     label: 'Diabetic' },
    { value: 'LOW_SODIUM',   label: 'Low Sodium' },
    { value: 'HIGH_PROTEIN', label: 'High Protein' },
    { value: 'VEGETARIAN',   label: 'Vegetarian' },
    { value: 'LIQUID',       label: 'Liquid' },
    { value: 'RENAL',        label: 'Renal' },
    { value: 'CARDIAC',      label: 'Cardiac' },
  ];

  readonly mealTypes = [
    { value: 'BREAKFAST',  label: 'Breakfast' },
    { value: 'LUNCH',      label: 'Lunch' },
    { value: 'DINNER',     label: 'Dinner' },
    { value: 'SNACK',      label: 'Snack' },
    { value: 'SUPPLEMENT', label: 'Supplement' },
  ];

  readonly genderOptions = [
    { value: 'MALE',   label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER',  label: 'Other' },
  ];

  readonly activityOptions = [
    { value: 'SEDENTARY',         label: 'Sedentary',         hint: 'Little or no exercise' },
    { value: 'LIGHTLY_ACTIVE',    label: 'Lightly Active',    hint: '1–3 days/week' },
    { value: 'MODERATELY_ACTIVE', label: 'Moderately Active', hint: '3–5 days/week' },
    { value: 'VERY_ACTIVE',       label: 'Very Active',       hint: '6–7 days/week' },
    { value: 'EXTRA_ACTIVE',      label: 'Extra Active',      hint: 'Physical job / 2× training' },
  ];

  readonly riskColors: Record<string, string> = {
    NORMAL:   'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    MODERATE: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
    HIGH:     'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    CRITICAL: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
  };

  readonly trendColors: Record<string, string> = {
    IMPROVING: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    STABLE:    'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
    DECLINING: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
  };

  constructor(
    private route:                ActivatedRoute,
    private fb:                   FormBuilder,
    private service:              NutritionService,
    private profileService:       PatientNutritionProfileService,
    private keycloakService:      KeycloakService,
    private keycloakAdminService: KeycloakAdminService,
  ) {}

  ngOnInit(): void {
    this.loadKeycloakUser();
    this.hospitalizationId = Number(this.route.snapshot.paramMap.get('id'));
    this.initPlanForm();
    this.initMealForm();
    this.initProfileForm();
    this.resolveHospitalizationAndLoad();
  }

  private loadKeycloakUser(): void {
    const token: any = this.keycloakService.getKeycloakInstance().tokenParsed;
    if (!token) return;
    const first = token['given_name']  || '';
    const last  = token['family_name'] || '';
    this.currentUserName = `${first} ${last}`.trim() || token['preferred_username'] || 'Unknown';
  }

  // ── Resolve hospitalization → extract userId ───────────────────────────
  private resolveHospitalizationAndLoad(): void {
    this.service.getHospitalization(this.hospitalizationId).subscribe({
      next: hosp => {
        this.patientUserId = hosp.userId;
        this.loadPlan();
        this.loadProfile();
        this.resolvePatientName(hosp.userId);
      },
      error: () => this.loadPlan()
    });
  }

  private resolvePatientName(userId: string): void {
    this.keycloakAdminService.getUserById(userId).subscribe({
      next: user => {
        this.patientFullName = KeycloakAdminService.displayName(user);
        if (!this.profile) {
          this.profileForm.get('fullName')?.setValue(this.patientFullName);
        }
      },
      error: () => {}
    });
  }

  // ══════════════════════════════════════════════
  //  TAB NAVIGATION
  // ══════════════════════════════════════════════
  setTab(tab: string): void {
    this.activeTab = tab as ActiveTab;
    if (tab === 'summary' && !this.summary)     this.loadSummary();
    if (tab === 'risk'    && !this.risk)         this.loadRisk();
    if (tab === 'trend'   && !this.trend)        this.loadTrend();
    if (tab === 'meals'   && !this.meals.length) this.loadMeals();
    if (tab === 'profile' && !this.profile)      this.loadProfile();
  }

  // ══════════════════════════════════════════════
  //  PLAN
  // ══════════════════════════════════════════════
  private initPlanForm(plan?: NutritionPlan): void {
    this.planForm = this.fb.group({
      dietType:       [plan?.dietType       || '',   Validators.required],
      targetCalories: [plan?.targetCalories ?? null, [Validators.required, Validators.min(500),  Validators.max(5000)]],
      targetProteinG: [plan?.targetProteinG ?? null, [Validators.required, Validators.min(0),    Validators.max(500)]],
      targetCarbsG:   [plan?.targetCarbsG   ?? null, [Validators.required, Validators.min(0),    Validators.max(800)]],
      targetFatG:     [plan?.targetFatG     ?? null, [Validators.required, Validators.min(0),    Validators.max(300)]],
      notes:          [plan?.notes          || '',   Validators.maxLength(255)],
    });
  }

  loadPlan(): void {
    if (!this.hospitalizationId) return;
    this.loadingPlan = true;
    this.planError   = '';
    this.service.getPlan(this.hospitalizationId).subscribe({
      next: plan => {
        this.plan        = plan;
        this.initPlanForm(plan);
        this.loadingPlan = false;
        this.loadSummary();
      },
      error: () => { this.plan = null; this.loadingPlan = false; }
    });
  }

  suggestPlan(): void {
    if (!this.profile) {
      this.planError = 'No patient profile found. Please create the patient profile first.';
      this.activeTab = 'profile';
      return;
    }
    this.loadingPlan = true;
    this.planError   = '';

    const obs$ = this.plan
      ? this.service.reCalculatePlan(this.hospitalizationId)
      : this.service.suggestAndCreate(this.hospitalizationId);

    obs$.subscribe({
      next: plan => {
        this.plan        = plan;
        this.loadingPlan = false;
        this.initPlanForm(plan);
        this.summary = null;
        this.risk    = null;
        this.trend   = null;
        this.loadSummary();
      },
      error: err => {
        if (err.status === 409) {
          this.service.reCalculatePlan(this.hospitalizationId).subscribe({
            next: plan => {
              this.plan        = plan;
              this.loadingPlan = false;
              this.initPlanForm(plan);
              this.summary = null;
              this.risk    = null;
              this.trend   = null;
              this.loadSummary();
            },
            error: () => { this.planError = 'Could not recalculate the plan.'; this.loadingPlan = false; }
          });
        } else {
          this.planError   = err?.error?.message || 'Could not create the plan.';
          this.loadingPlan = false;
        }
      }
    });
  }

  savePlan(): void {
    this.planForm.markAllAsTouched();
    if (this.planForm.invalid || !this.plan?.id) return;
    this.savingPlan = true;
    this.service.updatePlan(this.plan.id, {
      ...this.planForm.getRawValue(),
      prescribedBy: this.currentUserName,
    }).subscribe({
      next: plan => {
        this.plan       = plan;
        this.savingPlan = false;
        this.summary    = null;
        this.risk       = null;
        this.trend      = null;
      },
      error: () => { this.savingPlan = false; }
    });
  }

  planFieldError(field: string, error: string): boolean {
    const ctrl = this.planForm.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  // ══════════════════════════════════════════════
  //  DAILY SUMMARY
  // ══════════════════════════════════════════════
  loadSummary(): void {
    if (!this.plan?.id) return;
    this.loadingSummary = true;
    this.summaryError   = '';
    this.service.getDailySummary(this.plan.id, this.summaryDate).subscribe({
      next: s => { this.summary = s; this.loadingSummary = false; },
      error: () => { this.loadingSummary = false; this.summaryError = 'Could not load summary.'; }
    });
  }

  barColor(pct: number): string {
    if (pct >= 90) return 'bg-success-500';
    if (pct >= 65) return 'bg-warning-400';
    return 'bg-error-400';
  }
  barWidth(pct: number): string { return Math.min(pct, 100) + '%'; }

  // ══════════════════════════════════════════════
  //  RISK
  // ══════════════════════════════════════════════
  loadRisk(): void {
    if (!this.plan?.id) return;
    this.loadingRisk = true;
    this.service.getRisk(this.plan.id).subscribe({
      next: r => { this.risk = r; this.loadingRisk = false; if (this.plan) this.plan.riskLevel = r.riskLevel; },
      error: () => { this.loadingRisk = false; }
    });
  }

  // ══════════════════════════════════════════════
  //  TREND
  // ══════════════════════════════════════════════
  loadTrend(): void {
    if (!this.plan?.id) return;
    this.loadingTrend = true;
    this.service.getWeeklyTrend(this.plan.id).subscribe({
      // ✅ Fixed: was t.trend — backend now returns overallTrend
      next: t => { this.trend = t; this.loadingTrend = false; if (this.plan) this.plan.trend = t.overallTrend; },
      error: () => { this.loadingTrend = false; }
    });
  }

  trendIcon(t: string): string { return t === 'IMPROVING' ? '↑' : t === 'DECLINING' ? '↓' : '→'; }

  achievementColor(pct: number): string {
    if (pct >= 80) return 'text-success-600 dark:text-success-400';
    if (pct >= 60) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  }

  // ══════════════════════════════════════════════
  //  MEALS
  // ══════════════════════════════════════════════
  private initMealForm(): void {
    this.mealForm = this.fb.group({
      mealType:           ['', Validators.required],
      recordedAt:         ['', Validators.required],
      calories:           [null, [Validators.required, Validators.min(0), Validators.max(3000)]],
      proteinG:           [null, [Validators.required, Validators.min(0), Validators.max(400)]],
      carbsG:             [null, [Validators.required, Validators.min(0), Validators.max(600)]],
      fatG:               [null, [Validators.required, Validators.min(0), Validators.max(200)]],
      consumptionPercent: [100,  [Validators.required, Validators.min(0), Validators.max(100)]],
      notes:              ['',   Validators.maxLength(255)],
    });
  }

  loadMeals(): void {
    if (!this.plan?.id) return;
    this.loadingMeals = true;
    this.service.getMeals(this.plan.id).subscribe({
      next: m => { this.meals = m; this.loadingMeals = false; },
      error: () => { this.loadingMeals = false; }
    });
  }

  openMealForm(): void  { this.showMealForm = true; this.mealForm.reset({ consumptionPercent: 100 }); this.mealError = ''; }
  cancelMeal(): void    { this.showMealForm = false; this.mealForm.reset({ consumptionPercent: 100 }); this.mealError = ''; }

  saveMeal(): void {
    this.mealForm.markAllAsTouched();
    if (this.mealForm.invalid || !this.plan?.id) return;
    this.savingMeal = true;
    const raw = this.mealForm.getRawValue();
    const meal: MealRecord = {
      ...raw,
      recordedAt: raw.recordedAt ? raw.recordedAt + ':00' : undefined,
      recordedBy: this.currentUserName,
    };
    this.service.addMeal(this.plan.id, meal).subscribe({
      next: m => {
        this.meals.unshift(m);
        this.savingMeal = false; this.showMealForm = false;
        this.mealForm.reset({ consumptionPercent: 100 });
        this.summary = null; this.risk = null; this.trend = null;
      },
      error: err => { this.mealError = err?.error?.message || 'Could not save meal.'; this.savingMeal = false; }
    });
  }

  deleteMeal(id: number | undefined): void {
    if (!id || !confirm('Delete this meal record?')) return;
    this.service.deleteMeal(id).subscribe({
      next: () => { this.meals = this.meals.filter(m => m.id !== id); this.summary = null; }
    });
  }

  mealFieldError(field: string, error: string): boolean {
    const ctrl = this.mealForm.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  mealTypeLabel(value: string): string { return this.mealTypes.find(t => t.value === value)?.label ?? value; }

  consumptionBarColor(pct: number): string {
    if (pct >= 80) return 'bg-success-500';
    if (pct >= 50) return 'bg-warning-400';
    return 'bg-error-400';
  }

  // ══════════════════════════════════════════════
  //  PATIENT PROFILE
  // ══════════════════════════════════════════════
  private initProfileForm(p?: PatientNutritionProfile): void {
    this.profileForm = this.fb.group({
      fullName:        [p?.fullName        || '',   Validators.required],
      age:             [p?.age             ?? null, [Validators.required, Validators.min(0),   Validators.max(130)]],
      gender:          [p?.gender          || '',   Validators.required],
      weightKg:        [p?.weightKg        ?? null, [Validators.required, Validators.min(1),   Validators.max(500)]],
      heightCm:        [p?.heightCm        ?? null, [Validators.required, Validators.min(50),  Validators.max(250)]],
      ckdStage:        [p?.ckdStage        ?? null, [Validators.required, Validators.min(1),   Validators.max(5)]],
      gfr:             [p?.gfr             ?? null, [Validators.required, Validators.min(0),   Validators.max(200)]],
      creatinineLevel: [p?.creatinineLevel ?? null, [Validators.required, Validators.min(0),   Validators.max(50)]],
      diabetic:        [p?.diabetic        ?? false],
      hypertensive:    [p?.hypertensive    ?? false],
      activityLevel:   [p?.activityLevel   || '',   Validators.required],
    });
  }

  loadProfile(): void {
    if (!this.patientUserId) return;
    this.loadingProfile = true;
    this.profileService.getByUserId(this.patientUserId).subscribe({
      next: p => {
        this.profile = p;
        this.loadingProfile = false;
        this.initProfileForm(p);
      },
      error: () => {
        this.profile = null;
        this.loadingProfile = false;
        if (this.patientFullName) {
          this.profileForm.get('fullName')?.setValue(this.patientFullName);
        }
      }
    });
  }

  saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;
    this.savingProfile  = true;
    this.profileError   = '';
    this.profileSuccess = '';

    const payload: PatientNutritionProfile = {
      ...this.profileForm.getRawValue(),
      userId: this.patientUserId,
    };

    const obs = this.profile?.id
      ? this.profileService.update(this.profile.id, payload)
      : this.profileService.create(payload);

    obs.subscribe({
      next: p => {
        this.profile        = p;
        this.savingProfile  = false;
        this.profileSuccess = 'Profile saved successfully.';
        this.initProfileForm(p);
        setTimeout(() => { this.profileSuccess = ''; }, 3000);
      },
      error: err => { this.profileError = err?.error?.message || 'Could not save profile.'; this.savingProfile = false; }
    });
  }

  profileFieldError(field: string, error: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched));
  }

  get bmi(): number | null {
    const w = this.profileForm?.get('weightKg')?.value;
    const h = this.profileForm?.get('heightCm')?.value;
    if (!w || !h) return null;
    const hM = h / 100;
    return Math.round((w / (hM * hM)) * 10) / 10;
  }

  get bmiCategory(): string {
    const b = this.bmi;
    if (b === null) return '';
    if (b < 18.5) return 'Underweight';
    if (b < 25)   return 'Normal weight';
    if (b < 30)   return 'Overweight';
    return 'Obese';
  }

  get bmiColor(): string {
    const b = this.bmi;
    if (b === null) return 'text-gray-400';
    if (b < 18.5 || b >= 25) return 'text-warning-600 dark:text-warning-400';
    if (b >= 30)              return 'text-error-600 dark:text-error-400';
    return 'text-success-600 dark:text-success-400';
  }
}