import { MachineStateUpdate } from '../../../machine-update.model';

export interface MachineTelemetryData {
    attribute: string;
    value: unknown;
    timestamp: string;
    rawUpdate?: MachineStateUpdate;
}

export interface IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    update(data: MachineTelemetryData): void;
    getTelemetryState(): Record<string, unknown>;
    render(machineEl: SVGGElement): void;
}