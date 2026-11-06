import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent} from "../../../../../shared/components/ui/button/button.component";
import { BadgeComponent} from "../../../../../shared/components/ui/badge/badge.component";
import { DialysisTreatment} from "../../../../../shared/models/dialysis.model";

@Component({
    selector: 'app-session-header',
    standalone: true,
    imports: [CommonModule, ButtonComponent, BadgeComponent],
    templateUrl: './session-header.component.html',
})
export class SessionHeaderComponent {
    @Input() viewMode: 'TREATMENT' | 'PATIENT_HISTORY' = 'TREATMENT';
    @Input() isNurse = false;
    @Input() canUseSolver = false;
    @Input() canStartSession = false;

    @Input() treatment: DialysisTreatment | null = null;
    @Input() sessionsThisWeek = 0;
    @Input() frequencyPerWeek = 0;
    @Input() frequencyLimitReached = false;
    @Input() hasAnyOpenSession = false;

    @Output() treatmentSessions = new EventEmitter<void>();
    @Output() patientHistory = new EventEmitter<void>();
    @Output() openSolver = new EventEmitter<void>();
    @Output() openStart = new EventEmitter<void>();
    @Output() goToMySchedule = new EventEmitter<void>();
}