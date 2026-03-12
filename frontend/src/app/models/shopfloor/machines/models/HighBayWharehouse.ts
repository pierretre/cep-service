import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';

export class HighBayWarehouseModel implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    isOperational: boolean = false;
    storageA: boolean = false;
    storageB: boolean = false;
    storageC: boolean = false;
    inputBarrier: boolean = false;
    outputBarrier: boolean = false;

    private readonly telemetryState: Record<string, unknown> = {};

    constructor(id: string, position: { x: number; y: number }, rotation: number) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
    }

    update(data: MachineTelemetryData): void {
        if (data.attribute !== 'state' || typeof data.value !== 'object' || data.value === null) {
            return;
        }

        const state = data.value as Record<string, unknown>;
        this.telemetryState['state'] = state;

        if (typeof state['isOperational'] === 'boolean') {
            this.isOperational = state['isOperational'];
        }
        if (typeof state['storageA'] === 'boolean') {
            this.storageA = state['storageA'];
        }
        if (typeof state['storageB'] === 'boolean') {
            this.storageB = state['storageB'];
        }
        if (typeof state['storageC'] === 'boolean') {
            this.storageC = state['storageC'];
        }
        if (typeof state['inputBarrier'] === 'boolean') {
            this.inputBarrier = state['inputBarrier'];
        }
        if (typeof state['outputBarrier'] === 'boolean') {
            this.outputBarrier = state['outputBarrier'];
        }
    }

    getTelemetryState(): Record<string, unknown> {
        return {
            ...this.telemetryState,
            isOperational: this.isOperational,
            storageA: this.storageA,
            storageB: this.storageB,
            storageC: this.storageC,
            inputBarrier: this.inputBarrier,
            outputBarrier: this.outputBarrier
        };
    }

    render(machineEl: SVGGElement): void {
        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase) {
            woodBase.setAttribute('fill', this.isOperational ? 'burlywood' : 'red');
        }

        const storageRects = machineEl.querySelectorAll<SVGRectElement>('#storageHBWSystemModel rect');
        const states = [this.storageA, this.storageB, this.storageC];
        storageRects.forEach((rect, index) => {
            rect.classList.toggle('active', states[index] ?? false);
        });

        const lightBarriers = machineEl.querySelectorAll<SVGRectElement>('g > rect.lightBarrier');
        if (lightBarriers.length >= 2) {
            lightBarriers[0].classList.toggle('active', this.inputBarrier);
            lightBarriers[1].classList.toggle('active', this.outputBarrier);
        }
    }

}
