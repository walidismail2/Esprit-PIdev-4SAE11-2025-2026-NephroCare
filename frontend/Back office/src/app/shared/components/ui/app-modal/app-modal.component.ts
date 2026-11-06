import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
    selector: 'app-modal',
    standalone: true,
    templateUrl: './app-modal.component.html',
    styleUrls: ['./app-modal.component.scss']
})
export class AppModalComponent {
    @Input() title = '';
    @Input() open = false;
    @Input() width: 'sm' | 'md' | 'lg' = 'md';
    @Input() closable = true;
    @Input() busy = false;

    @Output() closed = new EventEmitter<void>();

    @HostListener('document:keydown.escape')
    onEsc(): void {
        if (this.open && this.closable && !this.busy) this.closed.emit();
    }

    onBackdropClick(): void {
        if (this.closable && !this.busy) this.closed.emit();
    }

    stop(e: MouseEvent): void {
        e.stopPropagation();
    }

    get dialogClass(): string {
        return `dialog dialog-${this.width}`;
    }
}