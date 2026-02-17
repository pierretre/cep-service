import { Injectable, signal, computed } from '@angular/core';

export interface FilterConfig {
    startDate: string;
    endDate: string;
    severityLevels: {
        critical: boolean;
        high: boolean;
        medium: boolean;
        low: boolean;
    };
}

@Injectable({
    providedIn: 'root'
})
export class FilterHistoryStore {
    // Signals
    private history = signal<FilterConfig[]>([]);
    private currentIndex = signal<number>(-1);
    private readonly maxHistorySize = 50;

    // Computed signals
    canGoBack = computed(() => this.currentIndex() > 0);
    canGoForward = computed(() => this.currentIndex() < this.history().length - 1);
    currentState = computed<FilterConfig | null>(() => {
        const index = this.currentIndex();
        const historyArray = this.history();
        if (index >= 0 && index < historyArray.length) {
            return JSON.parse(JSON.stringify(historyArray[index]));
        }
        return null;
    });
    historySize = computed(() => this.history().length);

    constructor() { }

    /**
     * Save a new filter state to history
     */
    saveState(filters: FilterConfig): void {
        // Deep clone the filters to avoid reference issues
        const clonedFilters = JSON.parse(JSON.stringify(filters));

        // Remove any states after current index (for when user goes back then makes a new change)
        const newHistory = this.history().slice(0, this.currentIndex() + 1);

        // Add new state
        newHistory.push(clonedFilters);

        // Maintain max history size
        if (newHistory.length > this.maxHistorySize) {
            newHistory.shift();
            this.history.set(newHistory);
        } else {
            this.history.set(newHistory);
            this.currentIndex.update(idx => idx + 1);
        }
    }

    /**
     * Go back to previous filter state
     */
    goBack(): FilterConfig | null {
        if (this.canGoBack()) {
            this.currentIndex.update(idx => idx - 1);
            const index = this.currentIndex();
            const historyArray = this.history();
            return JSON.parse(JSON.stringify(historyArray[index]));
        }
        return null;
    }

    /**
     * Go forward to next filter state
     */
    goForward(): FilterConfig | null {
        if (this.canGoForward()) {
            this.currentIndex.update(idx => idx + 1);
            const index = this.currentIndex();
            const historyArray = this.history();
            return JSON.parse(JSON.stringify(historyArray[index]));
        }
        return null;
    }

    /**
     * Get current filter state
     */
    getCurrentState(): FilterConfig | null {
        return this.currentState();
    }

    /**
     * Clear all history
     */
    clearHistory(): void {
        this.history.set([]);
        this.currentIndex.set(-1);
    }

    /**
     * Get history size
     */
    getHistorySize(): number {
        return this.historySize();
    }
}

