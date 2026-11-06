import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemTwoComponent],
})
export class UserDropdownComponent implements OnInit {
  isOpen = false;
  username = 'User';
  displayName = 'User';
  email = '';

  constructor(private keycloakService: KeycloakService) {}

  async ngOnInit(): Promise<void> {
    try {
      const isLoggedIn = await this.keycloakService.isLoggedIn();
      if (!isLoggedIn) {
        this.displayName = 'User';
        this.email = '';
        return;
      }

      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed as Record<string, any>;
      this.username = tokenParsed?.['preferred_username'] || 'User';
      const tokenName = `${tokenParsed?.['given_name'] ?? ''} ${tokenParsed?.['family_name'] ?? ''}`.trim();
      const tokenEmail = tokenParsed?.['email'] ?? '';

      // Use token claims only (avoids Keycloak /account CORS noise).
      this.displayName = tokenName || this.username;
      this.email = tokenEmail;
    } catch (err) {
      this.displayName = this.username;
      this.email = '';
    }
  }

  get initials(): string {
    const parts = this.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return this.displayName.charAt(0).toUpperCase() || 'U';
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  logout() {
    this.keycloakService.logout();
  }

  register() {
    this.keycloakService.register();
  }
}
