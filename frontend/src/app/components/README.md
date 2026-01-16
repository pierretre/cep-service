# Flowbite Angular Components

This folder contains a collection of reusable Angular components based on Flowbite design system. Each component is standalone and can be imported individually.

## Available Components

### Button Component
```typescript
import { ButtonComponent } from './components';

// Usage in template:
<app-button variant="primary" size="base" (onClick)="handleClick()">
  Click me
</app-button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
- `size`: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
- `outline`: boolean
- `disabled`: boolean

### Card Component
```typescript
import { CardComponent } from './components';

// Usage:
<app-card title="Card Title" description="Card description" [hover]="true">
  <p>Card content goes here</p>
</app-card>
```

### Modal Component
```typescript
import { ModalComponent } from './components';

// Usage:
<app-modal [isOpen]="showModal" title="Modal Title" (onClose)="closeModal()">
  <p>Modal content</p>
  <div slot="footer">
    <app-button (onClick)="closeModal()">Close</app-button>
  </div>
</app-modal>
```

### Alert Component
```typescript
import { AlertComponent } from './components';

// Usage:
<app-alert type="success" [dismissible]="true" (onDismiss)="handleDismiss()">
  Success message here
</app-alert>
```

### Badge Component
```typescript
import { BadgeComponent } from './components';

// Usage:
<app-badge color="blue" size="base">New</app-badge>
```

### Form Input Component
```typescript
import { FormInputComponent } from './components';

// Usage:
<app-form-input 
  label="Email" 
  type="email" 
  placeholder="Enter your email"
  [required]="true"
  [(ngModel)]="email">
</app-form-input>
```

### Dropdown Component
```typescript
import { DropdownComponent, DropdownItem } from './components';

// Usage:
const items: DropdownItem[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' }
];

<app-dropdown [items]="items" (onSelect)="handleSelect($event)"></app-dropdown>
```

### Navbar Component
```typescript
import { NavbarComponent, NavItem } from './components';

// Usage:
const navItems: NavItem[] = [
  { label: 'Home', href: '/', active: true },
  { label: 'About', href: '/about' }
];

<app-navbar brandText="My App" [navItems]="navItems"></app-navbar>
```

### Sidebar Component
```typescript
import { SidebarComponent, SidebarItem } from './components';

// Usage:
const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Settings', href: '/settings', icon: 'settings' }
];

<app-sidebar [items]="sidebarItems"></app-sidebar>
```

### Table Component
```typescript
import { TableComponent, TableColumn, TableRow } from './components';

// Usage:
const columns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' }
];

const data: TableRow[] = [
  { name: 'John Doe', email: 'john@example.com' }
];

<app-table [columns]="columns" [data]="data"></app-table>
```

### Toast Component
```typescript
import { ToastComponent } from './components';

// Usage:
<app-toast 
  type="success" 
  title="Success!" 
  message="Operation completed successfully"
  [duration]="3000">
</app-toast>
```

### Spinner Component
```typescript
import { SpinnerComponent } from './components';

// Usage:
<app-spinner size="base" color="blue" text="Loading..."></app-spinner>
```

## Installation

All components are already configured with Tailwind CSS classes. Make sure you have Tailwind CSS and Flowbite installed in your project.

## Import

You can import all components from the barrel file:

```typescript
import { 
  ButtonComponent, 
  CardComponent, 
  ModalComponent 
} from './components';
```

Or import individual components:

```typescript
import { ButtonComponent } from './components/button/button.component';
```

## Styling

All components use Tailwind CSS classes and follow Flowbite design patterns. They support dark mode out of the box.
