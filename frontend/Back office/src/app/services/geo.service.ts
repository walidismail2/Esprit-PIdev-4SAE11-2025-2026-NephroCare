// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// src/app/services/geo.service.ts
// Utilise OpenRouteService (gratuite, 2000 req/jour)
// Inscription : https://openrouteservice.org/dev/#/signup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface DeliveryWithDistance {
  id:              string;
  trackingNumber:  string;
  patientName:     string;
  deliveryAddress: string;
  phoneNumber:     string;
  driverName:      string;
  status:          string;
  attempts:        number;
  scheduledAt:     string;
  deliveredAt?:    string;
  notes?:          string;
  createdAt:       string;
  orderId:         string;

  // ── Champs géo ajoutés ────────────────────────────
  coords?:         GeoCoords;
  distanceKm?:     number;    // distance routière en km
  durationMin?:    number;    // durée estimée en minutes
  distanceLabel?:  string;    // "1.2 km" ou "À vol d'oiseau"
  geoError?:       boolean;   // true si géocodage échoué
}

@Injectable({ providedIn: 'root' })
export class GeoService {

  // ✅ Clé API OpenRouteService GRATUITE
  // Créer un compte sur https://openrouteservice.org/dev/#/signup
  // → "API Key" → copier ici
  private readonly ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImVmMDU5OTc4NjM3ZjRjZGFiOTkyYjVhODBlY2U1ZDczIiwiaCI6Im11cm11cjY0In0=';

