import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toBoolean } from './machine-rendering.utils';

export class HighBayWarehouseModel implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    private readonly telemetryState: Record<string, unknown> = {};

    constructor(id: string, position: { x: number; y: number }, rotation: number) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
    }

    update(data: MachineTelemetryData): void {
        this.telemetryState[data.attribute] = data.value;
    }

    getTelemetryState(): Record<string, unknown> {
        return this.telemetryState;
    }

    render(machineEl: SVGGElement): void {
        const isOperational = toBoolean(this.telemetryState['isOperational']);
        const storageA = toBoolean(this.telemetryState['storageA']);
        const storageB = toBoolean(this.telemetryState['storageB']);
        const storageC = toBoolean(this.telemetryState['storageC']);
        const barrierIn = toBoolean(this.telemetryState['inputBarrier']);
        const barrierOut = toBoolean(this.telemetryState['outputBarrier']);

        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase && isOperational !== null) {
            woodBase.setAttribute('fill', isOperational ? 'burlywood' : 'red');
        }

        const storageRects = machineEl.querySelectorAll<SVGRectElement>('#storageHBWSystemModel rect');
        const states = [storageA, storageB, storageC];
        storageRects.forEach((rect, index) => {
            const state = states[index] ?? null;
            if (state !== null) {
                rect.classList.toggle('active', state);
            }
        });

        const lightBarriers = machineEl.querySelectorAll<SVGRectElement>('g > rect.lightBarrier');
        if (lightBarriers.length >= 2) {
            if (barrierIn !== null) {
                lightBarriers[0].classList.toggle('active', barrierIn);
            }
            if (barrierOut !== null) {
                lightBarriers[1].classList.toggle('active', barrierOut);
            }
        }
    }

}
