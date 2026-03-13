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
    isOperational: boolean;
    lastUpdateTimestamp: Date | null;

    update(data: MachineTelemetryData): void;
    render(machineEl: SVGGElement): void;
}