import { Injectable } from '@angular/core';
import { signal, Signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { FilterConfig } from '../stores/filter-history.service';

export interface TimePoint {
    timestamp: number;
    value: number;
}

export interface SSETimeSeriesEvent {
    type: 'data' | 'update' | 'complete' | 'error';
    points?: TimePoint[];
    point?: TimePoint;
    message?: string;
}

@Injectable({ providedIn: 'root' })
export class SSETimeSeriesService {
    private eventSources = new Map<string, EventSource>();
    private dataCache = new Map<string, Signal<TimePoint[]>>();

    constructor() { }

    /**
     * Subscribe to real-time time series data via SSE
     * Returns a signal that updates as new data arrives
     */
    subscribeToTimeSeries(
        start: number,
        end: number,
        resolution: string,
        filters?: FilterConfig
    ): Signal<TimePoint[]> {
        const key = this.createCacheKey(start, end, resolution, filters);

        // Return cached signal if already subscribed
        if (this.dataCache.has(key)) {
            return this.dataCache.get(key)!;
        }

        const data = signal<TimePoint[]>([]);
        this.dataCache.set(key, data);

        // Close any existing connection for this key
        if (this.eventSources.has(key)) {
            this.eventSources.get(key)?.close();
        }

        // Build query parameters
        const params = new URLSearchParams({
            start: start.toString(),
            end: end.toString(),
            resolution: resolution
        });

        // Add filter parameters
        if (filters) {
            const severities: string[] = [];
            if (filters.severityLevels.critical) severities.push('critical');
            if (filters.severityLevels.high) severities.push('high');
            if (filters.severityLevels.medium) severities.push('medium');
            if (filters.severityLevels.low) severities.push('low');

            if (severities.length > 0 && severities.length < 4) {
                params.set('severities', severities.join(','));
            }
        }

        const url = `${environment.apiUrl}/timeseries/stream?${params.toString()}`;

        const eventSource = new EventSource(url);

        // Handle initial data load
        eventSource.addEventListener('data', (event: Event) => {
            const messageEvent = event as MessageEvent;
            try {
                const points = JSON.parse(messageEvent.data) as TimePoint[];
                data.set(points);
                console.log('SSE: Received initial data with', points.length, 'points');
            } catch (err) {
                console.error('Error parsing SSE data:', err);
            }
        });

        // Handle live updates (full dataset updates)
        eventSource.addEventListener('update', (event: Event) => {
            const messageEvent = event as MessageEvent;
            try {
                const points = JSON.parse(messageEvent.data) as TimePoint[];
                data.set(points);
                console.log('SSE: Received update with', points.length, 'total points');
            } catch (err) {
                console.error('Error parsing SSE update:', err);
            }
        });

        // Handle stream completion
        eventSource.addEventListener('complete', () => {
            console.log('Time series stream completed');
            eventSource.close();
            this.eventSources.delete(key);
        });

        // Handle errors
        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            if (eventSource.readyState === EventSource.CLOSED) {
                eventSource.close();
                this.eventSources.delete(key);
            }
        };

        this.eventSources.set(key, eventSource);

        return data;
    }

    /**
     * Unsubscribe from a time series stream
     */
    unsubscribe(start: number, end: number, resolution: string, filters?: FilterConfig): void {
        const key = this.createCacheKey(start, end, resolution, filters);

        if (this.eventSources.has(key)) {
            this.eventSources.get(key)?.close();
            this.eventSources.delete(key);
        }

        this.dataCache.delete(key);
    }

    /**
     * Unsubscribe from all streams
     */
    unsubscribeAll(): void {
        this.eventSources.forEach(source => source.close());
        this.eventSources.clear();
        this.dataCache.clear();
    }

    /**
     * Check if currently subscribed to a stream
     */
    isSubscribed(start: number, end: number, resolution: string, filters?: FilterConfig): boolean {
        const key = this.createCacheKey(start, end, resolution, filters);
        return this.eventSources.has(key);
    }

    /**
     * Get cached data without subscribing
     */
    getCachedData(start: number, end: number, resolution: string, filters?: FilterConfig): TimePoint[] | null {
        const key = this.createCacheKey(start, end, resolution, filters);
        const signal = this.dataCache.get(key);
        return signal ? signal() : null;
    }

    private createCacheKey(start: number, end: number, resolution: string, filters?: FilterConfig): string {
        const severitiesKey = filters
            ? Object.entries(filters.severityLevels)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(',')
            : 'all';

        return `${start}-${end}-${resolution}-${severitiesKey}`;
    }
}
