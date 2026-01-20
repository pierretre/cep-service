import { fromRule, Rule } from "./rule.model";

export interface Incident {
  id: number;
  message: string;
  rule: Rule;
  severity: IncidentSeverity;
  startTime: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export function fromIncident(incident: any): Incident {
  return {
    id: incident.id,
    message: incident.message,
    rule: fromRule(incident.rule),
    severity: incident.severity,
    startTime: new Date(incident.startTime),
    createdAt: new Date(incident.createdAt),
    updatedAt: incident.updatedAt ? new Date(incident.updatedAt) : undefined,
  };
}

export enum IncidentSeverity {
  Critical = 'Critical',
  Warning = 'Warning',
  Info = 'Info'
}
