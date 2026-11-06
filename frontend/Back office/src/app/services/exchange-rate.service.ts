import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {

  // Use a browser-friendly endpoint (CORS enabled) for EUR -> TND.
  private readonly API = 'https://api.exchangerate.host/latest?base=EUR&symbols=TND';
  private readonly FALLBACK_RATE = 3.33; // 1 EUR ≈ 3.33 TND

  private cachedRate: number | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_MS = 60 * 60 * 1000;

  constructor(private http: HttpClient) {}

  getRate(): Observable<number> {
    const now = Date.now();
    if (this.cachedRate && (now - this.lastFetch) < this.CACHE_MS) {
      return of(this.cachedRate);
    }
    return this.http.get<any>(this.API).pipe(
      map(res => {
        const rate = res?.rates?.TND ?? this.FALLBACK_RATE;
        this.cachedRate = rate;
        this.lastFetch  = Date.now();
        return rate;
      }),
      catchError(() => of(this.FALLBACK_RATE))
    );
  }

  // ✅ EUR → TND : amountEUR × rate (TND par EUR)
  convert(amountEUR: number, rate: number): number {
    return Math.round(amountEUR * rate * 100) / 100;
  }
}