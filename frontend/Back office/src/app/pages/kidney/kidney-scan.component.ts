import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface KidneyPrediction {
  label: string;
  confidence: number;
  recommendation: string;
  probabilities: Record<string, number>;
}

@Component({
  selector: 'app-kidney-scan',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="p-6 max-w-3xl">
      <h1 class="text-2xl font-semibold mb-2">Kidney CT scan</h1>
      <p class="mb-4 text-sm text-gray-600">
        Upload a kidney CT image. The result comes from the kidney model behind the API gateway.
      </p>
      <input type="file" accept="image/*" (change)="onFile($event)" />
      <button class="ml-3 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" [disabled]="!file || loading" (click)="predict()">
        {{ loading ? 'Analyzing...' : 'Analyze' }}
      </button>
      <p class="mt-4 text-red-600" *ngIf="error">{{ error }}</p>
      <div class="mt-4" *ngIf="result">
        <p><strong>Result:</strong> {{ result.label }} ({{ result.confidence | percent:'1.0-0' }})</p>
        <p class="mt-2">{{ result.recommendation }}</p>
      </div>
    </section>
  `
})
export class KidneyScanComponent {
  file: File | null = null;
  loading = false;
  error = '';
  result: KidneyPrediction | null = null;

  constructor(private http: HttpClient) {}

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files && input.files.length ? input.files[0] : null;
    this.result = null;
    this.error = '';
  }

  predict(): void {
    if (!this.file) {
      return;
    }
    const body = new FormData();
    body.append('file', this.file);
    this.loading = true;
    this.error = '';
    this.http.post<KidneyPrediction>(`${environment.apiUrl}/kidney-ai/predict`, body).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'The kidney model could not analyze this image.';
        this.loading = false;
      }
    });
  }
}
