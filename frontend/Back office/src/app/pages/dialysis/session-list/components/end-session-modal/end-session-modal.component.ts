import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppModalComponent} from "../../../../../shared/components/ui/app-modal/app-modal.component";
import { ButtonComponent} from "../../../../../shared/components/ui/button/button.component";
import { DialysisSession} from "../../../../../shared/models/dialysis.model";

@Component({
    selector: 'app-end-session-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AppModalComponent, ButtonComponent],
    templateUrl: './end-session-modal.component.html',
})
export class EndSessionModalComponent {
    @Input() open = false;
    @Input() busy = false;
    @Input() session: DialysisSession | null = null;

    @Output() closed = new EventEmitter<void>();
    @Output() submit = new EventEmitter<{ weightAfter: number; preDialysisUrea: number; postDialysisUrea: number }>();

    attempted = false;
    weightAfter: number | null = null;
    preUrea: number | null = null;
    postUrea: number | null = null;

    ngOnChanges(): void {
        if (this.open) {
            this.attempted = false;
            this.weightAfter = null;
            this.preUrea = null;
            this.postUrea = null;
        }
    }

    invalid(): boolean {
        if (!this.session) return true;

        const before = Number((this.session as any).weightBefore);
        const after = Number(this.weightAfter);
        const pre = Number(this.preUrea);
        const post = Number(this.postUrea);

        if (!Number.isFinite(after) || after <= 0 || after > 500) return true;
        if (!Number.isFinite(pre) || pre <= 0 || pre > 5000) return true;
        if (!Number.isFinite(post) || post <= 0 || post > 5000) return true;

        if (Number.isFinite(before) && after >= before) return true;
        if (post >= pre) return true;

        return false;
    }

    afterNotLowerThanBefore(): boolean {
        if (!this.session) return false;
        const before = Number((this.session as any).weightBefore);
        const after = Number(this.weightAfter);
        if (!Number.isFinite(before) || !Number.isFinite(after)) return false;
        return after >= before;
    }

    postNotLowerThanPre(): boolean {
        const pre = Number(this.preUrea);
        const post = Number(this.postUrea);
        if (!Number.isFinite(pre) || !Number.isFinite(post)) return false;
        return post >= pre;
    }

    onSubmit(): void {
        this.attempted = true;
        if (this.invalid()) return;

        this.submit.emit({
            weightAfter: Number(this.weightAfter),
            preDialysisUrea: Number(this.preUrea),
            postDialysisUrea: Number(this.postUrea),
        });
    }
}