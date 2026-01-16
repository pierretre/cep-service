import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-spinner',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div [class]="containerClasses">
      <svg [class]="spinnerClasses" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span *ngIf="text" [class]="textClasses">{{ text }}</span>
    </div>
  `
})
export class SpinnerComponent {
    @Input() size: 'sm' | 'base' | 'lg' | 'xl' = 'base';
    @Input() color: 'blue' | 'gray' | 'green' | 'red' | 'yellow' | 'pink' | 'purple' = 'blue';
    @Input() text?: string;
    @Input() center: boolean = false;

    get containerClasses(): string {
        const baseClasses = 'flex items-center';
        const centerClasses = this.center ? 'justify-center' : '';

        return `${baseClasses} ${centerClasses}`.trim();
    }

    get spinnerClasses(): string {
        const baseClasses = 'animate-spin';

        const sizeClasses = {
            sm: 'w-4 h-4',
            base: 'w-6 h-6',
            lg: 'w-8 h-8',
            xl: 'w-12 h-12'
        };

        const colorClasses = {
            blue: 'text-blue-600',
            gray: 'text-gray-600',
            green: 'text-green-600',
            red: 'text-red-600',
            yellow: 'text-yellow-600',
            pink: 'text-pink-600',
            purple: 'text-purple-600'
        };

        const marginClasses = this.text ? 'mr-2' : '';

        return `${baseClasses} ${sizeClasses[this.size]} ${colorClasses[this.color]} ${marginClasses}`.trim();
    }

    get textClasses(): string {
        return 'text-gray-500 dark:text-gray-400';
    }
}
