// alert-table.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService, Alert, AlertCreateDTO } from '../services/alert.service';
import { KeycloakAdminService, KeycloakUser } from '../services/keycloak-admin.service';

@Component({
  selector: 'app-alert-table',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SlicePipe],
  templateUrl: './Alert.component.html',
  styles: [`
    .page-shell { padding: 2rem; background-color: #f8fafc; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header-left {} .module-tag { font-size: 0.8rem; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; }
    .page-title { margin: 0.5rem 0 0; font-size: 1.75rem; font-weight: 700; color: #1e293b; }
    .header-right { display: flex; gap: 1rem; align-items: center; }
    .search-wrap { position: relative; }
    .search-input { padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 8px; width: 250px; font-size: 0.9rem; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .filter-select { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: white; cursor: pointer; }
    .btn-create { background: #6366f1; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .tabs { display: flex; margin-bottom: 1.5rem; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .tab-btn { flex: 1; padding: 0.85rem 0.5rem; font-size: 0.78rem; font-weight: 600; border: none; background: transparent; cursor: pointer; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .tab-btn.active { color: #6366f1; border-bottom-color: #6366f1; background: #eef2ff; }
    .tab-btn:hover:not(.active) { background: #f8fafc; }
    .metrics-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; overflow-x: auto; }
    .metric { background: white; padding: 1.25rem 1rem; border-radius: 12px; flex: 1; min-width: 120px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; border-bottom: 4px solid #e2e8f0; }
    .metric-value { font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 0.4rem; }
    .metric-label { font-size: 0.68rem; text-transform: uppercase; font-weight: 600; color: #64748b; letter-spacing: 0.5px; }
    .feature-panel { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
    .feature-panel h3 { margin: 0 0 0.5rem; font-size: 1.1rem; color: #1e293b; }
    .desc { color: #64748b; font-size: 0.85rem; margin: 0 0 1.2rem; }
    .panel-form { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field label { font-size: 0.78rem; font-weight: 600; color: #475569; text-transform: uppercase; }
    .field input, .field select { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-width: 160px; }
    .wide-input { min-width: 280px !important; }
    .short-input { min-width: 90px !important; }
    .btn-run { background: #6366f1; color: white; border: none; padding: 0.55rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .btn-run:hover { background: #4f46e5; }
    .btn-run.btn-danger { background: #ef4444; }
    .btn-run.btn-danger:hover { background: #dc2626; }
    .btn-run:disabled { opacity: 0.5; cursor: not-allowed; }
    .result-box { margin-top: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; max-height: 380px; overflow-y: auto; }
    .result-box pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 0.85rem; color: #1e293b; }
    .result-count { font-weight: 600; color: #6366f1; margin: 0 0 0.5rem; }
    .success-msg { font-weight: 700; color: #10b981; margin: 0 0 0.75rem; }
    .err-msg { color: #ef4444; margin-top: 1rem; font-size: 0.9rem; }
    .empty-msg { color: #64748b; text-align: center; padding: 1rem; margin: 0; }
    .state-msg { text-align: center; padding: 2rem; color: #64748b; margin: 0; }
    .state-msg.err { color: #ef4444; font-weight: 600; }
    .table-wrap { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 1rem 1.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #475569; border-bottom: 2px solid #e2e8f0; font-weight: 700; }
    .data-table td { padding: 0.9rem 1.5rem; font-size: 0.9rem; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table-row:hover { background-color: #f8fafc; }
    .row-resolved td { opacity: 0.55; }
    .msg-cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date-cell { font-size: 0.82rem; color: #64748b; }
    .chip { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 0.82rem; color: #475569; }
    .table-footer { padding: 1rem 1.5rem; font-size: 0.85rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
    .sev-pill { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; }
    .sev-dot { width: 8px; height: 8px; border-radius: 50%; }
    .sev-CRITICAL { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
    .sev-CRITICAL .sev-dot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .sev-HIGH { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }
    .sev-HIGH .sev-dot { background: #f97316; }
    .sev-MEDIUM { background: #fefce8; color: #eab308; border: 1px solid #fef9c3; }
    .sev-MEDIUM .sev-dot { background: #eab308; }
    .sev-LOW { background: #f0fdf4; color: #10b981; border: 1px solid #dcfce7; }
    .sev-LOW .sev-dot { background: #10b981; }
    .status-pill { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .status-active { background: #dbeafe; color: #1e40af; }
    .status-done { background: #e2e8f0; color: #475569; }
    .act-btn { border: none; background: transparent; cursor: pointer; border-radius: 4px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .act-btn:hover { background: #f1f5f9; }
    .act-btn.danger:hover { background: #fee2e2; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem; }
    .col-title { margin: 0 0 0.75rem; font-size: 0.95rem; font-weight: 700; }
    .col-title.orange { color: #f97316; } .col-title.red { color: #ef4444; } .col-title.purple { color: #6366f1; }
    .mini-row { display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
    .mini-row:last-child { border-bottom: none; }
    .mini-msg { flex: 1; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 1rem; text-align: center; border: 1px solid #e2e8f0; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #6366f1; }
    .stat-key { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .dash-card { background: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 1.25rem; border-left: 5px solid #ef4444; }
    .dash-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .dash-card-msg { font-weight: 600; color: #991b1b; margin-bottom: 0.5rem; }
    .dash-card-footer { display: flex; justify-content: space-between; font-size: 0.82rem; color: #b91c1c; }
    .dash-empty { text-align: center; padding: 3rem; color: #64748b; font-size: 1.1rem; margin-top: 1rem; }
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); z-index: 999; display: flex; justify-content: center; align-items: center; }
    .modal-box { background: white; padding: 2.5rem; border-radius: 16px; min-width: 480px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .modal-title { margin: 0 0 1.5rem; font-size: 1.25rem; color: #1e293b; }
    .modal-field { margin-bottom: 1rem; }
    .modal-field label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; }
    .modal-field input, .modal-field select, .modal-field textarea { width: 100%; padding: 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; }
    .modal-field textarea { resize: vertical; }
    .modal-row { display: flex; gap: 1rem; }
    .modal-row .modal-field { flex: 1; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .btn-cancel { padding: 0.6rem 1.2rem; background: #f1f5f9; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; }
    .btn-submit { padding: 0.6rem 1.4rem; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Premium Modal Styles */
    .premium-modal { border-radius: 24px !important; padding: 3rem !important; }
    .modal-header { text-align: center; margin-bottom: 2rem; }
    .modal-subtitle { color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; }
    .req { color: #ef4444; }
    .modal-input, .modal-textarea { 
      width: 100%; padding: 0.75rem 1rem !important; border: 1.5px solid #e2e8f0 !important; 
      border-radius: 12px !important; background: #f8fafc !important; transition: all 0.3s;
    }
    .modal-input:focus, .modal-textarea:focus { border-color: #6366f1 !important; background: white !important; outline: none; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
    .select-wrapper { position: relative; }
    .select-wrapper::after { content: '▼'; position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-size: 0.7rem; color: #64748b; pointer-events: none; }
    .modal-input { appearance: none; }
    .error-msg { color: #ef4444; font-size: 0.75rem; font-weight: 600; margin-top: 0.4rem; }
    .btn-submit { transition: all 0.3s; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
    .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(99, 102, 241, 0.3); }

    /* Result UI Enhancements */
    .success-alert { display: flex; align-items: center; gap: 0.75rem; color: #10b981; font-weight: 700; margin-bottom: 1rem; padding: 0.5rem; background: #ecfdf5; border-radius: 8px; }
    .success-alert i { font-size: 1.25rem; }
    .result-details { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:first-child { color: #64748b; font-weight: 500; }
    .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem; }
    .text-indigo { color: #6366f1; }
  `]
})
export class AlertTableComponent implements OnInit {

