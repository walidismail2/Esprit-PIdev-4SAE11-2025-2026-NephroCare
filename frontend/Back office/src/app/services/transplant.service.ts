import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TransplantCandidacy {
  id?: number;
  patientId: number;
  status: string;
  eligibilityScore?: number;
  eligibilityNotes?: string;
  ecdSuitable?: boolean;
  livingDonorSuitable?: boolean;
  hlaLevel?: string;
  panelReactiveAntibody?: number;
  cardiovascularClearance?: boolean;
  infectiousDiseaseCleanance?: boolean;
  psychologicalClearance?: boolean;
  socialSupportAssessment?: boolean;
  contraindications?: string;
  dialysisModality?: string;
  waitlistDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}

export interface PreoperativeAssessment {
  id?: number;
  patientId: number;
  assessmentDate?: Date;
  ecgResult?: string;
  echocardiogramResult?: string;
  stressTestResult?: string;
  ejectionFraction?: number;
  cardiacClearance?: boolean;
  hivStatus?: string;
  hepBStatus?: string;
  hepCStatus?: string;
  cmvStatus?: string;
  ebvStatus?: string;
  tbScreening?: string;
  idClearance?: boolean;
  pulmonaryFunctionTest?: string;
  chestXrayResult?: string;
  pulmonaryClearance?: boolean;
  preAssessmentCreatinine?: number;
  preAssessmentGFR?: number;
  urineProteinLevel?: string;
  psychiatricEvaluation?: string;
  patientComplianceScore?: number;
  psychiatricClearance?: boolean;
  dentalExamDate?: Date;
  dentalTreatmentNeeded?: boolean;
  dentalClearance?: boolean;
  overallRiskScore?: number;
  status?: string;
  recommendations?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  assessedBy?: number;
}

export interface TransplantAiRecommendation {
  summary: string;
  riskLevel: string;
  recommendation: string;
  reasons: string[];
  disclaimer: string;
}

export interface TransplantAiRecommendationEnvelope {
  patientId: number;
  candidacyId: number;
  generatedAt: string;
  recommendation: TransplantAiRecommendation;
}

@Injectable({
  providedIn: 'root'
})
export class TransplantService {
  private apiUrl = `${environment.apiUrl}/clinical/api`;

  constructor(private http: HttpClient) { }

  // Transplant Candidacy
  createCandidacy(candidacy: TransplantCandidacy, createdBy?: number): Observable<TransplantCandidacy> {
    return this.http.post<TransplantCandidacy>(
      `${this.apiUrl}/transplant-candidacy`,
      candidacy,
      { params: createdBy ? { createdBy: createdBy.toString() } : {} }
    );
  }

  updateCandidacy(id: number, candidacy: TransplantCandidacy): Observable<TransplantCandidacy> {
    return this.http.put<TransplantCandidacy>(`${this.apiUrl}/transplant-candidacy/${id}`, candidacy);
  }

  getCandidacyByPatientId(patientId: number): Observable<TransplantCandidacy> {
    return this.http.get<TransplantCandidacy>(`${this.apiUrl}/transplant-candidacy/patient/${patientId}`);
  }

  getCandidacyById(id: number): Observable<TransplantCandidacy> {
    return this.http.get<TransplantCandidacy>(`${this.apiUrl}/transplant-candidacy/${id}`);
  }

  getAllCandidacies(): Observable<TransplantCandidacy[]> {
    return this.http.get<TransplantCandidacy[]>(`${this.apiUrl}/transplant-candidacy`);
  }

  getCandidaciesByStatus(status: string): Observable<TransplantCandidacy[]> {
    return this.http.get<TransplantCandidacy[]>(`${this.apiUrl}/transplant-candidacy/status/${status}`);
  }

  deleteCandidacy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transplant-candidacy/${id}`);
  }

  generateAiRecommendation(candidacyId: number): Observable<TransplantAiRecommendationEnvelope> {
    return this.http.post<TransplantAiRecommendationEnvelope>(
      `${this.apiUrl}/transplant-candidacy/${candidacyId}/ai-recommendation`,
      {}
    );
  }

  // Preoperative Assessment
  createAssessment(assessment: PreoperativeAssessment, assessedBy?: number): Observable<PreoperativeAssessment> {
    return this.http.post<PreoperativeAssessment>(
      `${this.apiUrl}/preoperative-assessment`,
      assessment,
      { params: assessedBy ? { assessedBy: assessedBy.toString() } : {} }
    );
  }

  updateAssessment(id: number, assessment: PreoperativeAssessment): Observable<PreoperativeAssessment> {
    return this.http.put<PreoperativeAssessment>(`${this.apiUrl}/preoperative-assessment/${id}`, assessment);
  }

  getAssessmentByPatientId(patientId: number): Observable<PreoperativeAssessment> {
    return this.http.get<PreoperativeAssessment>(`${this.apiUrl}/preoperative-assessment/patient/${patientId}`);
  }

  getAssessmentHistory(patientId: number): Observable<PreoperativeAssessment[]> {
    return this.http.get<PreoperativeAssessment[]>(`${this.apiUrl}/preoperative-assessment/patient/${patientId}/history`);
  }

  getAssessmentById(id: number): Observable<PreoperativeAssessment> {
    return this.http.get<PreoperativeAssessment>(`${this.apiUrl}/preoperative-assessment/${id}`);
  }

  getAllAssessments(): Observable<PreoperativeAssessment[]> {
    return this.http.get<PreoperativeAssessment[]>(`${this.apiUrl}/preoperative-assessment`);
  }

  getAssessmentsByStatus(status: string): Observable<PreoperativeAssessment[]> {
    return this.http.get<PreoperativeAssessment[]>(`${this.apiUrl}/preoperative-assessment/status/${status}`);
  }

  deleteAssessment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/preoperative-assessment/${id}`);
  }
}
