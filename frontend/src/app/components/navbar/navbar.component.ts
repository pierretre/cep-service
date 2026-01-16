import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavItem {
    label: string;
    href?: string;
    active?: boolean;
    disabled?: boolean;
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <nav class="bg-white border-gray-200 dark:bg-gray-900">
      <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a [href]="brandHref" class="flex items-center space-x-3 rtl:space-x-reverse">
          <img *ngIf="brandLogo" [src]="brandLogo" class="h-8" [alt]="brandText">
          <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">{{ brandText }}</span>
        </a>

        <button
          type="button"
          class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          (click)="toggleMobileMenu()"
        >
          <span class="sr-only">Open main menu</span>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 17 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
          </svg>
        </button>

        <div [class]="menuClasses">
          <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li *ngFor="let item of navItems">
              <a
                [href]="item.href"
                [class]="getNavItemClasses(item)"
                (click)="onNavItemClick(item, $event)"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
    @Input() brandText: string = 'Flowbite';
    @Input() brandLogo?: string;
    @Input() brandHref: string = '#';
    @Input() navItems: NavItem[] = [];
    @Output() onItemClick = new EventEmitter<NavItem>();

    isMobileMenuOpen: boolean = false;

    toggleMobileMenu(): void {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    onNavItemClick(item: NavItem, event: Event): void {
        if (item.disabled) {
            event.preventDefault();
            return;
        }
        this.onItemClick.emit(item);
    }

    get menuClasses(): string {
        const baseClasses = 'w-full md:block md:w-auto';
        const visibilityClasses = this.isMobileMenuOpen ? 'block' : 'hidden';

        return `${baseClasses} ${visibilityClasses}`.trim();
    }

    getNavItemClasses(item: NavItem): string {
        const baseClasses = 'block py-2 px-3 rounded md:bg-transparent md:p-0';

        if (item.active) {
            return `${baseClasses} text-white bg-blue-700 md:text-blue-700 md:dark:text-blue-500`.trim();
        }

        if (item.disabled) {
            return `${baseClasses} text-gray-400 cursor-not-allowed`.trim();
        }

        return `${baseClasses} text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent`.trim();
    }
}
