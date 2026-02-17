import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Incident } from '../models';
import { FilterStore } from './filter.store';
import { IncidentTimeSeriesService } from '../services/incident-timeseries.service';

/**
 * Store for managing incidents, time range, resolution, and severity filters.
 * It owns when data is loaded by gating SSE connections on page readiness.
 */
@Injectable({
    providedIn: 'root'
})
export class IncidentStore {
    private filterStore = inject(FilterStore);
    private incidentService = inject(IncidentTimeSeriesService);

    // Raw incidents data (from SSE service)
    readonly incidents = this.incidentService.incidents;

    // Time window configuration (in milliseconds)
    startTime = signal<number>(0);
    endTime = signal<number>(Date.now());
    resolution = signal<string>('1m'); // 1m, 5m, 15m, 1h, 6h, 1d

    // Page readiness gate
    private pageReady = signal<boolean>(false);
    private lastStreamKey: string | null = null;

    // Severity filters
    severityFilters = signal<{
        critical: boolean;
        high: boolean;
        medium: boolean;
        low: boolean;
    }>({
        critical: true,
        high: true,
        medium: true,
        low: true
    });

    // Computed: filtered incidents based on severity
    filteredIncidents = computed(() => {
        const allIncidents = this.incidentService.incidents();
        const filters = this.severityFilters();
        const start = this.startTime();
        const end = this.endTime();

        return allIncidents.filter(incident => {
            const incidentTime = incident.startTime.getTime();

            // Check time range
            if (incidentTime < start || incidentTime > end) {
                return false;
            }

            // Check severity
            const severity = incident.severity.toLowerCase();
            switch (severity) {
                case 'critical': return filters.critical;
                case 'high': return filters.high;
                case 'medium': return filters.medium;
                case 'low': return filters.low;
                default: return true;
            }
        });
    });

    // Computed: aggregated time-series data
    timeSeriesData = computed(() => {
        const incidents = this.filteredIncidents();
        const resolution = this.resolution();

        // Calculate bucket size
        const bucketMillis = this.getResolutionInMillis(resolution);
        const buckets = new Map<number, number>();

        // Aggregate incidents into buckets
        incidents.forEach(incident => {
            const timestamp = incident.startTime.getTime();
            const bucketStart = Math.floor(timestamp / bucketMillis) * bucketMillis;

            buckets.set(bucketStart, (buckets.get(bucketStart) || 0) + 1);
        });

        // Convert to sorted array
        return Array.from(buckets.entries())
            .map(([timestamp, count]) => ({ timestamp, value: count }))
            .sort((a, b) => a.timestamp - b.timestamp);
    });

    constructor() {
        effect(() => {
            const ready = this.pageReady();
            if (!ready) {
                this.lastStreamKey = null;
                this.incidentService.disconnect();
                return;
            }

            const filters = this.filterStore.filters();
            if (!filters.startDate || !filters.endDate) {
                return;
            }

            const start = new Date(filters.startDate).getTime();
            const end = new Date(filters.endDate).setHours(23, 59, 59, 999);

            this.startTime.set(start);
            this.endTime.set(end);

            const key = `${start}-${end}`;
            if (key === this.lastStreamKey) {
                return;
            }

            this.lastStreamKey = key;
            this.incidentService.connectToIncidentsStream(start, end);
        });
    }

    /**
     * Mark the page as ready to load incident data.
     */
    setPageReady(ready: boolean): void {
        this.pageReady.set(ready);
    }

    /**
     * Update incidents from SSE stream
     */
    updateIncidents(incidents: Incident[]): void {
        this.incidentService.incidents.set(incidents);
    }

    /**
     * Add a single incident (for live updates)
     */
    addIncident(incident: Incident): void {
        const current = this.incidentService.incidents();
        const index = current.findIndex(i => i.id === incident.id);

        if (index >= 0) {
            current[index] = incident;
        } else {
            current.push(incident);
        }

        this.incidentService.incidents.set([...current]);
    }

    /**
     * Update time range
     */
    setTimeRange(startTime: number, endTime: number): void {
        this.startTime.set(startTime);
        this.endTime.set(endTime);
    }

    /**
     * Update resolution
     */
    setResolution(resolution: string): void {
        this.resolution.set(resolution);
    }

    /**
     * Update severity filters
     */
    updateSeverityFilter(severity: string, enabled: boolean): void {
        const current = this.severityFilters();
        current[severity.toLowerCase() as keyof typeof current] = enabled;
        this.severityFilters.set({ ...current });
    }

    /**
     * Clear all data
     */
    clear(): void {
        this.incidentService.clear();
    }

    private getResolutionInMillis(resolution: string): number {
        switch (resolution) {
            case '1m': return 60 * 1000;
            case '5m': return 5 * 60 * 1000;
            case '15m': return 15 * 60 * 1000;
            case '1h': return 60 * 60 * 1000;
            case '6h': return 6 * 60 * 60 * 1000;
            case '1d': return 24 * 60 * 60 * 1000;
            default: return 60 * 1000;
        }
    }
}
