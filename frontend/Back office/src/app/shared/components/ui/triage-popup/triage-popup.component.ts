import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { TriageLevel } from '../../../../services/clinical.service';

@Component({
  selector: 'app-triage-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent
  ],
  templateUrl: './triage-popup.component.html',
  styles: ``
})
export class TriagePopupComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Input() type: 'confirm' | 'prompt' | 'triageOverride' = 'confirm';
  @Input() value: string = '';
  @Input() defaultTriageLevel: TriageLevel = 'GREEN';
  @Input() placeholderText = '';
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<boolean>();
  @Output() valueSubmit = new EventEmitter<string>();
  @Output() triageOverride = new EventEmitter<{
    triageLevel: TriageLevel;
    maxWaitMinutes: number | null;
    overrideReason: string;
  }>();

  triageLevel: TriageLevel = 'GREEN';
  maxWaitMinutes: string = '';
  overrideReason: string = '';
  inputValue: string = '';
  readonly triageLevels: TriageLevel[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
  
  errorMessage: string | null = null;

  ngOnInit() {
    this.resetValues();
  }

  ngOnChanges() {
    if (this.isOpen) {
      this.resetValues();
    }
  }

  resetValues() {
    this.inputValue = this.value;
    this.triageLevel = this.defaultTriageLevel;
    this.maxWaitMinutes = '';
    this.overrideReason = '';
    this.errorMessage = null;
  }

  onConfirm() {
    this.confirm.emit(true);
    this.close.emit();
  }

  onCancel() {
    if (this.type === 'confirm') {
      this.confirm.emit(false);
    }
    this.close.emit();
  }

  onSubmit() {
    if (this.type === 'prompt') {
      this.valueSubmit.emit(this.inputValue);
      this.close.emit();
    } else if (this.type === 'triageOverride') {
      this.validateAndSubmitOverride();
    }
  }

  validateAndSubmitOverride() {
    this.errorMessage = null;
    
    // Validate override reason
    if (!this.overrideReason || !this.overrideReason.trim()) {
      this.errorMessage = 'Override reason is required.';
      return;
    }
    
    // Validate max wait minutes if provided
    let maxWaitParsed: number | null = null;
    if (this.maxWaitMinutes && this.maxWaitMinutes.trim() !== '') {
      maxWaitParsed = Number(this.maxWaitMinutes);
      if (!Number.isFinite(maxWaitParsed) || maxWaitParsed < 0 || maxWaitParsed > 360) {
        this.errorMessage = 'Max wait must be between 0 and 360.';
        return;
      }
    }
    
    // Submit override if validation passes
    this.triageOverride.emit({
      triageLevel: this.triageLevel,
      maxWaitMinutes: maxWaitParsed,
      overrideReason: this.overrideReason.trim()
    });
    
    this.close.emit();
  }
}