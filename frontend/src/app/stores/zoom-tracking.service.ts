import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ZoomService {
    private currentZoomState = new BehaviorSubject<ZoomState | null>(null);
    private resolutionChanges = new BehaviorSubject<ResolutionChange | null>(null);
    private zoomHistory: ZoomState[] = [];
    private maxHistorySize = 100;

    currentZoomState$: Observable<ZoomState | null> = this.currentZoomState.asObservable();
    resolutionChanges$: Observable<ResolutionChange | null> = this.resolutionChanges.asObservable();

    constructor() { }

    /**
     * Update the current zoom state
     */
    updateZoomState(start: number, end: number, resolution: string) {
        const rangeInDays = (end - start) / (24 * 60 * 60 * 1000);
        const previousState = this.currentZoomState.value;

        const newState: ZoomState = {
            startTime: start,
            endTime: end,
            resolution,
            rangeInDays,
            timestamp: new Date()
        };

        // Check if resolution changed
        if (previousState && previousState.resolution !== resolution) {
            this.resolutionChanges.next({
                from: previousState.resolution,
                to: resolution,
                timestamp: new Date()
            });
        }

        // Update current state
        this.currentZoomState.next(newState);

        // Add to history
        this.addToHistory(newState);
    }

    /**
     * Get the current zoom state
     */
    getCurrentState(): ZoomState | null {
        return this.currentZoomState.value;
    }

    /**
     * Get zoom history
     */
    getHistory(): ZoomState[] {
        return [...this.zoomHistory];
    }

    /**
     * Clear zoom history
     */
    clearHistory() {
        this.zoomHistory = [];
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
     * Add state to history
     */
    private addToHistory(state: ZoomState) {
        this.zoomHistory.push(state);

        if (this.zoomHistory.length > this.maxHistorySize) {
            this.zoomHistory.shift();
        }
    }
}
