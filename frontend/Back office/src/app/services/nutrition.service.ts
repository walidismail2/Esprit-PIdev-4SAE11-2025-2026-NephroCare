// src/app/services/nutrition.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NutritionPlan {
  id?:                number;
  dietType:           string;
  targetCalories:     number;
  targetProteinG:     number;
  targetCarbsG:       number;
  targetFatG:         number;
  notes?:             string;
  prescribedBy?:      string;
  createdAt?:         string;
  riskLevel?:         string;
  trend?:             string;
  hospitalizationId?: number;
}

export interface MealRecord {
  id?:                number;
  mealType:           string;
  recordedAt?:        string;
  calories:           number;
  proteinG:           number;
  carbsG:             number;
  fatG:               number;
  consumptionPercent: number;
  notes?:             string;
  recordedBy?:        string;
}

export interface DailySummary {
  date:            string;
  consumed:        { calories: number; proteinG: number; carbsG: number; fatG: number };
  achievementPct:  { calories: number; protein: number; carbs: number; fat: number };
  meals:           MealRecord[];
  recommendations: string[];
}

export interface RiskAssessment {
  riskLevel:                string;
  consecutiveLowDays:       number;
  averageCompositeScore:    number;
  volatilityScore:          number;
  macroAverageAchievements: Record<string, number>;  // ← was { calories: number; protein: number; carbs: number; fat: number; }
  appliedWeights: Record<string, number>;
  triggers:       string[];
}

export interface MacroTrend {
  trend:   string;
  slope:   number;
  weekAvg: number;
}

export interface TrendPoint {
  date:               string;
  calories:           number;
  proteinG:           number;
  carbsG:             number;
  fatG:               number;
  calorieAchievement: number;
  proteinAchievement: number;
  carbAchievement:    number;
  fatAchievement:     number;
  weightedComposite:  number;
}

export interface WeeklyTrend {
  overallTrend:               string;
  overallSlope:               number;
  macroTrends:                Record<string, MacroTrend>;
  points:                     TrendPoint[];
  patterns:                   string[];
  appliedWeights:             Record<string, number>;
  estimatedDaysUntilCritical?: number;
}

// Lightweight shape — only the 4 fields the nutrition module needs.
export interface HospitalizationInfo {
  id:              number;
  userId:          string;
  admissionReason: string;
  status:          string;
}

@Injectable({ providedIn: 'root' })
export class NutritionService {

  private readonly base = `${environment.apiUrl}/hospitalization/api/nutrition`;

  constructor(private http: HttpClient) {}

  // ── Lightweight hospitalization lookup ────────────────────────────────
  getHospitalization(id: number): Observable<HospitalizationInfo> {
    return this.http.get<HospitalizationInfo>(`${this.base}/hosp-info/${id}`);
  }

  reCalculatePlan(hospitalizationId: number): Observable<NutritionPlan> {
    return this.http.put<NutritionPlan>(`${this.base}/plan/suggest/${hospitalizationId}`, {});
  }

  // ── Plan ──────────────────────────────────────────────────────────────
  suggestAndCreate(hospitalizationId: number): Observable<NutritionPlan> {
    return this.http.post<NutritionPlan>(`${this.base}/plan/suggest/${hospitalizationId}`, {});
  }

  getPlan(hospitalizationId: number): Observable<NutritionPlan> {
    return this.http.get<NutritionPlan>(`${this.base}/plan/${hospitalizationId}`);
  }

  updatePlan(planId: number, plan: Partial<NutritionPlan>): Observable<NutritionPlan> {
    return this.http.put<NutritionPlan>(`${this.base}/plan/${planId}`, plan);
  }

  // ── Feature 2 ─────────────────────────────────────────────────────────
  getDailySummary(planId: number, date?: string): Observable<DailySummary> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<DailySummary>(`${this.base}/plan/${planId}/summary`, { params });
  }

  // ── Feature 3 ─────────────────────────────────────────────────────────
  getRisk(planId: number): Observable<RiskAssessment> {
    return this.http.get<RiskAssessment>(`${this.base}/plan/${planId}/risk`);
  }

  // ── Feature 4 ─────────────────────────────────────────────────────────
  getWeeklyTrend(planId: number): Observable<WeeklyTrend> {
    return this.http.get<WeeklyTrend>(`${this.base}/plan/${planId}/trend`);
  }

  // ── Meals ─────────────────────────────────────────────────────────────
  getMeals(planId: number): Observable<MealRecord[]> {
    return this.http.get<MealRecord[]>(`${this.base}/plan/${planId}/meals`);
  }

  addMeal(planId: number, meal: MealRecord): Observable<MealRecord> {
    return this.http.post<MealRecord>(`${this.base}/plan/${planId}/meals`, meal);
  }

  deleteMeal(mealId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/meals/${mealId}`);
  }
}