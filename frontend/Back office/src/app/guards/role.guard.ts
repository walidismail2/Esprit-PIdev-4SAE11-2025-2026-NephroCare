import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'pharmacist', 'lab-tech', 'labtech', 'radiologist'];

@Injectable({
    providedIn: 'root',
})
export class RoleGuard implements CanActivate {
    constructor(private keycloak: KeycloakService, private router: Router) {}

    async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
        const loggedIn = await this.keycloak.isLoggedIn();
        if (!loggedIn) {
            await this.keycloak.login();
            return false;
        }

        const userRoles = (await this.keycloak.getUserRoles()).map((role) => role.toLowerCase());
        const required = this.requiredRoles(route).map((role) => role.toLowerCase());

        if (required.length > 0) {
            const allowed = required.some((role) => this.hasRole(userRoles, role));
            if (allowed) {
                return true;
            }
            await this.router.navigateByUrl('/');
            return false;
        }

        if (userRoles.some((role) => STAFF_ROLES.includes(role))) {
            return true;
        }

        await this.keycloak.logout();
        return false;
    }

    private requiredRoles(route: ActivatedRouteSnapshot): string[] {
        let current: ActivatedRouteSnapshot | null = route;
        let roles: string[] = [];
        while (current) {
            const dataRoles = current.data?.['roles'];
            if (Array.isArray(dataRoles) && dataRoles.length > 0) {
                roles = dataRoles;
            }
            current = current.firstChild;
        }
        return roles;
    }

    private hasRole(userRoles: string[], required: string): boolean {
        if (userRoles.includes(required)) {
            return true;
        }
        if (required === 'lab-tech' || required === 'labtech' || required === 'lab_tech') {
            return userRoles.includes('lab-tech') || userRoles.includes('labtech') || userRoles.includes('lab_tech');
        }
        return false;
    }
}
