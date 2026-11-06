// src/app/pages/dialysis/admin/system-config/system-config.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialysisService, SystemConfigDto } from '../../../../shared/services/dialysis.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
    selector: 'app-system-config',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonComponent],
    templateUrl: './system-config.component.html',
})
export class SystemConfigComponent implements OnInit {
    loading = true;
    saving = false;
    error: string | null = null;
    success: string | null = null;

    cfg: SystemConfigDto = {
        maxConcurrentSessionsPerShift: 10,
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '13:00',
        afternoonEnd: '17:00',
        ktvAlertThreshold: 1.2,
    };

    constructor(private service: DialysisService) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.error = null;
        this.success = null;

        this.service.getSystemConfig().subscribe({
            next: (data) => {
                this.cfg = {
                    id: data.id,
                    maxConcurrentSessionsPerShift: Number(data.maxConcurrentSessionsPerShift ?? 10),
                    morningStart: this.normalizeTimeForInput(data.morningStart ?? '08:00:00'),
                    morningEnd: this.normalizeTimeForInput(data.morningEnd ?? '12:00:00'),
                    afternoonStart: this.normalizeTimeForInput(data.afternoonStart ?? '13:00:00'),
                    afternoonEnd: this.normalizeTimeForInput(data.afternoonEnd ?? '17:00:00'),
                    ktvAlertThreshold: Number(data.ktvAlertThreshold ?? 1.2),
                };
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.error = err?.error?.messages?.join(', ') || 'Failed to load system config.';
                this.loading = false;
            },
        });
    }

    // backend -> input[type=time]
    private normalizeTimeForInput(t: string): string {
        // "08:00:00" -> "08:00"
        if (!t) return '00:00';
        return t.length >= 5 ? t.slice(0, 5) : t;
    }

    // input[type=time] -> backend LocalTime
    private normalizeTimeForBackend(t: string): string {
        // "08:00" -> "08:00:00"
        if (!t) return '00:00:00';
        return t.length === 5 ? `${t}:00` : t;
    }

    isInvalid(): boolean {
        const cap = Number(this.cfg.maxConcurrentSessionsPerShift);
        const th = Number(this.cfg.ktvAlertThreshold);

        if (!Number.isFinite(cap) || cap < 1) return true;
        if (!Number.isFinite(th) || th <= 0) return true;

        const ms = this.cfg.morningStart;
        const me = this.cfg.morningEnd;
        const as = this.cfg.afternoonStart;
        const ae = this.cfg.afternoonEnd;

        if (!ms || !me || !as || !ae) return true;

        // basic ordering
        if (ms >= me) return true;
        if (as >= ae) return true;

        // IMPORTANT: no overlap (must match backend rule)
        // morningEnd <= afternoonStart
        if (me > as) return true;

        return false;
    }

    save(): void {
        this.error = null;
        this.success = null;

        if (this.isInvalid()) {
            this.error = 'Please correct the fields (times/capacity/threshold).';
            return;
        }

        this.saving = true;

        const payload: SystemConfigDto = {
            id: this.cfg.id,
            maxConcurrentSessionsPerShift: Number(this.cfg.maxConcurrentSessionsPerShift),
            morningStart: this.normalizeTimeForBackend(this.cfg.morningStart),
            morningEnd: this.normalizeTimeForBackend(this.cfg.morningEnd),
            afternoonStart: this.normalizeTimeForBackend(this.cfg.afternoonStart),
            afternoonEnd: this.normalizeTimeForBackend(this.cfg.afternoonEnd),
            ktvAlertThreshold: Number(this.cfg.ktvAlertThreshold),
        };

        this.service.updateSystemConfig(payload).subscribe({
            next: (res) => {
                this.cfg = {
                    ...payload,
                    id: res.id ?? payload.id,
                    morningStart: this.normalizeTimeForInput(res.morningStart ?? payload.morningStart),
                    morningEnd: this.normalizeTimeForInput(res.morningEnd ?? payload.morningEnd),
                    afternoonStart: this.normalizeTimeForInput(res.afternoonStart ?? payload.afternoonStart),
                    afternoonEnd: this.normalizeTimeForInput(res.afternoonEnd ?? payload.afternoonEnd),
                    ktvAlertThreshold: Number(res.ktvAlertThreshold ?? payload.ktvAlertThreshold),
                    maxConcurrentSessionsPerShift: Number(res.maxConcurrentSessionsPerShift ?? payload.maxConcurrentSessionsPerShift),
                };

                this.saving = false;
                this.success = 'Saved successfully.';
            },
            error: (err) => {
                console.error(err);
                this.saving = false;
                this.error = err?.error?.messages?.join(', ') || 'Failed to save system config.';
            },
        });
    }
}