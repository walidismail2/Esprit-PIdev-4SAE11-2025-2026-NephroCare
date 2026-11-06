import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import keycloakConfig from '../../keycloak.config';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    PageBreadcrumbComponent,
  ],
  templateUrl: './profile.component.html',
  standalone: true,
  styles: ``
})
export class ProfileComponent implements OnInit {

  profile: any = null;
  userId: string | null = null;
  roles: string[] = [];
  loading = true;
  activeTab: 'info' | 'password' | 'security' = 'info';
  sendingVerify = false;
  verifyMsg: { type: 'success' | 'error'; text: string } | null = null;

  private readonly adminBase = `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}`;
  readonly keycloakAccountUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/account/`;
  readonly keycloakPasswordUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/account/#/security/signingin`;

  constructor(
    private keycloakService: KeycloakService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.profile = await this.keycloakService.loadUserProfile();
      this.userId = this.profile?.id ?? null;

      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed as any;
      const allRoles: string[] = tokenParsed?.realm_access?.roles ?? [];
      this.roles = allRoles.filter((r) =>
        !['offline_access', 'uma_authorization', `default-roles-${keycloakConfig.realm}`].includes(r)
      );
    } catch (err) {
      console.error('Failed to load Back Office profile', err);
      this.verifyMsg = { type: 'error', text: 'Unable to load your profile from Keycloak.' };
    } finally {
      this.loading = false;
    }
  }

  get initials(): string {
    const first = this.profile?.firstName?.[0] ?? '';
    const last = this.profile?.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || this.profile?.username?.[0]?.toUpperCase() || '?';
  }

  get fullName(): string {
    const name = `${this.profile?.firstName ?? ''} ${this.profile?.lastName ?? ''}`.trim();
    return name || this.profile?.username || 'User';
  }

  get emailVerified(): boolean {
    return this.profile?.emailVerified ?? false;
  }

  get primaryRole(): string {
    if (!this.roles.length) {
      return 'User';
    }
    const role = this.roles[0];
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  openPasswordChange(): void {
    window.open(this.keycloakPasswordUrl, '_blank', 'noopener');
  }

  dismissVerifyMsg(): void {
    this.verifyMsg = null;
  }

  sendVerificationEmail(): void {
    if (!this.userId) {
      return;
    }

    this.sendingVerify = true;
    this.verifyMsg = null;

    from(this.keycloakService.getToken()).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.put(
          `${this.adminBase}/users/${this.userId}/execute-actions-email`,
          ['VERIFY_EMAIL'],
          { headers }
        );
      })
    ).subscribe({
      next: () => {
        this.sendingVerify = false;
        this.verifyMsg = { type: 'success', text: 'Verification email sent successfully.' };
      },
      error: (err) => {
        console.error('Failed to send verification email', err);
        this.sendingVerify = false;
        this.verifyMsg = { type: 'error', text: 'Failed to send verification email.' };
      }
    });
  }
}