  private readonly GEOCODE_URL  = 'https://api.openrouteservice.org/geocode/search';
  private readonly MATRIX_URL   = 'https://api.openrouteservice.org/v2/matrix/driving-car';
  private readonly NOMINATIM    = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════════════
  // 1. Obtenir la position GPS du livreur
  // ════════════════════════════════════════════════
  getDriverPosition(): Observable<GeoCoords | null> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.next(null);
        observer.complete();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          observer.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          observer.complete();
        },
        err => {
          console.warn('[Geo] Géolocalisation refusée:', err.message);
          observer.next(null);
          observer.complete();
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  // ════════════════════════════════════════════════
  // 2. Géocoder une adresse → coordonnées GPS
  //    Utilise Nominatim (OpenStreetMap) GRATUIT
  //    Sans clé API, respecter : 1 req/sec max
  // ════════════════════════════════════════════════
  geocodeAddress(address: string): Observable<GeoCoords | null> {
    const params = {
      q:              address,
      format:         'json',
      limit:          '1',
      'accept-language': 'fr'
    };

    return this.http.get<any[]>(this.NOMINATIM, { params }).pipe(
      map(results => {
        if (!results || results.length === 0) return null;
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon)
        };
      }),
      catchError(() => of(null))
    );
  }

  // ════════════════════════════════════════════════
  // 3. Distance à vol d'oiseau (Haversine)
  //    Fallback si ORS indisponible — sans API
  // ════════════════════════════════════════════════
  haversineKm(from: GeoCoords, to: GeoCoords): number {
    const R    = 6371;
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a    = Math.sin(dLat / 2) ** 2
               + Math.cos(this.toRad(from.lat))
               * Math.cos(this.toRad(to.lat))
               * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number { return deg * Math.PI / 180; }

  // ════════════════════════════════════════════════
  // 4. Distances routières via ORS Matrix API
  //    driverCoords = point de départ
  //    destinations = coordonnées des livraisons
  // ════════════════════════════════════════════════
  getRouteMatrix(
    driver:       GeoCoords,
    destinations: GeoCoords[]
  ): Observable<{ distancesKm: number[]; durationsMin: number[] }> {

    if (!destinations.length) {
      return of({ distancesKm: [], durationsMin: [] });
    }

    const locations = [
      [driver.lng, driver.lat],
      ...destinations.map(d => [d.lng, d.lat])
    ];

    const body = {
      locations,
      sources:      [0],             // départ = driver
      destinations: destinations.map((_, i) => i + 1),
      metrics:      ['distance', 'duration']
    };

    return this.http.post<any>(
      this.MATRIX_URL,
      body,
      { headers: { 'Authorization': this.ORS_KEY, 'Content-Type': 'application/json' } }
    ).pipe(
      map(res => ({
        distancesKm:  (res.distances[0] as number[]).map(m => m / 1000),
        durationsMin: (res.durations[0]  as number[]).map(s => Math.round(s / 60))
      })),
      catchError(err => {
        console.warn('[Geo] ORS Matrix indisponible, fallback Haversine:', err.status);
        // Fallback : calculer Haversine pour chaque destination
        const distancesKm  = destinations.map(d => this.haversineKm(driver, d));
        const durationsMin = distancesKm.map(km => Math.round(km / 30 * 60)); // ~30 km/h
        return of({ distancesKm, durationsMin });
      })
    );
  }

  // ════════════════════════════════════════════════
  // 5. Méthode principale — enrichit et trie
  //    les livraisons par distance depuis le livreur
  // ════════════════════════════════════════════════
  sortDeliveriesByDistance(
    deliveries: any[]
  ): Observable<DeliveryWithDistance[]> {

    if (!deliveries.length) return of([]);

    // Étape A : obtenir la position du livreur
    return this.getDriverPosition().pipe(
      switchMap(driverPos => {

        // Pas de géolocalisation → retourner sans tri
        if (!driverPos) {
          console.warn('[Geo] Position livreur indisponible — pas de tri par distance');
          return of(deliveries.map(d => ({ ...d, geoError: true })));
        }

        console.log('[Geo] Position livreur:', driverPos);

        // Étape B : géocoder toutes les adresses (séquentiellement
        // pour respecter le rate limit Nominatim 1 req/sec)
        return this.geocodeSequential(deliveries.map(d => d.deliveryAddress)).pipe(
          switchMap(coordsList => {

            // Étape C : calculer les distances (ORS ou Haversine)
            const validCoords = coordsList.filter(c => c !== null) as GeoCoords[];

            if (!validCoords.length) {
              return of(deliveries.map(d => ({ ...d, geoError: true })));
            }

            return this.getRouteMatrix(driverPos, coordsList.map(
              c => c ?? driverPos  // remplacer null par driverPos (distance 0)
            )).pipe(
              map(({ distancesKm, durationsMin }) => {

                // Enrichir chaque livraison
                const enriched: DeliveryWithDistance[] = deliveries.map((d, i) => ({
                  ...d,
                  coords:        coordsList[i] ?? undefined,
                  distanceKm:    coordsList[i] ? distancesKm[i]  : undefined,
                  durationMin:   coordsList[i] ? durationsMin[i] : undefined,
                  distanceLabel: coordsList[i]
                    ? `${distancesKm[i].toFixed(1)} km · ~${durationsMin[i]} min`
                    : 'Adresse introuvable',
                  geoError: !coordsList[i]
                }));

                // Trier : livraisons avec distance d'abord, puis sans
                enriched.sort((a, b) => {
                  if (a.distanceKm === undefined) return 1;
                  if (b.distanceKm === undefined) return -1;
                  return a.distanceKm - b.distanceKm;
                });

                console.log('[Geo] Livraisons triées par distance:',
                  enriched.map(d => `${d.trackingNumber}: ${d.distanceLabel}`));

                return enriched;
              })
            );
          })
        );
      })
    );
  }

  // ── Géocodage séquentiel avec délai 1 sec/req ──────
  private geocodeSequential(
    addresses: string[]
  ): Observable<(GeoCoords | null)[]> {
    return new Observable(observer => {
      const results: (GeoCoords | null)[] = [];
      let index = 0;

      const next = () => {
        if (index >= addresses.length) {
          observer.next(results);
          observer.complete();
          return;
        }

        this.geocodeAddress(addresses[index]).subscribe({
          next: coords => {
            results.push(coords);
            index++;
            // Respecter le rate limit Nominatim (1 req/sec)
            setTimeout(next, 1100);
          },
          error: () => {
            results.push(null);
            index++;
            setTimeout(next, 1100);
          }
        });
      };

      next();
    });
  }
}