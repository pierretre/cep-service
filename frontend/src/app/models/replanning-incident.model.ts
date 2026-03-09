import { from } from 'rxjs';
import { Incident, IncidentSeverity } from './incident.model';
import { fromRule } from './rule.model';

export type ReplanningIncidentStatus = 'Open' | 'Resolved';

export interface ReplanningIncident extends Incident {
    machineId: string;
    requiredAction: string;
    status: ReplanningIncidentStatus;
    operatorComment?: string;
    resolvedAt?: Date;
}

export function createReplanningIncident(params: {
    id: number;
    message: string;
    severity: IncidentSeverity;
    machineId: string;
    requiredAction: string;
    status: ReplanningIncidentStatus;
    startTime: Date;
    createdAt: Date;
    resolvedAt?: Date;
    operatorComment?: string;
}): ReplanningIncident {
    return {
        id: params.id,
        message: params.message,
        severity: params.severity,
        rule: fromRule({
            id: params.id,
            name: `Replanning Alert ${params.id}`,
            eplQuery: 'MOCK_REPLANNING_RULE',
            active: true,
            description: 'Mock rule for replanning incident UI'
        }),
        startTime: params.startTime,
        createdAt: params.createdAt,
        machineId: params.machineId,
        requiredAction: params.requiredAction,
        status: params.status,
        resolvedAt: params.resolvedAt,
        operatorComment: params.operatorComment
    };
}
