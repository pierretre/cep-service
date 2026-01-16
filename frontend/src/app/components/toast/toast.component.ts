import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="visible" [class]="toastClasses" role="alert">
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
        <svg *ngIf="type === 'success'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
        <svg *ngIf="type === 'error'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
        <svg *ngIf="type === 'warning'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <svg *ngIf="type === 'info'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5v3a.75.75 0 001.5 0v-3A.75.75 0 009 9z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="ml-3 text-sm font-normal">
        <div *ngIf="title" class="text-sm font-semibold">{{ title }}</div>
        <div class="text-sm">{{ message }}</div>
      </div>
      <button *ngIf="dismissible"
              type="button"
              class="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8"
              (click)="dismiss()">
        <span class="sr-only">Close</span>
        <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  `
})
export class ToastComponent implements OnInit, OnDestroy {
    @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
    @Input() title?: string;
    @Input() message: string = '';
    @Input() duration: number = 5000; // Auto dismiss after 5 seconds
    @Input() dismissible: boolean = true;
    @Input() position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
    @Output() onDismiss = new EventEmitter<void>();

    visible: boolean = true;
    private timeoutId?: number;

    ngOnInit(): void {
        if (this.duration > 0) {
            this.timeoutId = window.setTimeout(() => {
                this.dismiss();
            }, this.duration);
        }
    }

    ngOnDestroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    dismiss(): void {
        this.visible = false;
        this.onDismiss.emit();
    }

    get toastClasses(): string {
        const baseClasses = 'flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow';

        const typeClasses = {
            success: 'text-green-500 bg-green-100',
            error: 'text-red-500 bg-red-100',
            warning: 'text-orange-500 bg-orange-100',
            info: 'text-blue-500 bg-blue-100'
        };

        const positionClasses = {
            'top-right': 'fixed top-5 right-5 z-50',
            'top-left': 'fixed top-5 left-5 z-50',
            'bottom-right': 'fixed bottom-5 right-5 z-50',
            'bottom-left': 'fixed bottom-5 left-5 z-50'
        };

        return `${baseClasses} ${typeClasses[this.type]} ${positionClasses[this.position]}`.trim();
    }
}
