import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toggleActive } from './machine-rendering.utils';

export class ConveyorBeltModel implements IMachine {

    id: string;
    position: { x: number; y: number };
    rotation: number;

    direction: string = 'forward';
    isOperational: boolean = false;
    isExecuting: boolean = false;
    sensorFeed: boolean = false;
    sensorSwap: boolean = false;
    sensorImpulse: boolean = false;
    productPosition: number = 0;
    hasProduct: boolean = false;

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

        if (typeof state['direction'] === 'string') {
            this.direction = state['direction'];
        }
        if (typeof state['isOperational'] === 'boolean') {
            this.isOperational = state['isOperational'];
        }
        if (typeof state['isExecuting'] === 'boolean') {
            this.isExecuting = state['isExecuting'];
        }
        if (typeof state['sensorFeed'] === 'boolean') {
            this.sensorFeed = state['sensorFeed'];
        }
        if (typeof state['sensorSwap'] === 'boolean') {
            this.sensorSwap = state['sensorSwap'];
        }
        if (typeof state['sensorImpulse'] === 'boolean') {
            this.sensorImpulse = state['sensorImpulse'];
        }
        if (typeof state['productPosition'] === 'number') {
            this.productPosition = state['productPosition'];
        }
        if (typeof state['hasProduct'] === 'boolean') {
            this.hasProduct = state['hasProduct'];
        }
    }

    getTelemetryState(): Record<string, unknown> {
        return {
            ...this.telemetryState,
            direction: this.direction,
            isOperational: this.isOperational,
            isExecuting: this.isExecuting,
            sensorFeed: this.sensorFeed,
            sensorSwap: this.sensorSwap,
            sensorImpulse: this.sensorImpulse,
            productPosition: this.productPosition,
            hasProduct: this.hasProduct
        };
    }

    render(machineEl: SVGGElement): void {
        const isOperationalForBelt = this.effectiveOperational();

        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase) {
            woodBase.setAttribute('fill', this.isOperational ? 'burlywood' : 'red');
        }

        this.renderBelt(machineEl, isOperationalForBelt);

        toggleActive(machineEl, `#sensorFeed${this.id}`, this.sensorFeed);
        toggleActive(machineEl, `#sensorSwap${this.id}`, this.sensorSwap);
        toggleActive(machineEl, `#sensorImpulse${this.id}`, this.sensorImpulse);

        const product = machineEl.querySelector<SVGRectElement>(`#conveyorProduct${this.id}`);
        if (product) {
            product.style.opacity = this.hasProduct ? '1' : '0.2';

            const minX = 35;
            const maxX = 220;
            const clamped = Math.max(0, Math.min(1, this.productPosition));
            const x = minX + (maxX - minX) * clamped;
            product.setAttribute('x', `${x}`);
        }

        this.renderExecutionIndicator(machineEl, isOperationalForBelt);
    }

    private renderBelt(machineEl: SVGGElement, isOperational: boolean): void {
        const belt = machineEl.querySelector<SVGRectElement>(`#beltSurface${this.id}`);
        if (!belt) {
            return;
        }

        belt.classList.toggle('movingPartNotOperational', !isOperational);
        belt.classList.toggle('forward', isOperational && this.direction === 'forward');
        belt.classList.toggle('backward', isOperational && (this.direction === 'backward' || this.direction === 'reverse'));
    }

    private renderExecutionIndicator(machineEl: SVGGElement, isOperational: boolean): void {
        const indicator = machineEl.querySelector<SVGCircleElement>(`#executionIndicator${this.id}`);
        if (!indicator) {
            return;
        }

        indicator.setAttribute('fill', this.executionIndicatorColor(isOperational));
    }

    private executionIndicatorColor(isOperational: boolean): string {
        if (!isOperational) {
            return '#dc2626';
        }
        return this.isExecuting ? '#22c55e' : 'red';
    }

    private effectiveOperational(): boolean {
        return true;
    }
}
