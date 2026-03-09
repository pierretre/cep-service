import { Injectable, signal } from '@angular/core';

import { ReplanningIncident, createReplanningIncident } from '../models/replanning-incident.model';
import { IncidentSeverity } from '../models';

@Injectable({
    providedIn: 'root'
})
export class ReplanningIncidentStore {
    private readonly historyState = signal<ReplanningIncident[]>(this.buildMockHistory());
    private readonly currentIncidentState = signal<ReplanningIncident | null>(null);

    readonly history = this.historyState.asReadonly();
    readonly currentIncident = this.currentIncidentState.asReadonly();

    constructor() {
        // Simulate a live incident arriving a few seconds after the page opens.
        setTimeout(() => {
            this.currentIncidentState.set(this.buildMockLiveIncident());
        }, 3500);
    }

    resolveCurrentIncident(comment: string): void {
        const currentIncident = this.currentIncidentState();
        if (!currentIncident) {
            return;
        }

        const resolvedIncident: ReplanningIncident = {
            ...currentIncident,
            status: 'Resolved',
            operatorComment: comment,
            resolvedAt: new Date(),
            updatedAt: new Date()
        };

        this.historyState.update((history) => [resolvedIncident, ...history]);
        this.currentIncidentState.set(null);
    }

    triggerLiveIncident(): void {
        if (this.currentIncidentState()) {
            return;
        }
        this.currentIncidentState.set(this.buildMockLiveIncident());
    }

    private buildMockHistory(): ReplanningIncident[] {
        const now = Date.now();

        return [
            createReplanningIncident({
                id: 7801,
                message: 'Conveyor belt has stopped',
                severity: IncidentSeverity.Warning,
                machineId: 'CV01',
                requiredAction: 'Hit the big red reset button and clear the jam',
                status: 'Resolved',
                startTime: new Date(now - 1000 * 60 * 48),
                createdAt: new Date(now - 1000 * 60 * 48),
                resolvedAt: new Date(now - 1000 * 60 * 41),
                operatorComment: 'Aligned gate and validated throughput with QA.'
            }),
            createReplanningIncident({
                id: 7798,
                message: 'Conveyor belt has stopped',
                severity: IncidentSeverity.Warning,
                machineId: 'CV01',
                requiredAction: 'Hit the big red reset button and clear the jam',
                status: 'Resolved',
                startTime: new Date(now - 1000 * 60 * 105),
                createdAt: new Date(now - 1000 * 60 * 105),
                resolvedAt: new Date(now - 1000 * 60 * 95),
                operatorComment: 'PID profile B2 applied. Temperature stabilized.'
            })
        ];
    }

    private buildMockLiveIncident(): ReplanningIncident {
        const now = new Date();

        return createReplanningIncident({
            id: 7805,
            message: 'Conveyor belt has stopped',
            severity: IncidentSeverity.Warning,
            machineId: 'CV01',
            requiredAction: 'Hit the big red reset button and clear the jam',
            status: 'Open',
            startTime: now,
            createdAt: now
        });
    }
}
