import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NavbarComponent, NavbarRole } from '../../components/navbar/navbar.component';
import { ReplanningIncidentPopupComponent } from '../../components/replanning-incident-popup/replanning-incident-popup.component';
import { FactoryShopfloorLayoutComponent } from '../../components/factory-shopfloor-layout/factory-shopfloor-layout.component';
import { ReplanningIncidentStore } from '../../stores/replanning-incident.store';

const ROLE_SESSION_STORAGE_KEY = 'factorySupervisionRole';

@Component({
    selector: 'app-factory-supervision',
    standalone: true,
    imports: [CommonModule, NavbarComponent, ReplanningIncidentPopupComponent, FactoryShopfloorLayoutComponent],
    templateUrl: './factory-supervision.component.html',
    styleUrls: ['./factory-supervision.component.css']
})
export class FactorySupervisionComponent implements OnInit {
    private replanningIncidentStore = inject(ReplanningIncidentStore);

    selectedRole = signal<NavbarRole>('Operational Engineer');
    currentReplanningIncident = this.replanningIncidentStore.currentIncident;
    replanningHistory = this.replanningIncidentStore.history;
    isOperationalEngineer = computed(() => this.selectedRole() === 'Operational Engineer');

    ngOnInit(): void {
        const savedRole = sessionStorage.getItem(ROLE_SESSION_STORAGE_KEY);

        if (this.isValidRole(savedRole)) {
            this.selectedRole.set(savedRole);
        }
    }

    onRoleChange(role: NavbarRole): void {
        this.selectedRole.set(role);
        sessionStorage.setItem(ROLE_SESSION_STORAGE_KEY, role);
    }

    onValidateCorrection(comment: string): void {
        this.replanningIncidentStore.resolveCurrentIncident(comment);
    }

    triggerMockIncident(): void {
        this.replanningIncidentStore.triggerLiveIncident();
    }

    private isValidRole(role: string | null): role is NavbarRole {
        return role === 'Operational Engineer' || role === 'Factory Manager';
    }
}
