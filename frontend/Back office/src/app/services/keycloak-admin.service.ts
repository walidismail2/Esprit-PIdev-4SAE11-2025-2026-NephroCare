import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Observable, from, switchMap, catchError, of, forkJoin, map
} from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import keycloakConfig from '../keycloak.config';

export interface KeycloakUser {
  id:          string;
  username:    string;
  firstName?:  string;
  lastName?:   string;
  email?:      string;
  enabled:     boolean;
  attributes?: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class KeycloakAdminService {

  private readonly adminBase =
    `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}`;

  constructor(
    private http:            HttpClient,
    private keycloakService: KeycloakService
  ) {}

  // ════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════

  /**
   * Fetch users by role.
   * Strategy: realm roles → client roles → full user scan (fallback).
   */
  getUsersByRole(roleName: string): Observable<KeycloakUser[]> {
    return from(this.keycloakService.getToken()).pipe(
      switchMap(token => {
        const headers = this._authHeaders(token);
        return this._getUsersByRole(roleName, headers);
      }),
      catchError(err => {
        console.error('[KeycloakAdmin] Token error:', err);
        return of([]);
      })
    );
  }

  /** Fetch a single user by their Keycloak UUID. */
  getUserById(userId: string): Observable<KeycloakUser> {
    return from(this.keycloakService.getToken()).pipe(
      switchMap(token =>
        this.http.get<KeycloakUser>(
          `${this.adminBase}/users/${userId}`,
          { headers: this._authHeaders(token) }
        )
      ),
      catchError(() => of({ id: userId, username: userId, enabled: true }))
    );
  }

  // ════════════════════════════════════════════════
  // Strategy 1 – Realm roles
  // ════════════════════════════════════════════════

  private _getUsersByRole(
    roleName: string,
    headers:  HttpHeaders
  ): Observable<KeycloakUser[]> {

    return this.http.get<{ name: string }[]>(
      `${this.adminBase}/roles`,
      { headers }
    ).pipe(
      switchMap(allRoles => {
        const found = allRoles.find(
          r => r.name.toLowerCase() === roleName.toLowerCase()
        );

        if (!found) {
          console.warn(`[KeycloakAdmin] Realm role "${roleName}" not found → trying client roles.`);
          return this._getUsersByClientRole(roleName, headers);
        }

        return this.http.get<KeycloakUser[]>(
          `${this.adminBase}/roles/${encodeURIComponent(found.name)}/users?max=200`,
          { headers }
        ).pipe(
          switchMap(users => {
            console.log(
              `[KeycloakAdmin] Realm role "${found.name}" → ${users.length} user(s)`,
              users.map(u => u.username)
            );

            if (users.length === 0) {
              console.warn('[KeycloakAdmin] Realm role empty → trying client roles + fallback.');
              return this._getUsersByClientRole(roleName, headers).pipe(
                switchMap(clientUsers =>
                  clientUsers.length > 0
                    ? of(clientUsers)
                    : this._scanAllUsers(roleName, headers)
                )
              );
            }

            return this._hydrateUsers(users, headers);
          }),
          catchError(err => {
            console.error(`[KeycloakAdmin] /roles/${found.name}/users → ${err.status}`);
            return this._scanAllUsers(roleName, headers);
          })
        );
      }),
      catchError(err => {
        console.error('[KeycloakAdmin] Realm roles list failed:', err.status);
        return of([]);
      })
    );
  }

  // ════════════════════════════════════════════════
  // Strategy 2 – Client roles
  // ════════════════════════════════════════════════

  private _getUsersByClientRole(
    roleName: string,
    headers:  HttpHeaders
  ): Observable<KeycloakUser[]> {

    return this.http.get<{ id: string; clientId: string }[]>(
      `${this.adminBase}/clients?max=50`,
      { headers }
    ).pipe(
      switchMap(clients => {
        if (!clients.length) return of([]);

        const checks$ = clients.map(client =>
          this.http.get<{ name: string }[]>(
            `${this.adminBase}/clients/${client.id}/roles`,
            { headers }
          ).pipe(
            switchMap(roles => {
              const found = roles.find(
                r => r.name.toLowerCase() === roleName.toLowerCase()
              );
              if (!found) return of([]);

              console.log(`[KeycloakAdmin] Client role found in "${client.clientId}".`);

              return this.http.get<KeycloakUser[]>(
                `${this.adminBase}/clients/${client.id}/roles/` +
                `${encodeURIComponent(found.name)}/users?max=200`,
                { headers }
              ).pipe(catchError(() => of([])));
            }),
            catchError(() => of([]))
          )
        );

        return forkJoin(checks$).pipe(
          map((results: KeycloakUser[][]) => {
            const unique = Array.from(
              new Map(results.flat().map(u => [u.id, u])).values()
            );
            console.log(
              `[KeycloakAdmin] Client roles → ${unique.length} user(s)`,
              unique.map(u => u.username)
            );
            return unique;
          }),
          switchMap(users => this._hydrateUsers(users, headers))
        );
      }),
      catchError(() => of([]))
    );
  }

  // ════════════════════════════════════════════════
  // Strategy 3 – Full user scan (last resort)
  // ════════════════════════════════════════════════

  private _scanAllUsers(
    roleName: string,
    headers:  HttpHeaders
  ): Observable<KeycloakUser[]> {
    console.warn(`[KeycloakAdmin] Full user scan for role "${roleName}"...`);

    return this.http.get<KeycloakUser[]>(
      `${this.adminBase}/users?max=200`,
      { headers }
    ).pipe(
      switchMap(users => {
        if (!users.length) return of([]);

        const checks$ = users.map(user =>
          this.http.get<{ name: string }[]>(
            `${this.adminBase}/users/${user.id}/role-mappings/realm`,
            { headers }
          ).pipe(
            map(roles =>
              roles.some(r => r.name.toLowerCase() === roleName.toLowerCase())
                ? user
                : null
            ),
            catchError(() => of(null))
          )
        );

        return forkJoin(checks$).pipe(
          map(results => results.filter((u): u is KeycloakUser => u !== null)),
          switchMap(matched => {
            console.log(
              `[KeycloakAdmin] Full scan "${roleName}" → ${matched.length} user(s)`,
              matched.map(u => u.username)
            );
            return this._hydrateUsers(matched, headers);
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  // ════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════

  /**
   * Re-fetch each user individually to ensure attributes and full profile
   * are populated (the role-based endpoints return partial objects).
   */
  private _hydrateUsers(
    users:   KeycloakUser[],
    headers: HttpHeaders
  ): Observable<KeycloakUser[]> {
    if (!users.length) return of([]);

    return forkJoin(
      users.map(user =>
        this.http.get<KeycloakUser>(
          `${this.adminBase}/users/${user.id}`,
          { headers }
        ).pipe(catchError(() => of(user)))
      )
    );
  }

  private _authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json'
    });
  }

  static displayName(user: KeycloakUser): string {
    const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return full || user.username;
  }
}