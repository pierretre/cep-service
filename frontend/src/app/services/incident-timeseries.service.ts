import { Injectable, NgZone, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Incident, fromIncident } from '../models';

/**
 * Service for streaming raw incidents via SSE and aggregating them into time-series data
 * Unlike SSETimeSeriesService which returns aggregated data, this returns raw incidents
 * for client-side filtering and aggregation
 */
@Injectable({
    providedIn: 'root'
})
export class IncidentTimeSeriesService {
    private eventSource: EventSource | null = null;

    // Signal to hold all incidents received during the current session
    incidents = signal<Incident[]>([]);

    constructor(private ngZone: NgZone) { }

    /**
     * Connect to SSE stream for raw incidents within a time range
     * Data will be filtered on the frontend for flexibility
     */
    connectToIncidentsStream(startTime: number, endTime: number): void {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const params = new URLSearchParams({
            start: startTime.toString(),
            end: endTime.toString()
        });

        const url = `${environment.apiUrl}/incidents/stream-time-range?${params.toString()}`;
        console.log('[Service] Connecting to incidents time-range stream:', url);

        this.eventSource = new EventSource(url);

        // Handle initial batch of incidents
        this.eventSource.addEventListener('data', (event: MessageEvent) => {
            this.ngZone.run(() => {
                try {
                    const data = JSON.parse(event.data) as any[];
                    const incidents = data.map(fromIncident);
                    this.incidents.set(incidents);
                    console.log('[Service] Received initial batch of', incidents.length, 'incidents');
                } catch (error) {
                    console.error('[Service] Error parsing incidents data:', error);
                }
            });
        });

        // Handle live updates (new incidents)
        this.eventSource.addEventListener('update', (event: MessageEvent) => {
            this.ngZone.run(() => {
                try {
                    const data = JSON.parse(event.data) as any;
                    const incident = fromIncident(data);
                    const currentIncidents = this.incidents();

                    // Check if incident already exists
                    const existingIndex = currentIncidents.findIndex(i => i.id === incident.id);
                    if (existingIndex >= 0) {
                        // Update existing
                        currentIncidents[existingIndex] = incident;
                    } else {
                        // Add new
                        currentIncidents.push(incident);
                    }

                    // Trigger signal update
                    this.incidents.set([...currentIncidents]);
                    console.log('[Service] Incident update received, total:', currentIncidents.length);
                } catch (error) {
                    console.error('[Service] Error parsing incident update:', error);
                }
            });
        });

        this.eventSource.onerror = (error) => {
            console.error('[Service] SSE connection error:', error);
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }

            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                console.log('[Service] Attempting to reconnect to incidents stream...');
                this.connectToIncidentsStream(startTime, endTime);
            }, 5000);
        };

        this.eventSource.onopen = () => {
            console.log('[Service] Incidents SSE connection established');
        };
    }

    /**
     * Disconnect from the stream
     */
    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('[Service] Incidents SSE connection closed');
        }
    }

    /**
     * Clear all incidents
     */
    clear(): void {
        this.incidents.set([]);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }
}
