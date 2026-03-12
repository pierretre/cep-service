import { Injectable, effect, inject, signal } from '@angular/core';
import { Incident, IncidentSeverity } from '../models';
import { FilterStore } from './filter.store';
import { IncidentService } from '../services/incident.service';
import { Subscription } from 'rxjs';

/**
 * Store for managing incidents, time range, resolution, and severity filters.
 * It owns when data is loaded by gating SSE connections on page readiness.
 */
@Injectable({
    providedIn: 'root'
})
export class IncidentStore {
    private readonly filterStore = inject(FilterStore);

    filteredIncidents = signal<Array<Incident>>([]);
    private incidents: Array<Incident> = [];
    private lastUpdateTime: Date | null = null;

    private sseSubscription: Subscription | null = null;

    constructor(private readonly incidentService: IncidentService) {
        console.log('[Store] Initializing IncidentStore');

        // Load initial incidents immediately
        this.loadInitialIncidents();

        // Connect to SSE stream for real-time updates
        this.connectToSseStream();

        // React to filter changes
        effect(() => {
            const filters = this.filterStore.filters();
            if (Number.isNaN(filters.startDate.getTime()) || Number.isNaN(filters.endDate.getTime())) {
                return;
            }
            console.log('[Store] Filters changed, reapplying filters');
            this.applyFilters();
        });
    }

    private loadInitialIncidents(): void {
        console.log('[Store] Loading initial incidents');
        this.incidentService.getAllIncidents().subscribe({
            next: (incidents) => {
                this.incidents = incidents;
                this.lastUpdateTime = new Date();
                console.log(`[Store] Loaded ${incidents.length} incidents`);
            },
            error: (error) => {
                console.error('[Store] Error loading incidents:', error);
            }
        });
    }

    private connectToSseStream(): void {
        console.log('[Store] Connecting to SSE stream for real-time incident updates');
        this.sseSubscription = this.incidentService.connectToIncidentStream().subscribe({
            next: (incident) => {
                console.log('[Store] New incident received via SSE:', incident);

                // Check if incident already exists (by ID)
                const existingIndex = this.incidents.findIndex(i => i.id === incident.id);

                if (existingIndex >= 0) {
                    // Update existing incident
                    this.incidents[existingIndex] = incident;
                    console.log(`[Store] Updated incident ${incident.id}`);
                } else {
                    // Add new incident
                    this.incidents.push(incident);
                    console.log(`[Store] Added new incident ${incident.id}`);
                }

                this.lastUpdateTime = new Date();

                // Reapply filters when new incident arrives
                this.applyFilters();
            },
            error: (error) => {
                console.error('[Store] SSE stream error:', error);
            }
        });
    }

    private applyFilters() {
        const filters = this.filterStore.filters();
        const start = filters.startDate.getTime();
        const end = filters.endDate.setHours(23, 59, 59, 999);
        const selectedRules = filters.selectedRules;
        const liveMode = filters.liveMode;
        const searchTerm = filters.incidentSearchTerm.toLowerCase();

        console.log(`[Store] Before filtering, total incidents: ${this.incidents.length}`);

        this.filteredIncidents.set(this.incidents.filter(incident => {
            const incidentTime = incident.startTime.getTime();

            // Check time range - start date always applies, end date only in non-live mode
            if (incidentTime < start) {
                return false;
            }

            if (!liveMode && incidentTime > end) {
                return false;
            }

            // Check severity
            let severityMatch = false;
            switch (incident.severity) {
                case IncidentSeverity.Critical: severityMatch = filters.severityLevels.critical; break;
                case IncidentSeverity.Warning: severityMatch = filters.severityLevels.warning; break;
                case IncidentSeverity.Info: severityMatch = filters.severityLevels.info; break;
            }

            if (!severityMatch) {
                return false;
            }

            // Check rule filter
            if (selectedRules && selectedRules.length > 0) {
                if (!selectedRules.includes(incident.rule.name)) {
                    return false;
                }
            }

            // Check search term - search across all incident fields
            if (searchTerm) {
                const searchableText = [
                    incident.id.toString(),
                    incident.message,
                    incident.rule.name,
                    incident.severity,
                    incident.startTime.toString(),
                    incident.createdAt.toString(),
                    incident.updatedAt?.toString() || ''
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        }));

        console.log(`[Store] Filtered incidents count: ${this.filteredIncidents().length}`);
    }

    /**
     * Clear all data and disconnect SSE
     */
    clear(): void {
        this.incidents = [];
        this.filteredIncidents.set([]);
        if (this.sseSubscription) {
            this.sseSubscription.unsubscribe();
            this.sseSubscription = null;
        }
        this.incidentService.disconnectFromIncidentStream();
    }
}
