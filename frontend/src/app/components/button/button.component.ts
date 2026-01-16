import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-button',
    standalone: true,
    imports: [CommonModule],
    template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="buttonClasses"
      (click)="onClick.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
    @Input() variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' = 'primary';
    @Input() size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' = 'base';
    @Input() type: 'button' | 'submit' | 'reset' = 'button';
    @Input() disabled: boolean = false;
    @Input() outline: boolean = false;
    @Output() onClick = new EventEmitter<Event>();

    get buttonClasses(): string {
        const baseClasses = 'font-medium rounded-lg text-center inline-flex items-center';

        const sizeClasses = {
            xs: 'px-3 py-2 text-xs',
            sm: 'px-3 py-2 text-sm',
            base: 'px-5 py-2.5 text-sm',
            lg: 'px-5 py-3 text-base',
            xl: 'px-6 py-3.5 text-base'
        };

        const variantClasses = this.outline ? {
            primary: 'text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300',
            secondary: 'text-gray-500 hover:text-white border border-gray-500 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-300',
            success: 'text-green-700 hover:text-white border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300',
            danger: 'text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300',
            warning: 'text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:outline-none focus:ring-yellow-300',
            info: 'text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300',
            light: 'text-gray-900 hover:text-white border border-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300',
            dark: 'text-gray-900 hover:text-white border border-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300'
        } : {
            primary: 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300',
            secondary: 'text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:ring-4 focus:ring-gray-200',
            success: 'text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300',
            danger: 'text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300',
            warning: 'text-white bg-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300',
            info: 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300',
            light: 'text-gray-900 bg-gray-100 border border-gray-300 hover:bg-gray-200 focus:ring-4 focus:ring-gray-200',
            dark: 'text-white bg-gray-800 hover:bg-gray-900 focus:ring-4 focus:ring-gray-300'
        };

        const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

        return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${disabledClasses}`.trim();
    }
}
