import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Incident, fromIncident } from '../models';

export interface PaginatedResponse {
    incidents: Incident[];
    currentPage: number;
    totalItems: number;
    totalPages: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export interface PaginationParams {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    startTime?: number;
    endTime?: number;
}

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
        return this.http.get<any[]>(`${environment.apiUrl}/incidents`).pipe(
            map(incidents => incidents.map(fromIncident))
        );
    }

    /**
     * Get paginated incidents from the API
     */
    getIncidentsPaginated(params: PaginationParams = {}): Observable<PaginatedResponse> {
        const {
            page = 0,
            size = 20,
            sortBy = 'createdAt',
            sortDir = 'desc',
            startTime,
            endTime
        } = params;

        let httpParams = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sortBy', sortBy)
            .set('sortDir', sortDir);

        if (startTime !== undefined) {
            httpParams = httpParams.set('startTime', startTime.toString());
        }
        if (endTime !== undefined) {
            httpParams = httpParams.set('endTime', endTime.toString());
        }

        return this.http.get<any>(`${environment.apiUrl}/incidents/paginated`, { params: httpParams }).pipe(
            map(response => ({
                incidents: response.incidents.map(fromIncident),
                currentPage: response.currentPage,
                totalItems: response.totalItems,
                totalPages: response.totalPages,
                pageSize: response.pageSize,
                hasNext: response.hasNext,
                hasPrevious: response.hasPrevious
            }))
        );
    }

    /**
     * Get a specific incident by ID
     */
    getIncidentById(id: number): Observable<Incident> {
        return this.http.get<any>(`${environment.apiUrl}/incidents/${id}`).pipe(
            map(fromIncident)
        );
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
