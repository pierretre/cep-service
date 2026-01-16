import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SidebarItem {
    label: string;
    icon?: string;
    href?: string;
    active?: boolean;
    disabled?: boolean;
    children?: SidebarItem[];
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <aside [class]="sidebarClasses">
      <div class="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        <ul class="space-y-2 font-medium">
          <li *ngFor="let item of items">
            <a
              *ngIf="!item.children"
              [href]="item.href"
              [class]="getItemClasses(item)"
              (click)="onItemClick(item, $event)"
            >
              <svg *ngIf="item.icon" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <!-- You can add specific icons based on item.icon value -->
                <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
              </svg>
              <span class="ml-3">{{ item.label }}</span>
            </a>

            <!-- Dropdown menu item -->
            <button
              *ngIf="item.children"
              type="button"
              [class]="getItemClasses(item)"
              (click)="toggleDropdown(item)"
            >
              <svg *ngIf="item.icon" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
              </svg>
              <span class="flex-1 ml-3 text-left whitespace-nowrap">{{ item.label }}</span>
              <svg class="w-3 h-3" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>

            <ul *ngIf="item.children && isDropdownOpen(item)" class="py-2 space-y-2">
              <li *ngFor="let child of item.children">
                <a
                  [href]="child.href"
                  [class]="getChildItemClasses(child)"
                  (click)="onItemClick(child, $event)"
                >
                  {{ child.label }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </aside>
  `
})
export class SidebarComponent {
    @Input() items: SidebarItem[] = [];
    @Input() width: 'sm' | 'md' | 'lg' = 'md';
    @Output() onItemClick = new EventEmitter<SidebarItem>();

    private openDropdowns = new Set<SidebarItem>();

    toggleDropdown(item: SidebarItem): void {
        if (this.openDropdowns.has(item)) {
            this.openDropdowns.delete(item);
        } else {
            this.openDropdowns.add(item);
        }
    }

    isDropdownOpen(item: SidebarItem): boolean {
        return this.openDropdowns.has(item);
    }

    onItemClick(item: SidebarItem, event: Event): void {
        if (item.disabled) {
            event.preventDefault();
            return;
        }
        this.onItemClick.emit(item);
    }

    get sidebarClasses(): string {
        const baseClasses = 'h-screen';

        const widthClasses = {
            sm: 'w-48',
            md: 'w-64',
            lg: 'w-80'
        };

        return `${baseClasses} ${widthClasses[this.width]}`.trim();
    }

    getItemClasses(item: SidebarItem): string {
        const baseClasses = 'flex items-center p-2 text-gray-900 rounded-lg dark:text-white group';

        if (item.active) {
            return `${baseClasses} bg-gray-100 dark:bg-gray-700`.trim();
        }

        if (item.disabled) {
            return `${baseClasses} text-gray-400 cursor-not-allowed`.trim();
        }

        return `${baseClasses} hover:bg-gray-100 dark:hover:bg-gray-700`.trim();
    }

    getChildItemClasses(item: SidebarItem): string {
        const baseClasses = 'flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg pl-11 group dark:text-white';

        if (item.active) {
            return `${baseClasses} bg-gray-100 dark:bg-gray-700`.trim();
        }

        if (item.disabled) {
            return `${baseClasses} text-gray-400 cursor-not-allowed`.trim();
        }

        return `${baseClasses} hover:bg-gray-100 dark:hover:bg-gray-700`.trim();
    }
}
