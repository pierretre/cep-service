import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Incident } from '../../models';

@Component({
    selector: 'app-incident-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './incident-details.component.html',
    styleUrls: ['./incident-details.component.css']
})
export class IncidentDetailsComponent {
    @Input() incident: Incident | null = null;
    @Output() close = new EventEmitter<void>();

    onClose(): void {
        this.close.emit();
    }

    getSeverityClass(severity: string): string {
        switch (severity.toLowerCase()) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'warning':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'info':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    }
}
