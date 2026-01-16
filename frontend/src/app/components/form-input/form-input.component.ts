import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-form-input',
    standalone: true,
    imports: [CommonModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormInputComponent),
            multi: true
        }
    ],
    template: `
    <div class="mb-5">
      <label *ngIf="label" [for]="inputId" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {{ label }}
        <span *ngIf="required" class="text-red-500">*</span>
      </label>
      <input
        [id]="inputId"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [required]="required"
        [class]="inputClasses"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus()"
      />
      <p *ngIf="helperText" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ helperText }}
      </p>
      <p *ngIf="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-500">
        {{ errorMessage }}
      </p>
    </div>
  `
})
export class FormInputComponent implements ControlValueAccessor {
    @Input() label?: string;
    @Input() type: string = 'text';
    @Input() placeholder?: string;
    @Input() disabled: boolean = false;
    @Input() required: boolean = false;
    @Input() helperText?: string;
    @Input() errorMessage?: string;
    @Input() size: 'sm' | 'base' | 'lg' = 'base';
    @Output() onInputChange = new EventEmitter<string>();
    @Output() onInputFocus = new EventEmitter<void>();
    @Output() onInputBlur = new EventEmitter<void>();

    value: string = '';
    inputId: string = `input-${Math.random().toString(36).substr(2, 9)}`;

    private onChange = (value: string) => { };
    private onTouched = () => { };

    writeValue(value: string): void {
        this.value = value || '';
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.value = target.value;
        this.onChange(this.value);
        this.onInputChange.emit(this.value);
    }

    onBlur(): void {
        this.onTouched();
        this.onInputBlur.emit();
    }

    onFocus(): void {
        this.onInputFocus.emit();
    }

    get inputClasses(): string {
        const baseClasses = 'border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500';

        const sizeClasses = {
            sm: 'p-2 text-sm',
            base: 'p-2.5 text-sm',
            lg: 'p-4 text-base'
        };

        const errorClasses = this.errorMessage ? 'bg-red-50 border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:bg-red-100 dark:border-red-400' : 'bg-gray-50';

        const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

        return `${baseClasses} ${sizeClasses[this.size]} ${errorClasses} ${disabledClasses}`.trim();
    }
}
