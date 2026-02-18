import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdaptativeChartComponent } from '../../components/adaptative-chart/adaptative-chart.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { FilterStore } from '../../stores/filter.store';
import { IncidentStore } from '../../stores/incident.store';
import { HamstersEvent } from '../../decorators/hamsters.decorator';

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
    imports: [CommonModule, AdaptativeChartComponent, NavbarComponent, FilterSidebarComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
    selectedData = signal<SelectedData | null>(null);

    constructor(
        protected filterStore: FilterStore,
        private incidentStore: IncidentStore
    ) { }

    @HamstersEvent('User accesses the overview')
    ngOnInit(): void { }

    @HamstersEvent('User triggers full extraction')
    onFullExtraction(): void {
        const visibleStart = this.filterStore.filters().startDate;
        const visibleEnd = this.filterStore.filters().endDate;

        const incidents = this.incidentStore.filteredIncidents()
            .filter(incident => {
                const time = incident.startTime.getTime();
                return time >= new Date(visibleStart).getTime() && time <= new Date(visibleEnd).getTime();
            })
            .map(incident => ({
                ...incident,
                startTime: incident.startTime.toISOString(),
                createdAt: incident.createdAt.toISOString(),
                updatedAt: incident.updatedAt ? incident.updatedAt.toISOString() : undefined
            }));

        const payload = {
            exportedAt: new Date().toISOString(),
            visibleRange: {
                start: new Date(visibleStart).toISOString(),
                end: new Date(visibleEnd).toISOString()
            },
            total: incidents.length,
            incidents
        };

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `incidents-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
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
