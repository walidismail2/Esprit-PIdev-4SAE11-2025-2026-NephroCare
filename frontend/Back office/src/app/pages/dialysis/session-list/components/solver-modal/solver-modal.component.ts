import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppModalComponent} from "../../../../../shared/components/ui/app-modal/app-modal.component";
import { ButtonComponent} from "../../../../../shared/components/ui/button/button.component";
    import { SolverSuggestResponse, NurseDto} from "../../../../../shared/services/dialysis.service";

@Component({
    selector: 'app-solver-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AppModalComponent, ButtonComponent],
    templateUrl: './solver-modal.component.html',
})
export class SolverModalComponent {
    @Input() open = false;
    @Input() busy = false;

    @Input() solverFrom = '';
    @Input() solverTo = '';
    @Input() solverCount = 3;

    @Input() solverError: string | null = null;
    @Input() solverResult: SolverSuggestResponse | null = null;

    @Input() nurses: NurseDto[] = [];
    @Input() nursesLoading = false;
    @Input() nursesError: string | null = null;
    @Input() selectedNurseIds: string[] = [];

    @Input() confirmError: string | null = null;
    @Input() confirmSuccess: string | null = null;
    @Input() canConfirmPlan = false;

    @Input() nurseLabelFn!: (id: string | null | undefined) => string;

    @Output() closed = new EventEmitter<void>();
    @Output() runSolver = new EventEmitter<void>();
    @Output() confirm = new EventEmitter<void>();

    @Output() updateInputs = new EventEmitter<{
        solverFrom: string;
        solverTo: string;
        solverCount: number;
        selectedNurseIds: string[];
    }>();

    onChange(): void {
        this.updateInputs.emit({
            solverFrom: this.solverFrom,
            solverTo: this.solverTo,
            solverCount: this.solverCount,
            selectedNurseIds: this.selectedNurseIds,
        });
    }
}