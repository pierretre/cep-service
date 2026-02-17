import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RelateHoverInfo {
    count: number;
    ruleName: string;
    severity: string;
}

@Component({
    selector: 'app-relate-hover',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './relate-hover.component.html',
    styleUrls: ['./relate-hover.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelateHoverComponent {
    @Input() hoverInfo: RelateHoverInfo | null = null;

    getSeverityBadgeClass(severity: string): string {
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