  // ── Tab state ─────────────────────────────────────────────────
  activeTab: 'list' | 'active' | 'severity' | 'resolve' | 'diagnostic' | 'patient' | 'dashboard' = 'list';

  // ── CRUD state ────────────────────────────────────────────────
  alerts: Alert[] = [];
  filtered: Alert[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  filterSeverity = '';
  filterResolved = '';
  showCreate = false;
  showEdit = false;
  editingAlert: any = null;
  patients: KeycloakUser[] = [];

  newAlert: AlertCreateDTO = {
    message: '', value: 0, type: 'CREATININE', patientMatricule: '', severity: 'MEDIUM'
  };

  editAlertDto: any = {
    message: '', value: 0, kidneyFunctionStage: ''
  };

  // ── F1: Active alerts ─────────────────────────────────────────
  activeAlerts: Alert[] = [];
  criticalAlerts: Alert[] = [];
  activeLoading = false;

  // ── F2: Filter by severity ────────────────────────────────────
  severityFilter: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH';
  severityResult: Alert[] = [];
  severityError = '';

  // ── F3: Resolve ───────────────────────────────────────────────
  resolveId = '';
  resolveHandledBy = '';
  resolveResult: Alert | null = null;
  resolveError = '';

  // ── F4: From diagnostic ───────────────────────────────────────
  diagAgeYears = 20; // Saisie en années dans l'UI → converti en mois à l'envoi
  diagDto = {
    patientMatricule: '',   // String
    testType: 'CREATININE', // TestType enum
    numericValue: 0.0,      // Double ← Java: numericValue (pas "value")
    orderId: '',            // String @NotBlank ← OBLIGATOIRE
    abnormal: true,         // boolean
    patientAgeMonths: 240,  // Integer (calculé depuis diagAgeYears × 12)
    weight: 70.0            // Double (kg)
  };
  diagResult: Alert | null = null;
  diagError = '';

  // ── F5 + F7: Patient  ─────────────────────────────────────────
  patientMatricule = '';
  patientCritical: Alert[] = [];
  patientStats: { [key: string]: number } | null = null;
  patientError = '';

  // ── F6: Dashboard ─────────────────────────────────────────────
  dashboardAlerts: Alert[] = [];
  dashLoading = false;

  constructor(
    private alertService: AlertService,
    private keycloakAdmin: KeycloakAdminService
  ) { }

  ngOnInit(): void { 
    this.load();
    this.loadPatients();
  }

  // ── Chargement ───────────────────────────────────────────────
  load(): void {
    this.loading = true;
    this.error = '';
    this.alertService.getAll().subscribe({
      next: data => { this.alerts = data; this.applyFilters(); this.loading = false; },
      error: () => { this.error = 'Erreur de chargement (CORS non configuré ?).'; this.loading = false; }
    });
  }

  loadPatients(): void {
    this.keycloakAdmin.getUsersByRole('patient').subscribe(data => {
      this.patients = data || [];
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();
    this.filtered = this.alerts.filter(a => {
      const matchSearch = !term ||
        (a.message || '').toLowerCase().includes(term) ||
        (a.patientMatricule ? a.patientMatricule.toLowerCase().includes(term) : false) ||
        (a.type || '').toLowerCase().includes(term);
      const matchSev = !this.filterSeverity || a.severity === this.filterSeverity;
      const matchRes = this.filterResolved === '' ? true :
        this.filterResolved === 'true' ? a.resolved : !a.resolved;
      return matchSearch && matchSev && matchRes;
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────
  submitCreate(): void {
    this.alertService.create(this.newAlert).subscribe({
      next: () => { this.showCreate = false; this.load(); alert('Alerte créée !'); },
      error: (err) => alert('Erreur création: ' + (err.error?.message || err.message))
    });
  }

  openEdit(a: Alert): void {
    this.editingAlert = { ...a };
    this.editAlertDto = {
      message: a.message,
      value: a.value,
      kidneyFunctionStage: a.kidneyFunctionStage
    };
    this.showEdit = true;
  }

  submitEdit(): void {
    if (!this.editingAlert) return;
    this.alertService.update(this.editingAlert.id, this.editAlertDto).subscribe({
      next: () => {
        this.showEdit = false;
        this.load();
        alert('Alerte mise à jour !');
      },
      error: (err) => alert('Erreur modification: ' + (err.error?.message || err.message))
    });
  }

  deleteAlert(id: string): void {
    if (!confirm('Supprimer cette alerte ?')) return;
    this.alertService.delete(id).subscribe({ next: () => this.load() });
  }

  // ── F1: Active + Critical ─────────────────────────────────────
  loadActive(): void {
    this.activeLoading = true;
    this.activeAlerts = [];
    this.criticalAlerts = [];
    this.alertService.getActive().subscribe({
      next: d => { this.activeAlerts = d; },
      error: (err) => alert('Erreur active: ' + err.message)
    });
    this.alertService.getCritical().subscribe({
      next: d => { this.criticalAlerts = d; this.activeLoading = false; },
      error: () => { this.activeLoading = false; }
    });
  }

  // ── F2: By Severity ───────────────────────────────────────────
  runSeverityFilter(): void {
    this.severityResult = [];
    this.severityError = '';
    this.alertService.getBySeverity(this.severityFilter).subscribe({
      next: d => this.severityResult = d,
      error: (err) => this.severityError = err.error?.message || 'Erreur filtre sévérité.'
    });
  }

  // ── F3: Resolve ───────────────────────────────────────────────
  runResolve(): void {
    this.resolveResult = null;
    this.resolveError = '';
    this.alertService.resolve(this.resolveId, this.resolveHandledBy).subscribe({
      next: d => { this.resolveResult = d; this.load(); },
      error: (err) => this.resolveError = err.error?.message || 'Erreur résolution.'
    });
  }

  // ── F4: From Diagnostic ───────────────────────────────────────
  runFromDiagnostic(): void {
    this.diagResult = null;
    this.diagError = '';
    this.alertService.create(this.diagDto as any).subscribe({
      next: d => this.diagResult = d,
      error: (err) => this.diagError = err.error?.message || 'Erreur diagnostic.'
    });
  }

  runFromDiagnosticEndpoint(): void {
    this.diagResult = null;
    this.diagError = '';
    // Convertir les années en mois avant envoi au backend Java
    this.diagDto.patientAgeMonths = Math.round(this.diagAgeYears * 12);
    const http = (this.alertService as any).http;
    const api = (this.alertService as any).API;
    http.post(`${api}/from-diagnostic`, this.diagDto).subscribe({
      next: (d: Alert) => this.diagResult = d,
      error: (err: any) => this.diagError = err.error?.message || 'Erreur diagnostic.'
    });
  }

  // ── F5 + F7: Patient ─────────────────────────────────────────
  runPatientCritical(): void {
    this.patientCritical = [];
    this.patientError = '';
    this.alertService.getCriticalForPatient(this.patientMatricule).subscribe({
      next: d => this.patientCritical = d,
      error: (err) => this.patientError = err.error?.message || 'Aucune alerte critique trouvée.'
    });
  }

  runPatientStats(): void {
    this.patientStats = null;
    this.patientError = '';
    this.alertService.getPatientStats(this.patientMatricule).subscribe({
      next: d => this.patientStats = d,
      error: (err) => this.patientError = err.error?.message || 'Erreur stats patient.'
    });
  }

  // ── F6: Dashboard ─────────────────────────────────────────────
  loadDashboard(): void {
    this.dashLoading = true;
    this.dashboardAlerts = [];
    this.alertService.getRecentCritical().subscribe({
      next: d => { this.dashboardAlerts = d; this.dashLoading = false; },
      error: (err) => { alert('Erreur dashboard: ' + err.message); this.dashLoading = false; }
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────
  get metricsData() {
    return [
      { label: 'TOTAL', value: this.alerts.length, color: '#6366f1' },
      { label: 'ACTIVES', value: this.alerts.filter(a => !a.resolved).length, color: '#f97316' },
      { label: 'RÉSOLUES', value: this.alerts.filter(a => a.resolved).length, color: '#10b981' },
      { label: 'CRITICAL', value: this.alerts.filter(a => a.severity === 'CRITICAL').length, color: '#ef4444' },
      { label: 'HIGH', value: this.alerts.filter(a => a.severity === 'HIGH').length, color: '#f97316' },
      { label: 'MEDIUM', value: this.alerts.filter(a => a.severity === 'MEDIUM').length, color: '#eab308' },
      { label: 'LOW', value: this.alerts.filter(a => a.severity === 'LOW').length, color: '#10b981' },
    ];
  }

  trackById(_: number, a: any): any { return a.id; }

  statsEntries(): { key: string, value: number }[] {
    if (!this.patientStats) return [];
    return Object.entries(this.patientStats).map(([key, value]) => ({ key, value: value as number }));
  }
}