import { Injectable, signal, computed } from '@angular/core';
import { FilterConfig } from './filter-history.store';

/**
 * Centralized filter store using signals for reactive state management
 */
@Injectable({
    providedIn: 'root'
})
export class FilterStore {
    // Current filter state
    private filterState = signal<FilterConfig>({
        startDate: this.getDefaultStartDate(),
        endDate: this.getDefaultEndDate(),
        severityLevels: {
            critical: true,
            high: true,
            medium: true,
            low: true
        }
    });

    // Computed signals
    readonly filters = this.filterState.asReadonly();
    readonly dateRange = computed(() => ({
        start: this.filterState().startDate,
        end: this.filterState().endDate
    }));
    readonly activeSeverities = computed(() => {
        const levels = this.filterState().severityLevels;
        return Object.entries(levels)
            .filter(([_, active]) => active)
            .map(([level]) => level);
    });

    constructor() { }

    /**
     * Update entire filter state
     */
    updateFilters(filters: Partial<FilterConfig>): void {
        this.filterState.update(current => ({ ...current, ...filters }));
    }

    /**
     * Update date range from zoom event
     */
    updateDateRangeFromZoom(start: number, end: number): void {
        const startDate = new Date(start).toISOString().split('T')[0];
        const endDate = new Date(end).toISOString().split('T')[0];

        this.filterState.update(current => ({
            ...current,
            startDate,
            endDate
        }));
    }

    /**
     * Update severity levels
     */
    updateSeverityLevels(severityLevels: Partial<FilterConfig['severityLevels']>): void {
        this.filterState.update(current => ({
            ...current,
            severityLevels: { ...current.severityLevels, ...severityLevels }
        }));
    }

    /**
     * Update status filter
     */
    updateStatus(status: string): void {
        this.filterState.update(current => ({ ...current, status }));
    }

    /**
     * Update data source filter
     */
    updateDataSource(dataSource: string): void {
        this.filterState.update(current => ({ ...current, dataSource }));
    }

    /**
     * Update aggregation period
     */
    updateAggregation(aggregation: string): void {
        this.filterState.update(current => ({ ...current, aggregation }));
    }

    /**
     * Reset filters to default
     */
    resetFilters(): void {
        this.filterState.set({
            startDate: this.getDefaultStartDate(),
            endDate: this.getDefaultEndDate(),
            severityLevels: {
                critical: true,
                high: true,
                medium: true,
                low: true
            }
        });
    }

    private getDefaultStartDate(): string {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    }

    private getDefaultEndDate(): string {
        return new Date().toISOString().split('T')[0];
    }
}
