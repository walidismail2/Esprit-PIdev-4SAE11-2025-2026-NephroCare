import { Component, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { OrderService, OrderResponse, OrderStatus } from '../services/order.service';
import { DeliveryService, DeliveryResponse } from '../services/delivery.service';
import { PharmacyService, Medication } from '../services/pharmacy.service';
import { NotificationService } from '../services/Notification.service';
import { PrescriptionService, Prescription } from '../services/prescription.service';

declare const L: any;

@Component({
  selector:    'app-orders-front',
  templateUrl: './orders-front.component.html',
  styleUrls:   ['./orders-front.component.scss'],
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  providers:   [DatePipe]
})
export class OrdersFrontComponent implements OnInit, OnDestroy, AfterViewInit {

  activeTab: 'orders' | 'track' = 'orders';

  currentUserId   = '';
  currentUserName = '';

  orders:       OrderResponse[]    = [];
  deliveries:   DeliveryResponse[] = [];
  loadingOrders = false;

  // ── Prescriptions ──────────────────────────────────
  prescriptions:       Prescription[] = [];
  loadingPrescriptions = false;
  selectedPrescription: Prescription | null = null;

  // ── Formulaire commande ────────────────────────────
  showOrderForm = false;
  orderForm!:   FormGroup;
  orderLoading  = false;
  orderError    = '';
  orderItems: {
    medicationId:   string;
    medicationName: string;
    dosage:         string;
    route:          string;
    quantity:       number;
    fromPrescription: boolean; // ← indique si l'item vient de la prescription
  }[] = [];

  // ── Carte & géolocalisation ────────────────────────
  map:              any    = null;
  marker:           any    = null;
  mapInitialized        = false;
  locating              = false;
  selectedLat:      number | null = null;
  selectedLng:      number | null = null;
  addressSuggestions: string[] = [];
  showSuggestions       = false;
  searchingAddress      = false;
  private geocodeTimer: any;

  // ── Médicaments ────────────────────────────────────
  readonly KIDNEY_MEDS: string[] = [
    'Ramipril', 'Losartan', 'Furosémide', 'Spironolactone',
    'Epoetin alfa', 'Sevelamer', 'Calcitriol', 'Tacrolimus',
    'Sodium bicarbonate', 'Calcium gluconate'
  ];
  medications: Medication[] = [];

  viewingOrder: OrderResponse | null = null;

  readonly ORDER_STATUSES: OrderStatus[] = [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  ];

  constructor(
    private fb:              FormBuilder,
    private zone:            NgZone,
    private keycloak:        KeycloakService,
    private orderSvc:        OrderService,
    private deliverySvc:     DeliveryService,
    private pharmacySvc:     PharmacyService,
    private notif:           NotificationService,
    private prescriptionSvc: PrescriptionService
  ) {}

  ngOnInit(): void {
    try {
      const token = this.keycloak.getKeycloakInstance().tokenParsed as any;
      this.currentUserId   = token?.sub || '';
      const fn = token?.given_name  || '';
      const ln = token?.family_name || '';
      this.currentUserName = (fn + ' ' + ln).trim() || token?.preferred_username || '';
    } catch {}

    this.initOrderForm();
    this.loadMyOrders();
    this.loadMedications();
    this.loadMyPrescriptions();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyMap();
  }

  today(): string { return new Date().toISOString().split('T')[0]; }

  initOrderForm(): void {
    this.orderForm = this.fb.group({
      deliveryAddress: ['', Validators.required],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\+216[0-9]{8}$/)
      ]],
      prescriptionId: [''],
      notes:          ['']
    });

    // ✅ Écouter les changements du champ prescriptionId
    this.orderForm.get('prescriptionId')?.valueChanges.subscribe(prescId => {
      this.onPrescriptionChange(prescId);
    });
  }

  // ════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ════════════════════════════════════════════════

  loadMyPrescriptions(): void {
    if (!this.currentUserId) return;
    this.loadingPrescriptions = true;
    this.prescriptionSvc.getByUser(this.currentUserId).subscribe({
      next: data => {
        this.prescriptions = data.filter(
          p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED'
        );
        this.loadingPrescriptions = false;
      },
      error: () => { this.loadingPrescriptions = false; }
    });
  }

  // ✅ Appelé automatiquement quand le patient change la prescription sélectionnée
  onPrescriptionChange(prescriptionId: string): void {
    if (!prescriptionId) {
      // Pas de prescription sélectionnée → réinitialiser les items
      this.selectedPrescription = null;
      this.orderItems = [{
        medicationId: '', medicationName: '', dosage: '',
        route: '', quantity: 1, fromPrescription: false
      }];
      return;
    }

    // Trouver la prescription sélectionnée
    const presc = this.prescriptions.find(p => p.id === prescriptionId);
    if (!presc) return;

    this.selectedPrescription = presc;

    // ✅ Charger les médicaments depuis la prescription
    if (presc.medications && presc.medications.length > 0) {
      // Pré-remplir les items avec les médicaments de la prescription
      this.orderItems = presc.medications.map(med => ({
        medicationId:     med.id || '',
        medicationName:   med.medicationName || '',
        dosage:           med.dosage || '',
        route:            med.route  || '',
        quantity:         1,
        fromPrescription: true  // ← marqué comme venant de la prescription
      }));

      this.notif.success(
        'Médicaments chargés',
        `${presc.medications.length} médicament(s) importé(s) depuis la prescription`
      );
    } else {
      // Prescription sans médicaments détaillés → charger via l'API
      this.loadPrescriptionMedications(prescriptionId);
    }
  }

  // ✅ Charger les médicaments d'une prescription via l'API si non inclus
  private loadPrescriptionMedications(prescriptionId: string): void {
    this.prescriptionSvc.getById(prescriptionId).subscribe({
      next: (presc: Prescription) => {
        if (presc.medications && presc.medications.length > 0) {
          this.orderItems = presc.medications.map(med => ({
            medicationId:     med.id || '',
            medicationName:   med.medicationName || '',
            dosage:           med.dosage || '',
            route:            med.route  || '',
            quantity:         1,
            fromPrescription: true
          }));

          this.notif.success(
            'Médicaments chargés',
            `${presc.medications.length} médicament(s) importé(s) depuis la prescription`
          );
        } else {
          // Prescription vide — laisser l'utilisateur sélectionner manuellement
          this.notif.info('Info', 'Cette prescription ne contient pas de médicaments détaillés.');
          this.orderItems = [{
            medicationId: '', medicationName: '', dosage: '',
            route: '', quantity: 1, fromPrescription: false
          }];
        }
      },
      error: () => {
        this.notif.error('Erreur', 'Impossible de charger les médicaments de la prescription.');
      }
    });
  }

  // ✅ Effacer la prescription sélectionnée
  clearPrescription(): void {
    this.orderForm.get('prescriptionId')?.setValue('');
    this.selectedPrescription = null;
    this.orderItems = [{
      medicationId: '', medicationName: '', dosage: '',
      route: '', quantity: 1, fromPrescription: false
    }];
  }

  // ════════════════════════════════════════════════
  // CARTE LEAFLET
  // ════════════════════════════════════════════════

  initMap(lat = 36.8065, lng = 10.1815): void {
    if (this.mapInitialized) return;

    const mapEl = document.getElementById('order-map');
    if (!mapEl || typeof L === 'undefined') return;

    this.map = L.map('order-map', {
      center: [lat, lng],
      zoom:   13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    const icon = L.divIcon({
      className: '',
      html: `<div class="map-pin-icon"><i class="fas fa-map-marker-alt"></i></div>`,
      iconSize:   [36, 36],
      iconAnchor: [18, 36],
      popupAnchor:[0, -36]
    });

    this.marker = L.marker([lat, lng], { draggable: true, icon }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.zone.run(() => {
        this.moveMarker(e.latlng.lat, e.latlng.lng);
        this.reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    });

    this.marker.on('dragend', () => {
      this.zone.run(() => {
        const pos = this.marker.getLatLng();
        this.selectedLat = pos.lat;
        this.selectedLng = pos.lng;
        this.reverseGeocode(pos.lat, pos.lng);
      });
    });

    this.mapInitialized = true;
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map    = null;
      this.marker = null;
      this.mapInitialized = false;
    }
  }

  moveMarker(lat: number, lng: number): void {
    if (!this.marker) return;
    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], this.map.getZoom());
    this.selectedLat = lat;
    this.selectedLng = lng;
  }

  // ════════════════════════════════════════════════
  // GÉOLOCALISATION NAVIGATEUR
  // ════════════════════════════════════════════════

  locateMe(): void {
    if (!navigator.geolocation) {
      this.notif.error('Erreur', 'Géolocalisation non supportée.');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.zone.run(() => {
          const { latitude, longitude } = pos.coords;
          this.locating = false;
          if (!this.mapInitialized) {
            this.initMap(latitude, longitude);
          } else {
            this.map.setView([latitude, longitude], 15);
            this.moveMarker(latitude, longitude);
          }
          this.reverseGeocode(latitude, longitude);
        });
      },
      (err) => {
        this.zone.run(() => {
          this.locating = false;
          this.notif.error('Localisation refusée', 'Autorisez la géolocalisation.');
          console.warn('Geolocation error:', err);
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ════════════════════════════════════════════════
  // REVERSE GEOCODING
  // ════════════════════════════════════════════════

  reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    fetch(url, { headers: { 'Accept-Language': 'fr' } })
      .then(r => r.json())
      .then(data => {
        this.zone.run(() => {
          const address = data.display_name || '';
          setTimeout(() => {
            this.orderForm.get('deliveryAddress')?.setValue(address);
          }, 0);
          this.selectedLat = lat;
          this.selectedLng = lng;
          if (this.marker) {
            this.marker.bindPopup(
              `<div class="map-popup"><b>Adresse sélectionnée</b><br>${address}</div>`
            ).openPopup();
          }
        });
      })
      .catch(() => {
        this.zone.run(() => {
          setTimeout(() => {
            this.orderForm.get('deliveryAddress')?.setValue(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }, 0);
        });
      });
  }

  // ════════════════════════════════════════════════
  // FORWARD GEOCODING
  // ════════════════════════════════════════════════

  onAddressInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value.trim();
    if (this.geocodeTimer) clearTimeout(this.geocodeTimer);
    if (q.length < 4) {
      this.addressSuggestions = [];
      this.showSuggestions    = false;
      return;
    }
    this.searchingAddress = true;
    this.geocodeTimer = setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
      fetch(url, { headers: { 'Accept-Language': 'fr' } })
        .then(r => r.json())
        .then((results: any[]) => {
          this.zone.run(() => {
            this.searchingAddress   = false;
            this.addressSuggestions = results.map(r => r.display_name);
            this._geocodeResults    = results;
            this.showSuggestions    = results.length > 0;
          });
        })
        .catch(() => {
          this.zone.run(() => {
            this.searchingAddress = false;
            this.showSuggestions  = false;
          });
        });
    }, 500);
  }

  private _geocodeResults: any[] = [];

  selectSuggestion(index: number): void {
    const result = this._geocodeResults[index];
    if (!result) return;
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;
    this.orderForm.get('deliveryAddress')?.setValue(address);
    this.showSuggestions    = false;
    this.addressSuggestions = [];
    this.selectedLat        = lat;
    this.selectedLng        = lng;
    if (this.mapInitialized) {
      this.moveMarker(lat, lng);
      this.map.setView([lat, lng], 15);
      if (this.marker) {
        this.marker.bindPopup(
          `<div class="map-popup"><b>Adresse sélectionnée</b><br>${address}</div>`
        ).openPopup();
      }
    } else {
      setTimeout(() => {
        this.initMap(lat, lng);
        setTimeout(() => this.moveMarker(lat, lng), 100);
      }, 0);
    }
  }

  hideSuggestions(): void {
    setTimeout(() => { this.showSuggestions = false; }, 180);
  }

  // ════════════════════════════════════════════════
  // OUVERTURE / FERMETURE MODAL
  // ════════════════════════════════════════════════

  openOrderForm(): void {
    this.showOrderForm        = true;
    this.orderError           = '';
    this.selectedPrescription = null;
    this.orderItems = [{
      medicationId: '', medicationName: '', dosage: '',
      route: '', quantity: 1, fromPrescription: false
    }];
    this.orderForm.reset();

    // Pré-sélectionner si une seule prescription active
    if (this.prescriptions.length === 1) {
      setTimeout(() => {
        this.orderForm.patchValue({ prescriptionId: this.prescriptions[0].id });
      }, 0);
    }

    setTimeout(() => {
      this.initMap();
      this.locateMe();
    }, 100);
  }

  closeOrderForm(): void {
    this.showOrderForm        = false;
    this.selectedPrescription = null;
    this.destroyMap();
    this.addressSuggestions   = [];
    this.showSuggestions      = false;
    this.selectedLat          = null;
    this.selectedLng          = null;
  }

  // ════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ════════════════════════════════════════════════

  loadMyOrders(): void {
    if (!this.currentUserId) return;
    this.loadingOrders = true;
    this.orderSvc.getByPatient(this.currentUserId).subscribe({
      next: data => {
        this.orders        = data;
        this.loadingOrders = false;
        this.loadMyDeliveries();
      },
      error: () => { this.loadingOrders = false; }
    });
  }

  loadMyDeliveries(): void {
    this.deliverySvc.getByPatient(this.currentUserId).subscribe({
      next: data => { this.deliveries = data; }
    });
  }

  loadMedications(): void {
    const kidneyEntries: Medication[] = this.KIDNEY_MEDS.map((name, idx) => ({
      id: `kidney-${idx}`, medicationName: name,
      dosage: '', route: '', quantity: 99
    }));
    this.pharmacySvc.getAll().subscribe({
      next: apiMeds => {
        const available      = apiMeds.filter(m => m.quantity > 0);
        const kidneyNamesLow = this.KIDNEY_MEDS.map(n => n.toLowerCase());
        const uniqueApi      = available.filter(
          m => !kidneyNamesLow.includes(m.medicationName.toLowerCase())
        );
        this.medications = [...kidneyEntries, ...uniqueApi];
      },
      error: () => { this.medications = kidneyEntries; }
    });
  }

  // ════════════════════════════════════════════════
  // ITEMS MÉDICAMENTS
  // ════════════════════════════════════════════════

  addItem(): void {
    this.orderItems.push({
      medicationId: '', medicationName: '', dosage: '',
      route: '', quantity: 1, fromPrescription: false
    });
  }

  removeItem(i: number): void { this.orderItems.splice(i, 1); }

  onMedSelect(i: number, event: Event): void {
    const id  = (event.target as HTMLSelectElement).value;
    const med = this.medications.find(m => m.id === id);
    if (med) {
      this.orderItems[i] = {
        medicationId:     med.id!,
        medicationName:   med.medicationName,
        dosage:           med.dosage || '',
        route:            med.route  || '',
        quantity:         1,
        fromPrescription: false
      };
    }
  }

  clampQty(i: number): void {
    if (!this.orderItems[i].quantity || this.orderItems[i].quantity < 1) {
      this.orderItems[i].quantity = 1;
    }
    if (this.orderItems[i].quantity > 10) {
      this.orderItems[i].quantity = 10;
    }
  }

  // ════════════════════════════════════════════════
  // SOUMETTRE COMMANDE
  // ════════════════════════════════════════════════

  submitOrder(): void {
    if (this.orderForm.invalid) {
      this.orderError = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    const invalidQty = this.orderItems.some(
      i => !i.quantity || i.quantity < 1 || i.quantity > 10
    );
    if (invalidQty) {
      this.orderError = 'La quantité doit être entre 1 et 10.';
      return;
    }

    const validItems = this.orderItems
      .filter(i => i.medicationName && i.quantity > 0)
      .map(i => ({
        medicationId:   i.medicationId.startsWith('kidney-') ? '' : i.medicationId,
        medicationName: i.medicationName,
        dosage:         i.dosage,
        route:          i.route,
        quantity:       i.quantity
      }));

    if (validItems.length === 0) {
      this.orderError = 'Veuillez ajouter au moins un médicament.';
      return;
    }

    this.orderLoading = true;
    this.orderError   = '';

    this.orderSvc.create({
      patientId:   this.currentUserId,
      patientName: this.currentUserName,
      ...this.orderForm.value,
      items: validItems
    }).subscribe({
      next: () => {
        this.orderLoading = false;
        this.closeOrderForm();
        this.notif.success('Commande passée !', 'Votre commande est en cours de traitement.');
        this.loadMyOrders();
      },
      error: err => {
        this.orderLoading = false;
        this.orderError   = err?.error?.error || err?.error?.message || 'Erreur lors de la commande.';
      }
    });
  }

  cancelOrder(id: string): void {
    if (!confirm('Annuler cette commande ?')) return;
    this.orderSvc.updateStatus(id, 'CANCELLED').subscribe({
      next:  () => { this.notif.info('Commande annulée', ''); this.loadMyOrders(); },
      error: () => this.notif.error('Erreur', 'Impossible d\'annuler')
    });
  }

  viewOrder(o: OrderResponse): void { this.viewingOrder = o; }
  closeOrderView(): void             { this.viewingOrder = null; }

  // ════════════════════════════════════════════════
  // HELPERS VISUELS
  // ════════════════════════════════════════════════

  deliveryForOrder(orderId: string): DeliveryResponse | undefined {
    return this.deliveries.find(d => d.orderId === orderId);
  }

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'status--pending', CONFIRMED: 'status--confirmed',
      PROCESSING: 'status--processing', SHIPPED: 'status--shipped',
      DELIVERED: 'status--delivered', CANCELLED: 'status--cancelled'
    };
    return m[s] || '';
  }

  orderStatusIcon(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'fa-clock', CONFIRMED: 'fa-check', PROCESSING: 'fa-cog',
      SHIPPED: 'fa-truck', DELIVERED: 'fa-check-double', CANCELLED: 'fa-ban'
    };
    return m[s] || 'fa-circle';
  }

  deliveryStatusClass(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED: 'status--scheduled', IN_TRANSIT: 'status--transit',
      DELIVERED: 'status--delivered', FAILED: 'status--failed',
      RETURNED:  'status--returned'
    };
    return m[s] || '';
  }

  progressStep(status: string): number {
    const steps: Record<string, number> = {
      PENDING: 1, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5
    };
    return steps[status] || 0;
  }

  trackById(_: number, item: any): string { return item.id; }
  trackByIndex(i: number): number          { return i; }

  get activeOrders(): OrderResponse[] {
    return this.orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
  }

  get completedOrders(): OrderResponse[] {
    return this.orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED');
  }
}