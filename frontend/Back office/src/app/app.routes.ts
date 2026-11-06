import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { ClinicalComponent } from './pages/clinical/clinical.component';
import { TransplantComponent } from './pages/transplant/transplant.component';
import { TreatmentListComponent } from './pages/dialysis/treatment-list/treatment-list.component';
import { SessionListComponent } from './pages/dialysis/session-list/session-list.component';
import { ConsultationsCalendarComponent } from './pages/consultations-calendar/consultations-calendar.component';
import { HospitalArchitectureComponent } from './pages/dashboard/hospital-architecture/hospital-architecture.component';
import { StatistiquePharmacyComponent } from './pages/stock/statistique-pharmacy/statistique-pharmacy.component';
import { DiagnosticResultComponent } from './pages/dashboard/diagnostic-result/diagnostic-result.component';


import { RoleGuard } from './guards/role.guard';
import {HospitalizationComponent} from "./pages/dashboard/hospitalization/hospitalization.component";
import { StatistiqueHospitalizationComponent } from './pages/statistique/statistique-hospitalization.component';
import { PharmacyComponent } from './pages/pharmacy/pharmacy.component';
import { DiagnosticComponent } from './pages/dashboard/diagnostic/diagnostic.component';
import {SystemConfigComponent} from "./pages/dialysis/admin/system-config/system-config.component";
import {AdminAuditComponent} from "./pages/dialysis/admin/audit/admin-audit.component";
import {MyScheduleComponent} from "./pages/dialysis/my-schedule/my-schedule.component";
import { OrdersBackComponent } from './pages/orders-back/orders-back.component';
import{OrdersStatsComponent} from './pages/stats_orders/orders-stats.component';
import { DriverDashboardComponent } from './pages/driver-dashboard/driver-dashboard.component';
import { AlertsListComponent } from './pages/dialysis/alerts/alerts-list.component';
export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [RoleGuard], // 🔒 Protect the whole back office
    children: [
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title: 'Dashboard | Back Office',
      },
      { path: 'calendar', component: CalenderComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'form-elements', component: FormElementsComponent },
      { path: 'basic-tables', component: BasicTablesComponent },
      { path: 'blank', component: BlankComponent },
      { path: 'invoice', component: InvoicesComponent },
      { path: 'line-chart', component: LineChartComponent },
      { path: 'bar-chart', component: BarChartComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'avatars', component: AvatarElementComponent },
      { path: 'badge', component: BadgesComponent },
      { path: 'buttons', component: ButtonsComponent },
      { path: 'images', component: ImagesComponent },
      { path: 'videos', component: VideosComponent },
      // Back office modules
      /*{ path: 'pharmacy', component: PharmacyComponent },
      { path: 'diagnosis', component: DiagnosisComponent },*/
      { path: 'hospitalization', component: HospitalizationComponent },
      {
        path: 'nutrition/:id',
        loadComponent: () =>
        import('./pages/dashboard/nutrition/nutrition.component')
        .then(m => m.NutritionComponent)
      },
      { path: 'diagnostic', component: DiagnosticComponent },
      { path: 'statistique-hospitalization', component: StatistiqueHospitalizationComponent },
      { path: 'architecture', component: HospitalArchitectureComponent }, // Placeholder for architecture overview
      { path: 'clinical', component: ClinicalComponent },
      { path: 'transplant', component: TransplantComponent },
      { path: 'pharmacy', component: PharmacyComponent },
       { path: 'statistique-pharmacy', component: StatistiquePharmacyComponent },
      { path: 'consultations-calendar', component: ConsultationsCalendarComponent },
      { path: 'diagnostic-result', component: DiagnosticResultComponent },
      {
        path: 'kidney-scan',
        loadComponent: () => import('./pages/kidney/kidney-scan.component').then(m => m.KidneyScanComponent),
        canActivate: [RoleGuard],
        data: { roles: ['doctor', 'admin', 'radiologist', 'lab-tech'] }
      },
      { path: 'orders-back', component: OrdersBackComponent } ,
      { path: 'orders-stats', component: OrdersStatsComponent },      
      {
        path:        'driver',
       component:   DriverDashboardComponent,
       canActivate: [RoleGuard],
       data:        { roles: ['DRIVER'] }
      },
      


     // --- Dialysis Routes ---
      {
        path: 'dialysis/treatments',
        component: TreatmentListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['doctor', 'nurse', 'admin'] }
      },
      {
        path: 'dialysis/sessions/:id',
        component: SessionListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['doctor', 'nurse', 'admin'] }
      },

      // --- Dialysis Admin Routes ---
      {
        path: 'dialysis/admin/settings',
        component: SystemConfigComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'dialysis/admin/audit',
        component: AdminAuditComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'dialysis/my-schedule',
        component: MyScheduleComponent,
        canActivate: [RoleGuard],
        data: { roles: ['nurse'] }

      },
      {
        path: 'dialysis/alerts',
        component: AlertsListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['doctor', 'nurse', 'admin'] }
      },
    ] },


  // Public/Error Pages
  {
    path: '**',
    component: NotFoundComponent,
  },
];
