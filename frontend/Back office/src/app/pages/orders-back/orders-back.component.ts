import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {
  OrderService, OrderResponse, OrderStatus, OrderStats
} from '../../services/order.service';
import {
  DeliveryService, DeliveryResponse, DeliveryStatus, DeliveryRequest
} from '../../services/delivery.service';
import { KeycloakAdminService, KeycloakUser } from '../../services/keycloak-admin.service';
import { PharmacyService, Medication } from '../../services/pharmacy.service';
import { NotificationService } from '../../services/notification.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';

@Component({
  selector: 'app-orders-back',
  templateUrl: './orders-back.component.html',
  styleUrls: ['./orders-back.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  providers: [DatePipe]
})
export class OrdersBackComponent implements OnInit {

  activeTab: 'orders' | 'deliveries' = 'orders';

  // ── Commandes ────────────────────────────────────
  orders:        OrderResponse[]   = [];
  orderStats:    OrderStats | null = null;
  loadingOrders  = false;
  viewingOrder:  OrderResponse | null = null;

  // Filtres
  searchOrder   = '';
  filterStatus: OrderStatus | '' = '';
  sortOrder     = 'date-desc';

  // Formulaire nouvelle commande
  showOrderForm = false;
  orderForm!:   FormGroup;
  orderLoading  = false;
  orderError    = '';

  // Items du formulaire
  orderItems: {
    medicationId: string;
    medicationName: string;
    dosage: string;
    route: string;
    quantity: number;
  }[] = [];

  // ── Livraisons ────────────────────────────────────
  deliveries:       DeliveryResponse[] = [];
  loadingDeliveries = false;
  showDeliveryModal = false;
  deliveryForm!:    FormGroup;
  deliveryLoading   = false;
  deliveryError     = '';
  targetOrderId     = '';
  viewingDelivery:  DeliveryResponse | null = null;

  // ── Keycloak & Pharmacy ───────────────────────────
  keycloakUsers:    KeycloakUser[] = [];
  medications:      Medication[]   = [];

  patientSearch     = '';
  filteredPatients: KeycloakUser[] = [];
  showPatientDrop   = false;

  keycloakDrivers:  KeycloakUser[] = [];
  filteredDrivers:  KeycloakUser[] = [];
  driverSearch      = '';
  showDriverDrop    = false;

  // ── Taux de change ────────────────────────────────
  // ✅ eurRate représente maintenant : combien de TND pour 1 EUR
  eurRate    = 3.33;
  eurLoading = false;

  readonly ORDER_STATUSES: OrderStatus[] = [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  ];

  readonly DELIVERY_STATUSES: DeliveryStatus[] = [
    'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'
  ];

  constructor(
    private fb:            FormBuilder,
    private orderSvc:      OrderService,
    private deliverySvc:   DeliveryService,
    private keycloakAdmin: KeycloakAdminService,
    private pharmacySvc:   PharmacyService,
    private notif:         NotificationService,
    private exchangeSvc:   ExchangeRateService
  ) {}

  ngOnInit(): void {
    this.initOrderForm();
    this.initDeliveryForm();
    this.loadOrders();
    this.loadDeliveries();
    this.loadStats();
    this.loadPatients();
    this.loadMedications();
    this.loadDrivers();
    this.loadExchangeRate();
  }

  // ════════════════════════════════════════════════
  // TAUX DE CHANGE
  // ════════════════════════════════════════════════

  loadExchangeRate(): void {
    this.eurLoading = true;
    this.exchangeSvc.getRate().subscribe({
      next: rate => { this.eurRate = rate; this.eurLoading = false; },
      error: ()  => { this.eurLoading = false; }
    });
  }

  // ✅ Convertit EUR → TND pour l'affichage
  toTND(amountEUR: number): number {
    return this.exchangeSvc.convert(amountEUR, this.eurRate);
  }

  // ════════════════════════════════════════════════
  // INIT FORMS
  // ════════════════════════════════════════════════

  today(): string { return new Date().toISOString().split('T')[0]; }

  initOrderForm(): void {
    this.orderForm = this.fb.group({
      patientId:       ['', Validators.required],
      patientName:     ['', Validators.required],
      prescriptionId:  [''],
      deliveryAddress: ['', Validators.required],
      phoneNumber:     ['', Validators.required],
      notes:           ['']
    });
  }

  initDeliveryForm(): void {
    this.deliveryForm = this.fb.group({
      driverName:  ['', Validators.required],
      scheduledAt: [this.today(), Validators.required],
      notes:       ['']
    });
  }

  // ════════════════════════════════════════════════
  // DONNÉES
  // ════════════════════════════════════════════════

  loadOrders(): void {
    this.loadingOrders = true;
    this.orderSvc.getAll().subscribe({
      next: data => { this.orders = data; this.loadingOrders = false; },
      error: () => {
        this.loadingOrders = false;
        this.notif.error('Erreur', 'Impossible de charger les commandes');
      }
    });
  }

  loadDeliveries(): void {
    this.loadingDeliveries = true;
    this.deliverySvc.getAll().subscribe({
      next: data => { this.deliveries = data; this.loadingDeliveries = false; },
      error: () => { this.loadingDeliveries = false; }
    });
  }

  loadStats(): void {
    this.orderSvc.getStats().subscribe({ next: s => this.orderStats = s });
  }

  loadPatients(): void {
    this.keycloakAdmin.getUsersByRole('patient').subscribe(users => {
      this.keycloakUsers    = users;
      this.filteredPatients = [...users];
    });
  }

  loadMedications(): void {
    this.pharmacySvc.getAll().subscribe({ next: data => this.medications = data });
  }

  loadDrivers(): void {
    this.keycloakAdmin.getUsersByRole('livreur').subscribe({
      next: users => {
        this.keycloakDrivers = users;
        this.filteredDrivers = [...users];
      },
      error: () => {
        this.keycloakDrivers = [];
        this.filteredDrivers = [];
      }
    });
  }

  // ════════════════════════════════════════════════
  // PATIENT DROPDOWN
  // ════════════════════════════════════════════════

  onPatientSearch(): void {
    const q = this.patientSearch.toLowerCase();
    this.filteredPatients = q
      ? this.keycloakUsers.filter(u =>
          (u.username  || '').toLowerCase().includes(q) ||
          (u.firstName || '').toLowerCase().includes(q) ||
          (u.lastName  || '').toLowerCase().includes(q))
      : [...this.keycloakUsers];
    this.showPatientDrop = true;
  }

  selectPatient(u: KeycloakUser): void {
    this.orderForm.get('patientId')?.setValue(u.id);
    this.orderForm.get('patientName')?.setValue(
      `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username
    );
    this.patientSearch   = KeycloakAdminService.displayName(u);
    this.showPatientDrop = false;
  }

  closePatientDrop(): void {
    setTimeout(() => { this.showPatientDrop = false; }, 180);
  }

  // ════════════════════════════════════════════════
  // DRIVER DROPDOWN
  // ════════════════════════════════════════════════

  onDriverSearch(): void {
    const q = this.driverSearch.toLowerCase();
    this.filteredDrivers = q
      ? this.keycloakDrivers.filter(u =>
          (u.username  || '').toLowerCase().includes(q) ||
          (u.firstName || '').toLowerCase().includes(q) ||
          (u.lastName  || '').toLowerCase().includes(q))
      : [...this.keycloakDrivers];
    this.showDriverDrop = true;
  }

  selectDriver(u: KeycloakUser): void {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
    this.deliveryForm.get('driverName')?.setValue(u.username);
    this.driverSearch   = fullName;
    this.showDriverDrop = false;
  }

  closeDriverDrop(): void {
    setTimeout(() => { this.showDriverDrop = false; }, 300);
  }

  clearDriver(): void {
    this.driverSearch = '';
    this.deliveryForm.get('driverName')?.setValue('');
    this.filteredDrivers = [...this.keycloakDrivers];
  }

  // ════════════════════════════════════════════════
  // ITEMS MÉDICAMENTS
  // ════════════════════════════════════════════════

  addItem(): void {
    this.orderItems.push({
      medicationId: '', medicationName: '',
      dosage: '', route: '', quantity: 1
    });
  }

  removeItem(i: number): void { this.orderItems.splice(i, 1); }

  onMedSelect(i: number, event: Event): void {
    const id  = (event.target as HTMLSelectElement).value;
    const med = this.medications.find(m => m.id === id);
    if (med) {
      this.orderItems[i].medicationId   = med.id!;
      this.orderItems[i].medicationName = med.medicationName;
      this.orderItems[i].dosage         = med.dosage || '';
      this.orderItems[i].route          = med.route  || '';
    }
  }

  // ════════════════════════════════════════════════
  // CRÉER COMMANDE
  // ════════════════════════════════════════════════

  openOrderForm(): void {
    this.showOrderForm = true;
    this.orderError    = '';
    this.orderItems    = [{
      medicationId: '', medicationName: '',
      dosage: '', route: '', quantity: 1
    }];
    this.orderForm.reset();
    this.patientSearch = '';
  }

  closeOrderForm(): void { this.showOrderForm = false; }

  submitOrder(): void {
    if (this.orderForm.invalid || this.orderItems.length === 0) {
      this.orderError = 'Veuillez remplir tous les champs et ajouter au moins un médicament.';
      return;
    }
    const validItems = this.orderItems.filter(i => i.medicationId && i.quantity > 0);
    if (validItems.length === 0) {
      this.orderError = 'Veuillez sélectionner au moins un médicament.';
      return;
    }
    this.orderLoading = true;
    this.orderError   = '';
    this.orderSvc.create({ ...this.orderForm.value, items: validItems }).subscribe({
      next: () => {
        this.orderLoading  = false;
        this.showOrderForm = false;
        this.notif.success('Commande créée !', 'La commande a été enregistrée.');
        this.loadOrders();
        this.loadStats();
      },
      error: err => {
        this.orderLoading = false;
        this.orderError   = err?.error?.error || 'Erreur lors de la création.';
        this.notif.error('Erreur', this.orderError);
      }
    });
  }

  // ════════════════════════════════════════════════
  // STATUT COMMANDE
  // ════════════════════════════════════════════════

  updateOrderStatus(id: string, status: OrderStatus): void {
    this.orderSvc.updateStatus(id, status).subscribe({
      next: () => {
        this.notif.success('Statut mis à jour', `Commande → ${status}`);
        this.loadOrders();
        this.loadStats();
      },
      error: () => this.notif.error('Erreur', 'Impossible de mettre à jour le statut')
    });
  }

  deleteOrder(id: string): void {
    if (!confirm('Supprimer cette commande ?')) return;
    this.orderSvc.delete(id).subscribe({
      next: () => {
        this.notif.success('Supprimée', 'Commande supprimée');
        this.loadOrders();
        this.loadStats();
      },
      error: () => this.notif.error('Erreur', 'Impossible de supprimer')
    });
  }

  viewOrder(o: OrderResponse): void { this.viewingOrder = o; }
  closeOrderView(): void             { this.viewingOrder = null; }

  // ════════════════════════════════════════════════
  // CRÉER LIVRAISON
  // ════════════════════════════════════════════════

  openDeliveryModal(orderId: string): void {
    this.targetOrderId     = orderId;
    this.showDeliveryModal = true;
    this.deliveryError     = '';
    this.driverSearch      = '';
    this.filteredDrivers   = [...this.keycloakDrivers];
    this.deliveryForm.reset({ scheduledAt: this.today() });
  }

  closeDeliveryModal(): void { this.showDeliveryModal = false; }

  submitDelivery(): void {
    if (this.deliveryForm.invalid) return;
    this.deliveryLoading = true;
    this.deliveryError   = '';

    const req: DeliveryRequest = {
      orderId:     this.targetOrderId,
      driverName:  this.deliveryForm.value.driverName,
      scheduledAt: this.deliveryForm.value.scheduledAt
        ? new Date(this.deliveryForm.value.scheduledAt).toISOString()
        : undefined,
      notes: this.deliveryForm.value.notes
    };

    this.deliverySvc.create(req).subscribe({
      next: () => {
        this.deliveryLoading   = false;
        this.showDeliveryModal = false;
        this.notif.success('Livraison créée !', 'La livraison a été planifiée.');
        this.loadDeliveries();
        this.loadOrders();
      },
      error: err => {
        this.deliveryLoading = false;
        this.deliveryError   = err?.error?.error || 'Erreur lors de la création.';
      }
    });
  }

  updateDeliveryStatus(id: string, status: DeliveryStatus): void {
    this.deliverySvc.updateStatus(id, status).subscribe({
      next: () => {
        this.notif.success('Statut mis à jour', `Livraison → ${status}`);
        this.loadDeliveries();
      },
      error: () => this.notif.error('Erreur', 'Impossible de mettre à jour')
    });
  }

  viewDelivery(d: DeliveryResponse): void { this.viewingDelivery = d; }
  closeDeliveryView(): void               { this.viewingDelivery = null; }

  // ════════════════════════════════════════════════
  // FILTRES & GETTERS
  // ════════════════════════════════════════════════

  get filteredOrders(): OrderResponse[] {
    let list = [...this.orders];
    if (this.searchOrder) {
      const q = this.searchOrder.toLowerCase();
      list = list.filter(o =>
        o.patientName.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q)
      );
    }
    if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
    list.sort((a, b) => {
      if (this.sortOrder === 'date-desc') return b.createdAt.localeCompare(a.createdAt);
      if (this.sortOrder === 'date-asc')  return a.createdAt.localeCompare(b.createdAt);
      if (this.sortOrder === 'amount')    return b.totalAmount - a.totalAmount;
      return 0;
    });
    return list;
  }

  get hasOrderFilters(): boolean {
    return !!(this.searchOrder || this.filterStatus);
  }

  resetOrderFilters(): void {
    this.searchOrder = '';
    this.filterStatus = '';
    this.sortOrder = 'date-desc';
  }

  // ════════════════════════════════════════════════
  // HELPERS VISUELS
  // ════════════════════════════════════════════════

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:    'status--pending',
      CONFIRMED:  'status--confirmed',
      PROCESSING: 'status--processing',
      SHIPPED:    'status--shipped',
      DELIVERED:  'status--delivered',
      CANCELLED:  'status--cancelled'
    };
    return m[s] || '';
  }

  orderStatusIcon(s: string): string {
    const m: Record<string, string> = {
      PENDING:    'fa-clock',
      CONFIRMED:  'fa-check',
      PROCESSING: 'fa-cog',
      SHIPPED:    'fa-truck',
      DELIVERED:  'fa-check-double',
      CANCELLED:  'fa-ban'
    };
    return m[s] || 'fa-circle';
  }

  deliveryStatusClass(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED:  'status--scheduled',
      IN_TRANSIT: 'status--transit',
      DELIVERED:  'status--delivered',
      FAILED:     'status--failed',
      RETURNED:   'status--returned'
    };
    return m[s] || '';
  }

  deliveryStatusIcon(s: string): string {
    const m: Record<string, string> = {
      SCHEDULED:  'fa-calendar-check',
      IN_TRANSIT: 'fa-truck-moving',
      DELIVERED:  'fa-box-open',
      FAILED:     'fa-times-circle',
      RETURNED:   'fa-undo-alt'
    };
    return m[s] || 'fa-circle';
  }

  deliveryForOrder(orderId: string): DeliveryResponse | undefined {
    return this.deliveries.find(d => d.orderId === orderId);
  }

  trackById(_: number, item: any): string { return item.id; }
  trackByIndex(i: number): number          { return i; }
}