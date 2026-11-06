import { Component, OnInit } from '@angular/core';
import { catchError, finalize, of, timeout } from 'rxjs';
import { PharmacyService, Medication } from '../services/pharmacy.service';
import { PrescriptionService, Prescription } from '../services/prescription.service';
import { BadgeUrlService } from '../services/badge-url.service';
import { KeycloakService } from 'keycloak-angular';

// ── Interfaces ─────────────────────────────────────────────────────────────────
export interface BadgeData {
  condition:      string;
  allergies:      string[];
  allergyReason:  string;
  bloodGroup:     string;
  passion:        string;
  passionIcon:    string;
  treatments:     string[];
  creatinine?:    string;
  lastExam?:      string;
  emergencyPhone: string;
  clinicName:     string;
  patientName:    string;
  patientAge?:    string;
}

// ══════════════════════════════════════════════════════════════════════════════
// QR CODE ENGINE — Pure TypeScript, zéro dépendance
// QR Version 2 (25×25), EC Level M, byte mode
// ══════════════════════════════════════════════════════════════════════════════
class QRCodeGenerator {
  private static readonly EXP = (() => {
    const t = new Uint8Array(512); let x = 1;
    for (let i = 0; i < 255; i++) {
      t[i] = x; t[i + 255] = x;
      x = x < 128 ? x * 2 : (x * 2) ^ 285;
    }
    return t;
  })();

  private static readonly LOG = (() => {
    const exp = QRCodeGenerator.EXP;
    const log = new Uint8Array(256);
    for (let i = 0; i < 255; i++) log[exp[i]] = i;
    return log;
  })();

  private static mul(a: number, b: number): number {
    return a && b ? this.EXP[this.LOG[a] + this.LOG[b]] : 0;
  }

  private static rsEc(data: number[], ecCount: number): number[] {
    let g = [1];
    for (let i = 0; i < ecCount; i++) {
      const next = new Array(g.length + 1).fill(0);
      g.forEach((gc, gi) =>
        [1, this.EXP[i]].forEach((fc, fi) => { next[gi + fi] ^= this.mul(gc, fc); })
      );
      g = next;
    }
    const msg = [...data, ...new Array(ecCount).fill(0)];
    for (let i = 0; i < data.length; i++) {
      if (msg[i]) for (let j = 1; j <= ecCount; j++) msg[i + j] ^= this.mul(g[j], msg[i]);
    }
    return msg.slice(data.length);
  }

