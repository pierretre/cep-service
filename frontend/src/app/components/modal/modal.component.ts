import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-y-auto" (click)="onBackdropClick($event)">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div [class]="modalClasses" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div *ngIf="title || showCloseButton" class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
            <h3 *ngIf="title" class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ title }}
            </h3>
            <button *ngIf="showCloseButton"
                    type="button"
                    class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    (click)="close()">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 md:p-5 space-y-4">
            <ng-content></ng-content>
          </div>

          <!-- Footer -->
          <div *ngIf="showFooter" class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
            <ng-content select="[slot=footer]"></ng-content>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent implements OnInit, OnDestroy {
    @Input() isOpen: boolean = false;
    @Input() title?: string;
    @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'max' = 'md';
    @Input() showCloseButton: boolean = true;
    @Input() showFooter: boolean = false;
    @Input() closeOnBackdrop: boolean = true;
    @Output() onClose = new EventEmitter<void>();

    ngOnInit() {
        if (this.isOpen) {
            document.body.style.overflow = 'hidden';
        }
    }

    ngOnDestroy() {
        document.body.style.overflow = 'auto';
    }

    close() {
        this.isOpen = false;
        document.body.style.overflow = 'auto';
        this.onClose.emit();
    }

    onBackdropClick(event: Event) {
        if (this.closeOnBackdrop && event.target === event.currentTarget) {
            this.close();
        }
    }

    get modalClasses(): string {
        const baseClasses = 'relative bg-white rounded-lg shadow dark:bg-gray-700';

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-2xl',
            lg: 'max-w-4xl',
            xl: 'max-w-7xl',
            max: 'max-w-full mx-4'
        };

        return `${baseClasses} ${sizeClasses[this.size]}`.trim();
    }
}
