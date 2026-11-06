import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guards/auth-guard';
import { DiagnosticCalendarComponent } from './diagnostic-calendar/diagnostic-calendar.component'; // ← AJOUTÉ
import { DiagnosticComponent } from './diagnostic/diagnostic.component';
import { HospitalizationComponent } from './hospitalization/hospitalization.component';
import { NotificationsComponent } from './Notifications/Notifications.component';
import { ProfileComponent } from './Profile/Profile.component';
import { ClinicalComponent } from './clinical/clinical.component';
import { PharmacyComponent } from './pharmacy/pharmacy.component';
import { BadgeViewerComponent } from './pages/badge-viewer/badge-viewer.component';
import { DiagnosticResultComponent } from './diagnostic-result/diagnostic-result.component';
import { DialysisPortalComponent } from './dialysis/pages/dialysis-portal/dialysis-portal.component';
import { OrdersFrontComponent } from './orders-front/orders-front.component';


const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'diagnostic',
    component: DiagnosticComponent,
    canActivate: [AuthGuard],
    data: { roles: ['labTech'] }
  },
  {
    path: 'diagnostic-result',
    component: DiagnosticResultComponent
  },
  {
    path: 'diagnostic-results',
    component: DiagnosticResultComponent
  },
  {
    path: 'diagnostic-calendar',          // ← AJOUTÉ
    component: DiagnosticCalendarComponent,
    canActivate: [AuthGuard],
    data: { roles: ['labTech'] }
  },
   {
    path: 'dialysis',
    component: DialysisPortalComponent
  },
  {
    path: 'clinical',
    component: ClinicalComponent
  },
  {
    path: 'hospitalization',
    component: HospitalizationComponent
  },
  {
    path: 'pharmacy',
    component: PharmacyComponent
  },
  {
  path: 'order',
  component: OrdersFrontComponent,
  canActivate: [AuthGuard] 
},

  { path: 'notifications',
    component: NotificationsComponent
  },
  { path: 'profile',
    component: ProfileComponent
  },
  {
    path: 'badge-viewer',
    component: BadgeViewerComponent,
    // PAS de canActivate ici !
  },

  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