  static generate(text: string): boolean[][] {
    const N   = 25;
    const raw = text.substring(0, 28);
    const bytes = Array.from(new TextEncoder().encode(raw));

    const bits: number[] = [];
    const push = (v: number, len: number) => {
      for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
    };

    push(4, 4);
    push(bytes.length, 8);
    bytes.forEach(b => push(b, 8));
    push(0, 4);
    while (bits.length % 8) bits.push(0);

    const padBytes = [0xEC, 0x11]; let pi = 0;
    while (bits.length < 32 * 8) push(padBytes[pi++ % 2], 8);

    const data: number[] = [];
    for (let i = 0; i < 32; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      data.push(b);
    }

    const codewords = [...data, ...this.rsEc(data, 22)];
    const grid   = Array.from({ length: N }, () => new Array(N).fill(-1));
    const isFunc = Array.from({ length: N }, () => new Array(N).fill(false));

    const setF = (r: number, c: number, v: number) => {
      if (r >= 0 && r < N && c >= 0 && c < N) { grid[r][c] = v; isFunc[r][c] = true; }
    };

    const finder = (tr: number, tc: number) => {
      for (let r = 0; r <= 6; r++)
        for (let c = 0; c <= 6; c++)
          setF(tr + r, tc + c,
            r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4) ? 1 : 0);
      for (let i = -1; i <= 7; i++) {
        setF(tr - 1, tc + i, 0); setF(tr + 7, tc + i, 0);
        setF(tr + i, tc - 1, 0); setF(tr + i, tc + 7, 0);
      }
    };

    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);

    for (let i = 8; i < N - 8; i++) {
      setF(6, i, i % 2 === 0 ? 1 : 0);
      setF(i, 6, i % 2 === 0 ? 1 : 0);
    }
    setF(N - 8, 8, 1);

    const fmt    = [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1];
    const fmtRow = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
    const fmtCol = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
    fmt.forEach((b, i) => {
      setF(fmtRow[i], 8, b); setF(8, fmtCol[i], b);
      setF(N - 1 - i, 8, b); setF(8, N - 1 - i, b);
    });

    const allBits: number[] = [];
    codewords.forEach(w => { for (let i = 7; i >= 0; i--) allBits.push((w >> i) & 1); });

    const mask2 = (r: number, c: number) =>
      Math.floor(r / 2) % 2 === 0 && Math.floor(c / 3) % 2 === 0;

    let bi = 0;
    for (let col = N - 1; col >= 1; col -= 2) {
      if (col === 6) col--;
      const upward = ((N - 1 - col) / 2) % 2 === 0;
      for (let row = 0; row < N; row++) {
        const r = upward ? N - 1 - row : row;
        for (let d = 0; d < 2; d++) {
          const c = col - d;
          if (!isFunc[r][c] && bi < allBits.length)
            grid[r][c] = allBits[bi++] ^ (mask2(r, c) ? 1 : 0);
        }
      }
    }

    return grid.map((row, r) =>
      row.map((v, c) => { if (v === -1) return mask2(r, c); return v === 1; })
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════════════════════
@Component({
  selector:    'app-pharmacy',
  templateUrl: './pharmacy.component.html',
  styleUrls:   ['./pharmacy.component.scss'],
  standalone:  false
})
export class PharmacyComponent implements OnInit {

  // ── Onglet actif (Dose Calculator supprimé) ──────────────────────────────────
  activeTab: 'medications' | 'prescriptions' | 'badge' = 'prescriptions';

  // ── Utilisateur connecté ─────────────────────────────────────────────────────
  currentUserId = '';
  private userIdentifiers: string[] = [];

  // ── Médicaments ──────────────────────────────────────────────────────────────
  medications:  Medication[] = [];
  loadingMeds = false;
  errorMeds   = false;
  searchMed   = '';
  filterRoute = '';
  filterStock = '';
  sortMed     = 'name';

  // ── Prescriptions ─────────────────────────────────────────────────────────────
  prescriptions:       Prescription[] = [];
  loadingRx          = false;
  errorRx            = false;
  viewingPrescription: Prescription | null = null;
  loadingPrescriptionDetails = false;
  searchRx           = '';
  filterStatus       = '';
  filterValidity     = '';
  sortRx             = 'date-desc';
  showFilters        = false;

  // ── Badge ─────────────────────────────────────────────────────────────────────
  badgeStep       = 1;
  badgeTotalSteps = 4;
  badgeGenerated  = false;
  showQrModal     = false;
  qrMatrix:       boolean[][] = [];
  qrDataUrl       = '';
  qrSize          = 25;
  qrUrl           = '';

  badge: BadgeData = {
    condition: '', allergies: [], allergyReason: '', bloodGroup: 'O+',
    passion: '', passionIcon: '🏃', treatments: [],
    emergencyPhone: '', clinicName: '', patientName: ''
  };

  badgeForm = {
    patientName:    '',
    patientAge:     '',
    bloodGroup:     'O+',
    condition:      '',
    customCond:     '',
    allergies:      '',
    allergyReason:  '',
    creatinine:     '',
    lastExam:       '',
    treatments:     [''] as string[],
    passion:        '',
    customPassion:  '',
    passionIcon:    '🏃',
    emergencyPhone: '',
    clinicName:     '',
  };

  readonly PASSIONS = [
    { label: 'Trail / Course à pied',   icon: '🏃',  value: 'Trail / Course à pied' },
    { label: 'Cyclisme / VTT',          icon: '🚴',  value: 'Cyclisme / VTT' },
    { label: 'Natation',                icon: '🏊',  value: 'Natation' },
    { label: 'Randonnée / Montagne',    icon: '🏔️', value: 'Randonnée / Montagne' },
    { label: 'Football / Sport co.',    icon: '⚽',  value: 'Football / Sport co.' },
    { label: 'Musculation / CrossFit',  icon: '🏋️', value: 'Musculation / CrossFit' },
    { label: 'Arts martiaux',           icon: '🥋',  value: 'Arts martiaux' },
    { label: 'Yoga / Méditation',       icon: '🧘',  value: 'Yoga / Méditation' },
    { label: 'Alpinisme / Escalade',    icon: '🧗',  value: 'Alpinisme / Escalade' },
    { label: 'Surf / Sports nautiques', icon: '🏄',  value: 'Surf / Sports nautiques' },
    { label: 'Personnalisé...',         icon: '✏️',  value: 'custom' },
  ];

  readonly CONDITIONS = [
    'Greffé Rénal', 'Greffé Cardiaque', 'Greffé Hépatique',
    'Diabétique Type 1', 'Diabétique Type 2', 'Épileptique',
    'Allergique sévère (EpiPen)', 'Hémophile',
    'Maladie coronarienne', 'Insuffisance rénale chronique', 'Personnalisé...'
  ];

  readonly BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Inconnu'];

  // ── Constructeur ─────────────────────────────────────────────────────────────
  constructor(
    private pharmacyService:     PharmacyService,
    private prescriptionService: PrescriptionService,
    private keycloak:            KeycloakService,
    private badgeUrlService:     BadgeUrlService
  ) {}

  // ── Initialisation ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    try {
      // Build a robust list of possible identifiers from token claims.
      const token = this.keycloak.getKeycloakInstance().tokenParsed as any;
      this.userIdentifiers = this.extractUserIdentifiers(token);
      this.currentUserId = this.userIdentifiers[0] || '';

      // Pré-remplir le nom dans le formulaire badge
      const firstName = token?.given_name        || '';
      const lastName  = token?.family_name       || '';
      const username  = token?.preferred_username || '';
      this.badgeForm.patientName = (firstName || lastName)
        ? `${firstName} ${lastName}`.trim()
        : username;

    } catch (e) {
      console.warn('Keycloak token non disponible :', e);
    }

    this.loadMedications();
    this.loadPrescriptions();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MEDICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  loadMedications(): void {
    if (!this.currentUserId) {
      this.loadingMeds = false;
      this.errorMeds = true;
      return;
    }
    this.loadingMeds = true;
    this.errorMeds   = false;

    // Charge uniquement les médicaments du patient connecté
    this.pharmacyService.getByUser(this.currentUserId).subscribe({
      next:  data => { this.medications = data; this.loadingMeds = false; },
      error: ()   => { this.loadingMeds = false; this.errorMeds = true; }
    });
  }

  get filteredMedications(): Medication[] {
    let r = [...this.medications];

    if (this.searchMed.trim()) {
      const q = this.searchMed.toLowerCase();
      r = r.filter(m =>
        m.medicationName.toLowerCase().includes(q) ||
        (m.dosage || '').toLowerCase().includes(q) ||
        (m.route  || '').toLowerCase().includes(q)
      );
    }

    if (this.filterRoute) r = r.filter(m => m.route === this.filterRoute);

    if      (this.filterStock === 'available') r = r.filter(m => m.quantity > 10);
    else if (this.filterStock === 'low')       r = r.filter(m => m.quantity > 0 && m.quantity <= 10);
    else if (this.filterStock === 'out')       r = r.filter(m => m.quantity === 0);
    else if (this.filterStock === 'expiring')  r = r.filter(m => this.isExpiringSoon(m.endDate));

    r.sort((a, b) => {
      switch (this.sortMed) {
        case 'name':       return a.medicationName.localeCompare(b.medicationName);
        case 'name-desc':  return b.medicationName.localeCompare(a.medicationName);
        case 'stock-asc':  return a.quantity - b.quantity;
        case 'stock-desc': return b.quantity - a.quantity;
        case 'expiry':     return (a.endDate || '').localeCompare(b.endDate || '');
        default:           return 0;
      }
    });

    return r;
  }

  get availableRoutes(): string[] {
    return [...new Set(this.medications.map(m => m.route).filter(Boolean))] as string[];
  }

  get medStats() {
    return {
      total:     this.medications.length,
      available: this.medications.filter(m => m.quantity > 10).length,
      low:       this.medications.filter(m => m.quantity > 0 && m.quantity <= 10).length,
      out:       this.medications.filter(m => m.quantity === 0).length
    };
  }

  get hasMedFilters(): boolean {
    return !!(this.searchMed || this.filterRoute || this.filterStock);
  }

  resetMedFilters(): void {
    this.searchMed   = '';
    this.filterRoute = '';
    this.filterStock = '';
    this.sortMed     = 'name';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ════════════════════════════════════════════════════════════════════════════

  loadPrescriptions(): void {
    if (!this.currentUserId) {
      this.loadingRx = false;
      this.errorRx = true;
      return;
    }
    this.loadingRx = true;
    this.errorRx   = false;

    // Prefer direct endpoint first. If it returns empty (or fails), fallback to
    // getAll + local filter using all known user identifiers.
    this.prescriptionService.getByUser(this.currentUserId).subscribe({
      next: data => {
        if (data.length > 0) {
          this.prescriptions = data;
          this.loadingRx = false;
          return;
        }
        this.fallbackLoadPrescriptions();
      },
      error: () => this.fallbackLoadPrescriptions()
    });
  }

  private fallbackLoadPrescriptions(): void {
    this.prescriptionService.getAll().subscribe({
      next: all => {
        const ids = new Set(this.userIdentifiers.map(v => String(v).toLowerCase()));
        this.prescriptions = all.filter(p => ids.has(String(p.userId || '').toLowerCase()));
        this.loadingRx = false;
        this.errorRx = false;
      },
      error: () => {
        this.loadingRx = false;
        this.errorRx = true;
      }
    });
  }

  private extractUserIdentifiers(token: any): string[] {
    const candidates = [
      token?.sub,
      token?.id,
      token?.userId,
      token?.user_id,
      token?.patientId,
      token?.patient_id,
      token?.preferred_username,
      token?.username,
      token?.email
    ];

    return Array.from(
      new Set(
        candidates
          .filter((v: unknown) => v !== undefined && v !== null)
          .map(v => String(v).trim())
          .filter(v => v.length > 0)
      )
    );
  }

  get filteredPrescriptions(): Prescription[] {
    let r = [...this.prescriptions];

    if (this.searchRx.trim()) {
      const q = this.searchRx.toLowerCase();
      r = r.filter(p =>
        (p.prescribedBy || '').toLowerCase().includes(q) ||
        (p.instructions || '').toLowerCase().includes(q) ||
        (p.status       || '').toLowerCase().includes(q)
      );
    }

    if (this.filterStatus)                r = r.filter(p => p.status === this.filterStatus);
    if (this.filterValidity === 'valid')   r = r.filter(p => !this.isExpired(p.validUntil));
    if (this.filterValidity === 'expired') r = r.filter(p =>  this.isExpired(p.validUntil));

    r.sort((a, b) => {
      switch (this.sortRx) {
        case 'date-desc': return (b.prescriptionDate || '').localeCompare(a.prescriptionDate || '');
        case 'date-asc':  return (a.prescriptionDate || '').localeCompare(b.prescriptionDate || '');
        case 'doctor':    return (a.prescribedBy || '').localeCompare(b.prescribedBy || '');
        case 'status':    return (a.status || '').localeCompare(b.status || '');
        default:          return 0;
      }
    });

    return r;
  }

  get rxStats() {
    return {
      total:     this.prescriptions.length,
      active:    this.prescriptions.filter(p => !this.isExpired(p.validUntil) && p.status !== 'CANCELLED').length,
      expired:   this.prescriptions.filter(p => this.isExpired(p.validUntil)).length,
      pending:   this.prescriptions.filter(p => p.status === 'PENDING').length,
      completed: this.prescriptions.filter(p => p.status === 'COMPLETED').length
    };
  }

  get hasRxFilters(): boolean {
    return !!(this.searchRx || this.filterStatus || this.filterValidity);
  }

  resetRxFilters(): void {
    this.searchRx       = '';
    this.filterStatus   = '';
    this.filterValidity = '';
    this.sortRx         = 'date-desc';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BADGE — Navigation
  // ════════════════════════════════════════════════════════════════════════════

  badgeNextStep(): void {
    if (this.badgeStep < this.badgeTotalSteps) this.badgeStep++;
    else this.generateBadge();
  }

  badgePrevStep(): void {
    if (this.badgeStep > 1) this.badgeStep--;
  }

  isBadgeStepValid(): boolean {
    switch (this.badgeStep) {
      case 1: return !!this.badgeForm.patientName.trim() && !!this.badgeForm.bloodGroup;
      case 2: return !!(this.badgeForm.condition === 'Personnalisé...'
                        ? this.badgeForm.customCond.trim()
                        : this.badgeForm.condition);
      case 3: return this.badgeForm.treatments.some(t => t.trim());
      case 4: return !!this.badgeForm.passion
                  && !!this.badgeForm.emergencyPhone.trim()
                  && !!this.badgeForm.clinicName.trim();
      default: return true;
    }
  }

  selectPassion(p: { label: string; icon: string; value: string }): void {
    this.badgeForm.passion     = p.value;
    this.badgeForm.passionIcon = p.icon;
  }

  isPassionSelected(val: string): boolean {
    return this.badgeForm.passion === val;
  }

  addBadgeTreatment(): void {
    this.badgeForm.treatments.push('');
  }

  removeBadgeTreatment(i: number): void {
    if (this.badgeForm.treatments.length > 1) this.badgeForm.treatments.splice(i, 1);
  }

  trackByIndex(i: number): number { return i; }

  // ── Badge — Génération ───────────────────────────────────────────────────────
  generateBadge(): void {
    const condition = this.badgeForm.condition === 'Personnalisé...'
      ? this.badgeForm.customCond
      : this.badgeForm.condition;

    const passion = this.badgeForm.passion === 'custom'
      ? this.badgeForm.customPassion
      : this.badgeForm.passion;

    this.badge = {
      patientName:    this.badgeForm.patientName,
      patientAge:     this.badgeForm.patientAge,
      bloodGroup:     this.badgeForm.bloodGroup,
      condition:      condition.toUpperCase(),
      allergies:      this.badgeForm.allergies
                        ? this.badgeForm.allergies.split(',').map(a => a.trim()).filter(Boolean)
                        : [],
      allergyReason:  this.badgeForm.allergyReason,
      creatinine:     this.badgeForm.creatinine,
      lastExam:       this.badgeForm.lastExam,
      treatments:     this.badgeForm.treatments.filter(t => t.trim()),
      passion,
      passionIcon:    this.badgeForm.passionIcon,
      emergencyPhone: this.badgeForm.emergencyPhone,
      clinicName:     this.badgeForm.clinicName,
    };

    this.buildQR();
    this.badgeGenerated = true;
  }

  // ── Badge — QR Code ──────────────────────────────────────────────────────────
  buildQR(): void {
    const url = this.badgeUrlService.buildUrl(this.badge);
    try {
      this.qrMatrix  = QRCodeGenerator.generate(url);
      this.qrSize    = this.qrMatrix.length;
      this.qrDataUrl = this.renderQRtoPng(this.qrMatrix);
      this.qrUrl     = url;
    } catch {
      const compact = this.badgeUrlService.buildCompactUrl(this.badge);
      try {
        this.qrMatrix  = QRCodeGenerator.generate(compact);
        this.qrSize    = this.qrMatrix.length;
        this.qrDataUrl = this.renderQRtoPng(this.qrMatrix);
        this.qrUrl     = compact;
      } catch {
        this.qrMatrix  = [];
        this.qrDataUrl = '';
        this.qrUrl     = '';
      }
    }
  }

  private renderQRtoPng(matrix: boolean[][]): string {
    const sz    = matrix.length;
    const scale = 12;
    const quiet = 4;
    const total = (sz + quiet * 2) * scale;
    const canvas = document.createElement('canvas');
    canvas.width  = total;
    canvas.height = total;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, total, total);
    ctx.fillStyle = '#000000';
    matrix.forEach((row, r) =>
      row.forEach((dark, c) => {
        if (dark) ctx.fillRect((quiet + c) * scale, (quiet + r) * scale, scale, scale);
      })
    );
    return canvas.toDataURL('image/png');
  }

  get qrSvgPath(): string {
    if (!this.qrMatrix.length) return '';
    let d = '';
    this.qrMatrix.forEach((row, r) =>
      row.forEach((dark, c) => { if (dark) d += `M${c},${r}h1v1h-1z`; })
    );
    return d;
  }

  openQrModal():  void { this.showQrModal = true;  }
  closeQrModal(): void { this.showQrModal = false; }

  downloadQR(): void {
    if (!this.qrDataUrl) return;
    const a    = document.createElement('a');
    a.download = `badge-qr-${this.badge.patientName.replace(/\s/g, '-')}.png`;
    a.href     = this.qrDataUrl;
    a.click();
  }

  printBadge(): void { window.print(); }

  resetBadge(): void {
    this.badgeGenerated = false;
    this.showQrModal    = false;
    this.badgeStep      = 1;
    this.qrMatrix       = [];
    this.qrDataUrl      = '';
    this.qrUrl          = '';
    this.badgeForm = {
      patientName:    '',
      patientAge:     '',
      bloodGroup:     'O+',
      condition:      '',
      customCond:     '',
      allergies:      '',
      allergyReason:  '',
      creatinine:     '',
      lastExam:       '',
      treatments:     [''],
      passion:        '',
      customPassion:  '',
      passionIcon:    '🏃',
      emergencyPhone: '',
      clinicName:     '',
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  view(p: Prescription): void {
    this.viewingPrescription = p;
    if (!p.id || (p.medications && p.medications.length > 0)) return;

    this.loadingPrescriptionDetails = true;
    this.prescriptionService.getById(p.id).pipe(
      timeout(7000),
      catchError(() => of(p)),
      finalize(() => {
        this.loadingPrescriptionDetails = false;
      })
    ).subscribe(full => {
      const meds = full.medications ?? [];
      this.viewingPrescription = { ...p, ...full, medications: meds };
    });
  }
  closeView(): void {
    this.viewingPrescription = null;
    this.loadingPrescriptionDetails = false;
  }

  isExpiringSoon(dateStr?: string): boolean {
    if (!dateStr) return false;
    const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
    return diff <= 30 && diff >= 0;
  }

  isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  statusClass(status?: string): string {
    const map: Record<string, string> = {
      PENDING:   'badge-pending',
      APPROVED:  'badge-approved',
      DISPENSED: 'badge-dispensed',
      COMPLETED: 'badge-completed',
      CANCELLED: 'badge-cancelled'
    };
    return map[status || ''] || '';
  }

  trackById(index: number, item: any): string {
    return item.id || index;
  }
}