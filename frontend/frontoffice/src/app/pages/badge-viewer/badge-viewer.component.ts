import { Component, OnInit }   from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ActivatedRoute }      from '@angular/router';
import { BadgeData, BadgeUrlService } from '../../services/badge-url.service';

@Component({
  selector:    'app-badge-viewer',
  templateUrl: './badge-viewer.component.html',
  styleUrls:   ['./badge-viewer.component.scss'],
  standalone:  true,
  imports:     [CommonModule]
})
export class BadgeViewerComponent implements OnInit {

  badge:    BadgeData | null = null;
  loading   = true;
  hasError  = false;
  scanTime  = '';

  constructor(
    private route:           ActivatedRoute,
    private badgeUrlService: BadgeUrlService
  ) {}

  ngOnInit(): void {
    // Lire le paramètre ?d= dans l'URL
    const dataParam = this.route.snapshot.queryParamMap.get('d');

    if (!dataParam) {
      this.hasError = true;
      this.loading  = false;
      return;
    }

    const decoded = this.badgeUrlService.decodeUrl(dataParam);

    if (!decoded || (!decoded.patientName && !decoded.condition)) {
      this.hasError = true;
      this.loading  = false;
      return;
    }

    this.badge   = decoded;
    this.scanTime = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    this.loading = false;
  }

  // Numéro de téléphone sans espaces pour le lien tel:
  get phoneClean(): string {
    return (this.badge?.emergencyPhone || '').replace(/\s/g, '');
  }
}