import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { RoomService, Room } from '../../../services/Room.service';
import { HospitalizationService, Hospitalization } from '../../../services/hospitalization.service';

// ── Display config per room type ──────────────────────────────────────────
export interface TypeConfig {
  label:  string;
  short:  string;
  color:  string;
  glow:   string;
  bg:     string;
  border: string;
}

export const TYPE_CFG: Record<string, TypeConfig> = {
  standard:   { label: 'Standard',   short: 'STD', color: '#38bdf8', glow: 'rgba(56,189,248,0.3)',   bg: 'rgba(56,189,248,0.08)',   border: 'rgba(56,189,248,0.25)'   },
  dialysis:   { label: 'Dialysis',   short: 'DLY', color: '#f87171', glow: 'rgba(248,113,113,0.35)', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.3)'   },
  isolation:  { label: 'Isolation',  short: 'ISO', color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',   bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.28)'   },
  pediatric:  { label: 'Pediatric',  short: 'PED', color: '#f472b6', glow: 'rgba(244,114,182,0.3)',  bg: 'rgba(244,114,182,0.08)',  border: 'rgba(244,114,182,0.28)'  },
  nephrology: { label: 'Nephrology', short: 'NEP', color: '#a78bfa', glow: 'rgba(167,139,250,0.3)',  bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.28)'  },
};

// ── Enriched room model used in the template ──────────────────────────────
export interface BedSlot {
  bedIndex:       number;
  occupied:       boolean;
  pending:        boolean;
  patientId?:     string;
  dischargeDate?: string;
  daysLeft?:      number;
  status?:        string;
}

export interface RoomCard extends Room {
  wing:         string;
  beds:         BedSlot[];
  freeBeds:     number;
  occupancyPct: number;
  cfg:          TypeConfig;
}

export interface DaySlot {
  offset: number;
  label:  string;
  short:  string;
  iso:    string;
}

@Component({
  selector:    'app-hospital-architecture',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './hospital-architecture.component.html',
  styleUrls:   ['./hospital-architecture.component.css'],
})
export class HospitalArchitectureComponent implements OnInit {

  loading = true;

  rooms:            Room[]            = [];
  hospitalizations: Hospitalization[] = [];
  roomCards:        RoomCard[]        = [];

  selectedRoom: RoomCard | null       = null;
  view: 'floor' | 'forecast'         = 'floor';
  hoveredDay:   number | null         = null;
  activeWing:   string                = 'ALL';

  readonly wings = ['A', 'B', 'C'];
  readonly today = new Date();

  days: DaySlot[] = [];

  // Expose TYPE_CFG to the template
  readonly typeCfg  = TYPE_CFG;
  readonly typeKeys = Object.keys(TYPE_CFG);

  // ── Computed clinic totals ────────────────────────────────────────────
  get totalBeds():    number { return this.rooms.reduce((s, r) => s + r.capacity, 0); }
  get occupiedBeds(): number { return this.rooms.reduce((s, r) => s + this.getOccupants(r.id).length, 0); }
  get freeBeds():     number { return this.totalBeds - this.occupiedBeds; }
  get occupancyPct(): number { return this.totalBeds ? Math.round(this.occupiedBeds / this.totalBeds * 100) : 0; }

  get visibleRooms(): RoomCard[] {
    return this.activeWing === 'ALL'
      ? this.roomCards
      : this.roomCards.filter(r => r.wing === this.activeWing);
  }

  get roomsByWing(): Record<string, RoomCard[]> {
    const map: Record<string, RoomCard[]> = { A: [], B: [], C: [] };
    this.visibleRooms.forEach(r => {
      if (map[r.wing]) map[r.wing].push(r);
    });
    return map;
  }

