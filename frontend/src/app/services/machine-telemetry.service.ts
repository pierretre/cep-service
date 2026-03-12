import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { fromMachineUpdate, MachineStateUpdate } from '../models/machine-update.model';

@Injectable({
    providedIn: 'root'
})
export class MachineTelemetryService {
    private eventSource: EventSource | null = null;
    private readonly machineUpdateSubject = new Subject<MachineStateUpdate>();

    constructor(private readonly ngZone: NgZone) { }

    connectToMachineStream(): Observable<MachineStateUpdate> {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const url = `${environment.apiUrl}/machines/stream`;
        console.log('[MachineTelemetryService] Connecting to SSE endpoint:', url);

        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('machine-update', (event: MessageEvent) => {
            this.ngZone.run(() => {
                try {
                    const parsed = JSON.parse(event.data);
                    const machineUpdate = fromMachineUpdate(parsed);
                    this.machineUpdateSubject.next(machineUpdate);
                } catch (error) {
                    console.error('[MachineTelemetryService] Error parsing machine update:', error);
                }
            });
        });

        this.eventSource.addEventListener('connected', (event: MessageEvent) => {
            console.log('[MachineTelemetryService] SSE connected:', event.data);
        });

        this.eventSource.onerror = (error) => {
            console.error('[MachineTelemetryService] SSE connection error:', error);

            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }

            setTimeout(() => {
                this.connectToMachineStream();
            }, 5000);
        };

        return this.machineUpdateSubject.asObservable();
    }

    disconnectFromMachineStream(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('[MachineTelemetryService] SSE connection closed');
        }
    }
}
