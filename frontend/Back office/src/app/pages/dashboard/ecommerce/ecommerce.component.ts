import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClinicalService, DoctorEfficiencyMetric } from '../../../services/clinical.service';
import { KeycloakAdminService, KeycloakUser } from '../../../services/keycloak-admin.service';

type DashboardModule = {
  name: string;
  description: string;
  route: string;
  status: 'active' | 'monitoring';
};

type RoleArea = {
  role: string;
  responsibilities: string;
};

@Component({
  selector: 'app-ecommerce',
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent implements OnInit {
  readonly today = new Date();
  doctorEfficiency: DoctorEfficiencyMetric[] = [];
  loadingDoctorEfficiency = true;
  doctorEfficiencyError: string | null = null;
  doctorNameById: Record<number, string> = {};

  readonly projectModules: DashboardModule[] = [
    {
      name: 'Clinical Module',
      description: 'Consultations, medical histories, triage queue and doctor assignment flows.',
      route: '/clinical',
      status: 'active'
    },
    {
      name: 'Hospitalization Module',
      description: 'In-patient records, room follow-up, vitals and doctor workload statistics.',
      route: '/hospitalization',
      status: 'active'
    },
    {
      name: 'Consultations Calendar',
      description: 'Operational schedule view for patient and doctor consultation planning.',
      route: '/consultations-calendar',
      status: 'active'
    },
    {
      name: 'Hospitalization Analytics',
      description: 'Occupancy, trends and service-level indicators for inpatient monitoring.',
      route: '/statistique-hospitalization',
      status: 'monitoring'
    },
    {
      name: 'Pharmacy Module',
      description: 'Medication workflows, prescription support and stock operations.',
      route: '/pharmacy',
      status: 'active'
    },
    {
      name: 'Pharmacy Stock Analytics',
      description: 'Stock trends, movement indicators and pharmacy performance insights.',
      route: '/statistique-pharmacy',
      status: 'monitoring'
    },
    {
      name: 'Diagnostic Module',
      description: 'Diagnostic orders and result management for lab and imaging processes.',
      route: '/diagnostic',
      status: 'active'
    },
    {
      name: 'Diagnostic Results',
      description: 'Structured review of lab findings and image interpretation records.',
      route: '/diagnostic-result',
      status: 'active'
    },
    {
      name: 'Dialysis Management',
      description: 'Treatment plan/session execution and patient dialysis lifecycle follow-up.',
      route: '/dialysis/treatments',
      status: 'monitoring'
    },
    {
      name: 'Dialysis Settings',
      description: 'Administrative parameters and configuration for dialysis operations.',
      route: '/dialysis/admin/settings',
      status: 'monitoring'
    },
    {
      name: 'User & Access',
      description: 'Role-based access via Keycloak, profile controls and operational security.',
      route: '/profile',
      status: 'active'
    }
  ];

  readonly roleAreas: RoleArea[] = [
    { role: 'Doctor', responsibilities: 'Diagnosis, triage care start, and consultation decisions.' },
    { role: 'Nurse', responsibilities: 'Vital signs tracking and inpatient follow-up operations.' },
    { role: 'Pharmacist', responsibilities: 'Prescription flow and medication validation pipeline.' },
    { role: 'Lab / Radiology', responsibilities: 'Diagnostic result entry and imaging/lab workflows.' },
    { role: 'Admin', responsibilities: 'System governance, account lifecycle, and module supervision.' }
  ];

  constructor(
    private clinicalService: ClinicalService,
    private keycloakAdminService: KeycloakAdminService
  ) {}

  ngOnInit(): void {
    this.loadKeycloakDoctorNames();
    this.loadDoctorEfficiency();
  }

  get topDoctorEfficiency(): DoctorEfficiencyMetric[] {
    return this.doctorEfficiency.slice(0, 5);
  }

  get bestEfficiencyScore(): number {
    return this.topDoctorEfficiency.length > 0 ? this.topDoctorEfficiency[0].efficiencyScore : 0;
  }

  get averageSlaRespectRate(): number {
    if (this.topDoctorEfficiency.length === 0) {
      return 0;
    }
    const total = this.topDoctorEfficiency.reduce((sum, item) => sum + item.slaRespectRate, 0);
    return total / this.topDoctorEfficiency.length;
  }

  get totalTrackedCases(): number {
    return this.topDoctorEfficiency.reduce((sum, item) => sum + item.assignedCases, 0);
  }

  getEfficiencyTone(score: number): string {
    if (score >= 80) {
      return 'Excellent';
    }
    if (score >= 60) {
      return 'Good';
    }
    if (score >= 40) {
      return 'Average';
    }
    return 'Low';
  }

  getEfficiencyToneClass(score: number): string {
    if (score >= 80) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    }
    if (score >= 60) {
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300';
    }
    if (score >= 40) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    }
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
  }

  getDoctorLabel(doctorId: number | null | undefined): string {
    if (doctorId == null) {
      return 'Unknown doctor';
    }

    const name = this.doctorNameById[doctorId];
    return name ? `Dr ${name}` : 'Unknown doctor';
  }

  private loadDoctorEfficiency(): void {
    this.loadingDoctorEfficiency = true;
    this.doctorEfficiencyError = null;
    this.clinicalService.getDoctorEfficiency().subscribe({
      next: (metrics) => {
        this.doctorEfficiency = metrics ?? [];
        this.loadingDoctorEfficiency = false;
      },
      error: (err) => {
        this.loadingDoctorEfficiency = false;
        this.doctorEfficiencyError = err.message || 'Failed to load doctor efficiency metrics';
      }
    });
  }

  private loadKeycloakDoctorNames(): void {
    this.keycloakAdminService.getUsersByRole('doctor').subscribe({
      next: (users) => {
        users.forEach((user) => {
          const doctorId = this.resolveNumericIdFromUser(user, ['doctorId', 'userId', 'id']);
          if (doctorId != null) {
            this.doctorNameById[doctorId] = KeycloakAdminService.displayName(user);
          }
        });
      }
    });
  }

  private resolveNumericIdFromUser(user: KeycloakUser, keys: string[]): number | null {
    for (const key of keys) {
      const candidate = user.attributes?.[key]?.[0] ?? (user as any)[key];
      const parsed = this.parsePositiveId(candidate);
      if (parsed != null) {
        return parsed;
      }
    }

    const fallbackCandidates = [user.username, user.email, user.id, user.attributes];
    for (const candidate of fallbackCandidates) {
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
}
