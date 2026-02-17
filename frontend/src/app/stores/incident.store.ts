import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Incident, IncidentSeverity } from '../models';
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

    // Visible range (driven by scatter zoom)
    visibleStartTime = signal<number>(0);
    visibleEndTime = signal<number>(0);

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

        const bucketMillis = this.getResolutionInMillis(resolution);

        // ---- SAFETY: raw resolution or invalid bucket ----
        if (!bucketMillis || bucketMillis <= 0) {
            return this.aggregateRaw(incidents);
        }

        // ---- OPTIONAL: use visible range if you have one ----
        if (!this.startTime()) {
            this.startTime.set(Math.min(...incidents.map(i => +new Date(i.startTime))));
        }

        if (!this.endTime()) {
            this.endTime.set(Math.max(...incidents.map(i => +new Date(i.startTime))));
        }

        const rangeStart = this.startTime();
        const rangeEnd = this.endTime();

        console.log('[Store] Aggregating incidents into time-series with resolution:', resolution, 'Bucket size (ms):', bucketMillis, 'Time range:', new Date(rangeStart).toLocaleString(), '-', new Date(rangeEnd).toLocaleString());

        if (!isFinite(rangeStart) || !isFinite(rangeEnd)) {
            return { critical: [], warning: [], info: [] };
        }

        // ---- ALIGN RANGE TO BUCKETS ----
        const alignedStart = Math.floor(rangeStart / bucketMillis) * bucketMillis;
        const alignedEnd = Math.ceil(rangeEnd / bucketMillis) * bucketMillis;

        // ---- CREATE UNIFIED BUCKET TIMELINE ----
        const critical = new Map<number, number>();
        const warning = new Map<number, number>();
        const info = new Map<number, number>();

        for (let t = alignedStart; t <= alignedEnd; t += bucketMillis) {
            critical.set(t, 0);
            warning.set(t, 0);
            info.set(t, 0);
        }

        // ---- AGGREGATE INCIDENTS ----
        for (const incident of incidents) {

            const ts = +new Date(incident.startTime);
            if (!isFinite(ts)) continue;

            const bucket = Math.floor(ts / bucketMillis) * bucketMillis;

            switch (incident.severity) {
                case IncidentSeverity.Critical:
                    critical.set(bucket, (critical.get(bucket) ?? 0) + 1);
                    break;

                case IncidentSeverity.Warning:
                    warning.set(bucket, (warning.get(bucket) ?? 0) + 1);
                    break;

                case IncidentSeverity.Info:
                    info.set(bucket, (info.get(bucket) ?? 0) + 1);
                    break;
            }
        }

        // ---- MAP → SORTED ARRAYS (already sorted if inserted sequentially, but safe) ----
        const toSeries = (map: Map<number, number>) =>
            Array.from(map.entries())
                .map(([timestamp, value]) => ({ timestamp, value }))
                .sort((a, b) => a.timestamp - b.timestamp);
        console.log('Aggregated time-series data:', {
            critical: toSeries(critical),
            warning: toSeries(warning),
            info: toSeries(info)
        });
        return {
            critical: toSeries(critical),
            warning: toSeries(warning),
            info: toSeries(info)
        };
    });

    private aggregateRaw(incidents: Incident[]) {

        const toSeries = (severity: IncidentSeverity) =>
            incidents
                .filter(i => i.severity === severity)
                .map(i => ({
                    timestamp: +new Date(i.startTime),
                    value: 1
                }))
                .sort((a, b) => a.timestamp - b.timestamp);

        return {
            critical: toSeries(IncidentSeverity.Critical),
            warning: toSeries(IncidentSeverity.Warning),
            info: toSeries(IncidentSeverity.Info)
        };
    }

    constructor() {
        effect(() => {
            const filters = this.filterStore.filters();
            if (!filters.startDate || !filters.endDate) {
                return;
            }
            console.log('[Store] Filters changed - start:', filters.startDate, 'end:', filters.endDate);
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

        effect(() => {
            const start = this.startTime();
            const end = this.endTime();

            if (!isFinite(start) || !isFinite(end)) {
                return;
            }

            const currentVisibleStart = this.visibleStartTime();
            const currentVisibleEnd = this.visibleEndTime();

            if (!currentVisibleStart || currentVisibleStart < start || currentVisibleStart > end) {
                this.visibleStartTime.set(start);
            }

            if (!currentVisibleEnd || currentVisibleEnd > end || currentVisibleEnd < start) {
                this.visibleEndTime.set(end);
            }
        });
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
        this.visibleStartTime.set(startTime);
        this.visibleEndTime.set(endTime);
    }

    /**
     * Update visible time range (driven by scatter zoom)
     */
    setVisibleRange(startTime: number, endTime: number): void {
        this.visibleStartTime.set(startTime);
        this.visibleEndTime.set(endTime);
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
