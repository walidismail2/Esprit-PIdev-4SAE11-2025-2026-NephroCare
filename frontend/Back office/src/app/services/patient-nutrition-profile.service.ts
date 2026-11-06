// src/app/services/patient-nutrition-profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PatientNutritionProfile {
  id?:               number;
  userId:            string;
  fullName:          string;
  age:               number;
  gender:            'MALE' | 'FEMALE' | 'OTHER';
  weightKg:          number;
  heightCm:          number;
  ckdStage:          number;
  gfr:               number;
  creatinineLevel:   number;
  diabetic:          boolean;
  hypertensive:      boolean;
  activityLevel:     'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE';
}

@Injectable({ providedIn: 'root' })
export class PatientNutritionProfileService {

  private readonly base = `${environment.apiUrl}/hospitalization/api/nutrition/profiles`;

  constructor(private http: HttpClient) {}

  getByUserId(userId: string): Observable<PatientNutritionProfile> {
    return this.http.get<PatientNutritionProfile>(`${this.base}/user/${userId}`);
  }

  create(profile: PatientNutritionProfile): Observable<PatientNutritionProfile> {
    return this.http.post<PatientNutritionProfile>(this.base, profile);
  }

  update(id: number, profile: PatientNutritionProfile): Observable<PatientNutritionProfile> {
    return this.http.put<PatientNutritionProfile>(`${this.base}/${id}`, profile);
  }
}