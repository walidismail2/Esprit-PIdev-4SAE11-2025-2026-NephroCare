import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppModalComponent } from '../../../../../shared/components/ui/app-modal/app-modal.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import {DialysisService, SessionReportDto} from '../../../../../shared/services/dialysis.service';

@Component({
    selector: 'app-session-report-modal',
    standalone: true,
    imports: [CommonModule, AppModalComponent, ButtonComponent],
    templateUrl: './session-report-modal.component.html',
})
export class SessionReportModalComponent {
    constructor(private dialysisService: DialysisService) {}
    @Input() open = false;
    @Input() busy = false;
    @Input() report: SessionReportDto | null = null;
    @Input() error: string | null = null;

    @Output() closed = new EventEmitter<void>();

    copy(): void {
        if (!this.report?.reportText) return;
        navigator.clipboard.writeText(this.report.reportText);
    }

    // -------- JSON helpers
    json(path: string): any {
        const obj: any = this.report?.reportJson;
        if (!obj || typeof obj !== 'object') return null;

        return path.split('.').reduce((acc: any, key: string) => (acc && acc[key] != null ? acc[key] : null), obj);
    }

    recommendationsList(): any[] {
        const r = this.json('recommendations');
        return Array.isArray(r) ? r : [];
    }

    // -------- KPI helpers (from reportJson)
    urrValue(): string {
        const v = this.json('adequacy.urr');
        return typeof v === 'number' ? v.toFixed(2) : '-';
    }
    spKtvValue(): string {
        const v = this.json('adequacy.spKtV');
        return typeof v === 'number' ? v.toFixed(2) : '-';
    }
    eKtvValue(): string {
        const v = this.json('adequacy.eKtV');
        return typeof v === 'number' ? v.toFixed(2) : '-';
    }
    ufValue(): string {
        const v = this.json('fluid.calculatedUF');
        return typeof v === 'number' ? v.toFixed(1) : '-';
    }
    ufFlag(): string {
        return this.json('fluid.flag') || '-';
    }

    urrOk(): boolean {
        return !!this.json('adequacy.urrPass');
    }
    ktvOk(): boolean {
        return !!this.json('adequacy.ktvPass');
    }
    isAdequate(): boolean {
        return !!this.json('adequacy.overallAdequate');
    }
    riskScore(): number | null {
        const v = this.json('decisionSupport.dialysisRiskScore');
        return typeof v === 'number' ? v : null;
    }

    stabilityIndex(): number | null {
        const v = this.json('decisionSupport.patientStabilityIndex');
        return typeof v === 'number' ? v : null;
    }
    downloadPdf(): void {
        const id = this.report?.sessionId;
        if (!id) return;

        this.dialysisService.downloadReportPdf(id).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dialysis-report-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    }
}