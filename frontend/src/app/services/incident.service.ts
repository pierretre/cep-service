import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Incident, fromIncident } from '../models';

@Injectable({
    providedIn: 'root'
})
export class IncidentService {
    private eventSource: EventSource | null = null;
    private incidentSubject = new Subject<Incident>();

    constructor(
        private http: HttpClient,
        private ngZone: NgZone
    ) { }

    /**
     * Get all incidents from the API
     */
    getAllIncidents(): Observable<Incident[]> {
        return this.http.get<Incident[]>(`${environment.apiUrl}/incidents`);
    }

    /**
     * Get a specific incident by ID
     */
    getIncidentById(id: number): Observable<Incident> {
        return this.http.get<Incident>(`${environment.apiUrl}/incidents/${id}`);
    }

    /**
     * Connect to SSE stream for real-time incident updates
     */
    connectToIncidentStream(): Observable<Incident> {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const url = `${environment.apiUrl}/incidents/stream`;
        console.log('Connecting to SSE endpoint:', url);

        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('incident', (event: MessageEvent) => {
            this.ngZone.run(() => {
                try {
                    const data = JSON.parse(event.data);
                    const incident = fromIncident(data);
                    this.incidentSubject.next(incident);
                } catch (error) {
                    console.error('Error parsing incident data:', error);
                }
            });
        });

        this.eventSource.addEventListener('connected', (event: MessageEvent) => {
            console.log('SSE connected:', event.data);
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            console.log('EventSource readyState:', this.eventSource?.readyState);

            // Close the connection
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }

            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                console.log('Attempting to reconnect to SSE...');
                this.connectToIncidentStream();
            }, 5000);
        };

        this.eventSource.onopen = () => {
            console.log('SSE connection established, readyState:', this.eventSource?.readyState);
        };

        return this.incidentSubject.asObservable();
    }

    /**
     * Disconnect from SSE stream
     */
    disconnectFromIncidentStream(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('SSE connection closed');
        }
    }

    /**
     * Check if connected to SSE stream
     */
    isConnected(): boolean {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }
}
