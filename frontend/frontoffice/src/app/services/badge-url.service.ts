import { Injectable } from '@angular/core';

export interface BadgeData {
  patientName:    string;
  patientAge?:    string;
  bloodGroup:     string;
  condition:      string;
  allergies:      string[];
  allergyReason:  string;
  treatments:     string[];
  creatinine?:    string;
  lastExam?:      string;
  passion:        string;
  passionIcon:    string;
  emergencyPhone: string;
  clinicName:     string;
}

@Injectable({ providedIn: 'root' })
export class BadgeUrlService {

  // ⚙️ CONFIGURER : URL de votre app Angular en production
  // Exemple : 'https://clinique-renale.fr/badge-viewer'
  private readonly BASE_URL = `${window.location.origin}/badge-viewer`;

  // ── Encoder badge → URL pour le QR ────────────────
  buildUrl(badge: BadgeData): string {
    // Clés courtes pour minimiser la taille du QR code
    const payload: Record<string, any> = {};

    if (badge.patientName)    payload['n']  = badge.patientName;
    if (badge.patientAge)     payload['a']  = badge.patientAge;
    if (badge.bloodGroup)     payload['bg'] = badge.bloodGroup;
    if (badge.condition)      payload['c']  = badge.condition;
    if (badge.allergies?.length) payload['al'] = badge.allergies.join(',');
    if (badge.allergyReason)  payload['ar'] = badge.allergyReason;
    if (badge.treatments?.length) payload['tx'] = badge.treatments.join('|');
    if (badge.creatinine)     payload['cr'] = badge.creatinine;
    if (badge.lastExam)       payload['ls'] = badge.lastExam;
    if (badge.passion)        payload['p']  = badge.passion;
    if (badge.passionIcon)    payload['pi'] = badge.passionIcon;
    if (badge.emergencyPhone) payload['ph'] = badge.emergencyPhone;
    if (badge.clinicName)     payload['cl'] = badge.clinicName;

    const b64 = this.toBase64Url(JSON.stringify(payload));
    return `${this.BASE_URL}?d=${b64}`;
  }

  // ── Fallback si URL trop longue ────────────────────
  buildCompactUrl(badge: BadgeData): string {
    const mini = {
      n:  (badge.patientName  || '').substring(0, 20),
      bg: badge.bloodGroup,
      c:  (badge.condition    || '').substring(0, 25),
      ph: badge.emergencyPhone,
    };
    return `${this.BASE_URL}?d=${this.toBase64Url(JSON.stringify(mini))}`;
  }

  // ── Décoder URL → badge (dans BadgeViewerComponent) ──
  decodeUrl(b64url: string): BadgeData | null {
    try {
      const json   = this.fromBase64Url(b64url);
      const parsed = JSON.parse(json);
      return {
        patientName:    parsed.n  || '',
        patientAge:     parsed.a  || '',
        bloodGroup:     parsed.bg || '',
        condition:      parsed.c  || '',
        allergies:      parsed.al ? parsed.al.split(',').filter(Boolean) : [],
        allergyReason:  parsed.ar || '',
        treatments:     parsed.tx ? parsed.tx.split('|').filter(Boolean) : [],
        creatinine:     parsed.cr || '',
        lastExam:       parsed.ls || '',
        passion:        parsed.p  || '',
        passionIcon:    parsed.pi || '🏃',
        emergencyPhone: parsed.ph || '',
        clinicName:     parsed.cl || '',
      };
    } catch {
      return null;
    }
  }

  private toBase64Url(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private fromBase64Url(b64url: string): string {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - b64.length % 4);
    return decodeURIComponent(escape(atob(b64 + pad)));
  }
}