import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppModalComponent} from "../../../../../shared/components/ui/app-modal/app-modal.component";
import { ButtonComponent} from "../../../../../shared/components/ui/button/button.component";
import { DialysisTreatment} from "../../../../../shared/models/dialysis.model";
import { DialysisShift} from "../../../../../shared/services/dialysis.service";

@Component({
    selector: 'app-start-session-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AppModalComponent, ButtonComponent],
    templateUrl: './start-session-modal.component.html',
})
export class StartSessionModalComponent {
    @Input() open = false;
    @Input() busy = false;

    @Input() treatment: DialysisTreatment | null = null;
    @Input() todayStr = '';
    @Input() defaultShift: DialysisShift = 'MORNING';
    @Input() shiftLocked = false;

    @Output() closed = new EventEmitter<void>();
    @Output() submit = new EventEmitter<{ shift: DialysisShift; weightBefore: number; preBloodPressure?: string | null; complications?: string | null }>();

    attempted = false;
    accessConfirmed = false;

    shift: DialysisShift = 'MORNING';
    weightBefore: number | null = null;
    preBP = '';
    complications = '';

    ngOnChanges(): void {
        if (this.open) {
            this.attempted = false;
            this.accessConfirmed = false;
            this.shift = this.defaultShift || 'MORNING';
            this.weightBefore = null;
            this.preBP = '';
            this.complications = '';
        }
    }

    bpInvalid(): boolean {
        const v = (this.preBP || '').trim();
        if (!v) return false;
        return !/^\d{2,3}\/\d{2,3}$/.test(v);
    }

    invalid(): boolean {
        if (!this.accessConfirmed) return true;

        const w = Number(this.weightBefore);
        if (!Number.isFinite(w) || w <= 0 || w > 500) return true;

        if (this.bpInvalid()) return true;

        return false;
    }

    onSubmit(): void {
        this.attempted = true;
        if (this.invalid()) return;

        this.submit.emit({
            shift: this.shift,
            weightBefore: Number(this.weightBefore),
            preBloodPressure: this.preBP.trim() ? this.preBP.trim() : null,
            complications: this.complications.trim() ? this.complications.trim() : null,
        });
    }
}