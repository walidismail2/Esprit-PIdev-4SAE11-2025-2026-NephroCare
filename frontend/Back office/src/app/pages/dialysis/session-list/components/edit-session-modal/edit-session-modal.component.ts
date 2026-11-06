import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppModalComponent} from "../../../../../shared/components/ui/app-modal/app-modal.component";
import { ButtonComponent} from "../../../../../shared/components/ui/button/button.component";
import { DialysisSession} from "../../../../../shared/models/dialysis.model";

@Component({
    selector: 'app-edit-session-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AppModalComponent, ButtonComponent],
    templateUrl: './edit-session-modal.component.html',
})
export class EditSessionModalComponent {
    @Input() open = false;
    @Input() busy = false;
    @Input() session: DialysisSession | null = null;

    @Output() closed = new EventEmitter<void>();
    @Output() submit = new EventEmitter<{ weightBefore: number; preBloodPressure?: string | null; complications?: string | null }>();

    attempted = false;
    weightBefore: number | null = null;
    preBP = '';
    complications = '';

    ngOnChanges(): void {
        if (this.open && this.session) {
            this.attempted = false;
            this.weightBefore = (this.session as any).weightBefore ?? null;
            this.preBP = (this.session as any).preBloodPressure ?? '';
            this.complications = (this.session as any).complications ?? '';
        }
    }

    bpInvalid(): boolean {
        const v = (this.preBP || '').trim();
        if (!v) return false;
        return !/^\d{2,3}\/\d{2,3}$/.test(v);
    }

    invalid(): boolean {
        const w = Number(this.weightBefore);
        if (!Number.isFinite(w) || w <= 0 || w > 500) return true;
        if (this.bpInvalid()) return true;
        return false;
    }

    onSubmit(): void {
        this.attempted = true;
        if (this.invalid()) return;

        this.submit.emit({
            weightBefore: Number(this.weightBefore),
            preBloodPressure: this.preBP.trim() ? this.preBP.trim() : null,
            complications: this.complications.trim() ? this.complications.trim() : null,
        });
    }
}