import { Injectable, signal, computed } from '@angular/core';

export interface ZoomState {
    startTime: number;
    endTime: number;
    resolution: string;
    rangeInDays: number;
    timestamp: Date;
}

export interface ResolutionChange {
    from: string;
    to: string;
    reason: 'zoom' | 'filter' | 'initial';
    timestamp: Date;
}

/**
 * Centralized zoom state store using signals
 */
@Injectable({
    providedIn: 'root'
})
export class ZoomStore {
    private currentZoomState = signal<ZoomState | null>(null);
    private lastResolutionChange = signal<ResolutionChange | null>(null);
    private zoomHistory = signal<ZoomState[]>([]);
    private readonly maxHistorySize = 100;

    // Computed signals
    readonly zoomState = this.currentZoomState.asReadonly();
    readonly resolutionChange = this.lastResolutionChange.asReadonly();
    readonly history = this.zoomHistory.asReadonly();
    readonly currentResolution = computed(() => this.currentZoomState()?.resolution || '');
    readonly currentRange = computed(() => {
        const state = this.currentZoomState();
        return state ? { start: state.startTime, end: state.endTime } : null;
    });

    constructor() { }

    /**
     * Update zoom state
     */
    updateZoomState(start: number, end: number, resolution: string, reason: 'zoom' | 'filter' | 'initial' = 'zoom'): void {
        const rangeInDays = (end - start) / (24 * 60 * 60 * 1000);
        const previousState = this.currentZoomState();

        const newState: ZoomState = {
            startTime: start,
            endTime: end,
            resolution,
            rangeInDays,
            timestamp: new Date()
        };

        // Check if resolution changed
        if (previousState && previousState.resolution !== resolution) {
            this.lastResolutionChange.set({
                from: previousState.resolution,
                to: resolution,
                reason,
                timestamp: new Date()
            });
        }

        // Update current state
        this.currentZoomState.set(newState);

        // Add to history
        this.zoomHistory.update(history => {
            const newHistory = [...history, newState];
            if (newHistory.length > this.maxHistorySize) {
                newHistory.shift();
            }
            return newHistory;
        });
    }

    /**
     * Get resolution display name
     */
    getResolutionDisplayName(resolution: string): string {
        const map: { [key: string]: string } = {
            '1m': '1 Minute',
            '5m': '5 Minutes',
            '15m': '15 Minutes',
            '1h': '1 Hour',
            '6h': '6 Hours',
            '1d': '1 Day',
            '1w': '1 Week'
        };
        return map[resolution] || resolution;
    }

    /**
     * Get recommended resolution for a time range
     */
    getRecommendedResolution(start: number, end: number): string {
        const range = end - start;
        const hour = 3600_000;
        const day = 24 * hour;

        if (range <= day) return '1m';
        if (range <= 7 * day) return '5m';
        if (range <= 30 * day) return '15m';
        if (range <= 90 * day) return '1h';
        if (range <= 365 * day) return '6h';
        return '1d';
    }

    /**
     * Format time range for display
     */
    formatTimeRange(start: number, end: number): string {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    }

    /**
     * Clear zoom history
     */
    clearHistory(): void {
        this.zoomHistory.set([]);
    }
}
