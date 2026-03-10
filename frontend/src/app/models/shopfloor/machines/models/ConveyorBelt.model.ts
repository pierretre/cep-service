import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toBoolean, toDirection, toNumber, toggleActive } from './machine-rendering.utils';

export class ConveyorBeltModel implements IMachine {
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
        const direction = toDirection(this.telemetryState['direction']);
        const isExecuting = toBoolean(this.telemetryState['isExecuting']);
        const sensorFeed = toBoolean(this.telemetryState['sensorFeed']);
        const sensorSwap = toBoolean(this.telemetryState['sensorSwap']);
        const sensorImpulse = toBoolean(this.telemetryState['sensorImpulse']);
        const productPosition = toNumber(this.telemetryState['productPosition']);
        const hasProduct = toBoolean(this.telemetryState['hasProduct']);

        const belt = machineEl.querySelector<SVGRectElement>(`#beltSurface${this.id}`);
        if (belt) {
            belt.classList.toggle('forward', direction === 'forward');
            belt.classList.toggle('backward', direction === 'backward' || direction === 'reverse');
        }

        toggleActive(machineEl, `#sensorFeed${this.id}`, sensorFeed);
        toggleActive(machineEl, `#sensorSwap${this.id}`, sensorSwap);
        toggleActive(machineEl, `#sensorImpulse${this.id}`, sensorImpulse);

        const product = machineEl.querySelector<SVGRectElement>(`#conveyorProduct${this.id}`);
        if (product) {
            if (hasProduct !== null) {
                product.style.opacity = hasProduct ? '1' : '0.2';
            }

            if (productPosition !== null) {
                const minX = 35;
                const maxX = 220;
                const clamped = Math.max(0, Math.min(1, productPosition));
                const x = minX + (maxX - minX) * clamped;
                product.setAttribute('x', `${x}`);
            }
        }

        const indicator = machineEl.querySelector<SVGCircleElement>(`#executionIndicator${this.id}`);
        if (indicator && isExecuting !== null) {
            indicator.setAttribute('fill', isExecuting ? '#22c55e' : 'red');
        }
    }
}
