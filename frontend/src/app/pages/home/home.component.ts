import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdaptiveScatterComponent } from '../../components/adaptive-timeseries-chart/adaptive-scatter.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { FilterStore } from '../../stores/filter.store';

interface SelectedData {
    startTime: Date;
    endTime: Date;
    totalIncidents: number;
    avgValue: number;
    peakValue: number;
    details: Array<{
        timestamp: Date;
        count: number;
        value: number;
        severity: string;
        status: string;
    }>;
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, AdaptiveScatterComponent, NavbarComponent, FilterSidebarComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    selectedData = signal<SelectedData | null>(null);

    constructor(protected filterStore: FilterStore) { }

    refreshData(): void {
        // Trigger data refresh in chart component
    }

    exportData(): void {
        // Export current view data
    }

    openSettings(): void {
        // Open settings dialog
    }

    onScatterSelection(event: any): void {
        this.selectedData.set(event ? {
            startTime: new Date(event.startTime || Date.now()),
            endTime: new Date(event.endTime || Date.now()),
            totalIncidents: event.totalIncidents || 0,
            avgValue: event.avgValue || 0,
            peakValue: event.peakValue || 0,
            details: event.details || []
        } : null);
    }

    clearSelection(): void {
        this.selectedData.set(null);
    }
}
