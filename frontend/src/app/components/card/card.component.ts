import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div [class]="cardClasses">
      <div *ngIf="imageUrl" class="rounded-t-lg overflow-hidden">
        <img [src]="imageUrl" [alt]="imageAlt" class="w-full h-48 object-cover">
      </div>
      <div class="p-5">
        <h5 *ngIf="title" class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ title }}
        </h5>
        <p *ngIf="description" class="mb-3 font-normal text-gray-700 dark:text-gray-400">
          {{ description }}
        </p>
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {
    @Input() title?: string;
    @Input() description?: string;
    @Input() imageUrl?: string;
    @Input() imageAlt?: string;
    @Input() hover: boolean = false;

    get cardClasses(): string {
        const baseClasses = 'bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700';
        const hoverClasses = this.hover ? 'hover:shadow-lg transition-shadow duration-300' : '';

        return `${baseClasses} ${hoverClasses}`.trim();
    }
}
