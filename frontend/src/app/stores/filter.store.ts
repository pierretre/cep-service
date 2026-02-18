import { Injectable, signal, computed } from '@angular/core';
import { FilterConfig } from '../models/filter-config.model';

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
        liveMode: true,
        severityLevels: {
            critical: true,
            warning: true,
            info: true
        },
        selectedRules: [],
        incidentSearchTerm: ''
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
        console.log('[Store] Updating filters with:', filters);
        this.filterState.update(current => ({ ...current, ...filters }));
    }

    /**
     * Reset filters to default
     */
    resetFilters(): void {
        this.filterState.set({
            startDate: this.getDefaultStartDate(),
            endDate: this.getDefaultEndDate(),
            liveMode: true,
            severityLevels: {
                critical: true,
                warning: true,
                info: true,
            },
            selectedRules: [],
            incidentSearchTerm: ''
        });
    }

    private getDefaultStartDate(): Date {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date;
    }

    private getDefaultEndDate(): Date {
        return new Date();
    }
}
