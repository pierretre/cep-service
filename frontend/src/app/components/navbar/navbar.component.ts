import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NavbarRole = 'Operational Engineer' | 'Factory Manager';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
    @Input() title = 'Incident History';
    @Input() showExportButton = true;
    @Input() showRoleToggle = false;
    @Input() selectedRole: NavbarRole = 'Operational Engineer';

    @Output() refresh = new EventEmitter<void>();
    @Output() export = new EventEmitter<void>();
    @Output() settings = new EventEmitter<void>();
    @Output() roleChange = new EventEmitter<NavbarRole>();

    onRefresh() {
        this.refresh.emit();
    }

    onExport() {
        this.export.emit();
    }

    onSettings() {
        this.settings.emit();
    }

    onRoleChange(role: NavbarRole): void {
        this.roleChange.emit(role);
    }
}
