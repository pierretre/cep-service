import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownItem {
    label: string;
    value: any;
    disabled?: boolean;
    divider?: boolean;
}

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="relative inline-block text-left">
      <button
        type="button"
        [class]="buttonClasses"
        (click)="toggleDropdown()"
        [disabled]="disabled"
      >
        {{ selectedLabel || placeholder }}
        <svg class="w-2.5 h-2.5 ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div *ngIf="isOpen" [class]="dropdownClasses">
        <ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
          <li *ngFor="let item of items">
            <hr *ngIf="item.divider" class="my-1 border-gray-200 dark:border-gray-600">
            <button
              *ngIf="!item.divider"
              type="button"
              [class]="itemClasses"
              [disabled]="item.disabled"
              (click)="selectItem(item)"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class DropdownComponent {
    @Input() items: DropdownItem[] = [];
    @Input() placeholder: string = 'Select an option';
    @Input() disabled: boolean = false;
    @Input() selectedValue: any = null;
    @Output() onSelect = new EventEmitter<DropdownItem>();

    isOpen: boolean = false;

    constructor(private elementRef: ElementRef) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }

    toggleDropdown(): void {
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
        }
    }

    selectItem(item: DropdownItem): void {
        if (!item.disabled) {
            this.selectedValue = item.value;
            this.isOpen = false;
            this.onSelect.emit(item);
        }
    }

    get selectedLabel(): string {
        const selectedItem = this.items.find(item => item.value === this.selectedValue);
        return selectedItem ? selectedItem.label : '';
    }

    get buttonClasses(): string {
        const baseClasses = 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800';
        const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

        return `${baseClasses} ${disabledClasses}`.trim();
    }

    get dropdownClasses(): string {
        return 'z-10 absolute top-full left-0 mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700';
    }

    get itemClasses(): string {
        return 'block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed';
    }
}