  constructor(
    private roomService:  RoomService,
    private hospService:  HospitalizationService,
    private cdr:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildDays();
    forkJoin({
      rooms:            this.roomService.getAll(),
      hospitalizations: this.hospService.getAll(),
    }).subscribe({
      next: ({ rooms, hospitalizations }) => {
        this.rooms            = rooms;
        this.hospitalizations = hospitalizations;
        this.buildRoomCards();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => { console.error(err); this.loading = false; },
    });
  }

  // ── Build 7-day slots ─────────────────────────────────────────────────
  private buildDays(): void {
    this.days = Array.from({ length: 7 }, (_, i) => {
      const d   = this.addDays(this.today, i);
      const iso = this.isoDate(d);
      return {
        offset: i,
        label:  i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
        short:  i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' }),
        iso,
      };
    });
  }

  // ── Build enriched room cards ─────────────────────────────────────────
  private buildRoomCards(): void {
    this.roomCards = this.rooms.map(room => {
      const occupants = this.getOccupants(room.id);
      const cfg       = TYPE_CFG[room.type] ?? TYPE_CFG['standard'];
      const wing      = this.wingFromRoomNumber(room.roomNumber);

      const beds: BedSlot[] = Array.from({ length: room.capacity }, (_, i) => {
        const occ = occupants[i] ?? null;
        if (!occ) return { bedIndex: i, occupied: false, pending: false };
        const dl = occ.dischargeDate ? this.daysUntil(occ.dischargeDate) : undefined;
        return {
          bedIndex:      i,
          occupied:      true,
          pending:       occ.status === 'pending',
          patientId:     occ.userId,
          dischargeDate: occ.dischargeDate,
          daysLeft:      dl,
          status:        occ.status,
        };
      });

      return {
        ...room,
        wing,
        beds,
        freeBeds:     room.capacity - occupants.length,
        occupancyPct: Math.round(occupants.length / room.capacity * 100),
        cfg,
      };
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  getOccupants(roomId: number): Hospitalization[] {
    return this.hospitalizations.filter(h =>
      h.room?.id === roomId &&
      (h.status === 'active' || h.status === 'pending')
    );
  }

  getProjectedFree(roomId: number, capacity: number, offset: number): number {
    const target = this.isoDate(this.addDays(this.today, offset));
    const occ = this.hospitalizations.filter(h =>
      h.room?.id === roomId &&
      (h.status === 'active' || h.status === 'pending') &&
      h.admissionDate <= target &&
      (!h.dischargeDate || h.dischargeDate > target)
    ).length;
    return Math.max(0, capacity - occ);
  }

  getHospitalTotalFree(offset: number): number {
    return this.rooms.reduce((s, r) => s + this.getProjectedFree(r.id, r.capacity, offset), 0);
  }

  getDischargingCount(roomId: number, iso: string): number {
    return this.hospitalizations.filter(h =>
      h.room?.id === roomId && h.dischargeDate === iso
    ).length;
  }

  // ── Wing assignment ───────────────────────────────────────────────────
  //  Wing A → Standard rooms        (101, 102, 103, 201, 202 — numeric prefixes)
  //  Wing B → Dialysis + Isolation  (DLY-1/2/3, ISO-1/2)
  //  Wing C → Pediatric + Nephrology (PED-1/2, NEP-1/2)
  private wingFromRoomNumber(num: string): string {
    if (!num) return 'A';
    const prefix = num.split('-')[0].toUpperCase();
    switch (prefix) {
      case 'DLY':
      case 'ISO':
        return 'B';
      case 'PED':
      case 'NEP':
        return 'C';
      default:
        return 'A'; // all numeric standard rooms
    }
  }

  private addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  private isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  daysUntil(iso: string): number {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - this.today.getTime()) / 86400000));
  }

  // ── Styling helpers ───────────────────────────────────────────────────

  occupancyColor(pct: number): string {
    return pct >= 100 ? '#ef4444' : pct >= 70 ? '#fbbf24' : '#34d399';
  }

  freeBedColor(free: number, capacity: number): string {
    const pct = free / capacity;
    return free === 0 ? '#ef4444' : pct < 0.5 ? '#fbbf24' : '#34d399';
  }

  forecastCellBg(free: number, capacity: number, hovered: boolean): string {
    const c = this.freeBedColor(free, capacity);
    return hovered ? `${c}20` : `${c}10`;
  }

  forecastCellBorder(free: number, capacity: number, hovered: boolean): string {
    const c = this.freeBedColor(free, capacity);
    return `1px solid ${hovered ? c + '66' : c + '28'}`;
  }

  // ── Template actions ──────────────────────────────────────────────────

  selectRoom(room: RoomCard): void {
    this.selectedRoom = this.selectedRoom?.id === room.id ? null : room;
  }

  goToFloor(room: RoomCard): void {
    this.selectedRoom = room;
    this.view         = 'floor';
  }

  setView(v: 'floor' | 'forecast'): void {
    this.view = v;
  }

  trackById(_: number, item: any): number { return item.id; }
  trackByIndex(i: number): number         { return i; }
}