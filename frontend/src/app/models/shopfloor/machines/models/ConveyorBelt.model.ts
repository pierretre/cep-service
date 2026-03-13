import { MachineTelemetryData } from '../interfaces/IMachine';
import { GenericMachine } from './GenericMachine.model';

export class ConveyorBeltModel extends GenericMachine {

    direction: string = 'forward';
    isExecuting: boolean = false;
    sensorFeed: boolean = false;
    sensorSwap: boolean = false;
    sensorImpulse: boolean = false;

    override update(data: MachineTelemetryData): void {
        super.update(data);
        const state = data.value as Record<string, unknown>;

        if (typeof state['direction'] === 'string') {
            this.direction = state['direction'];
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
    }

    override render(machineEl: SVGGElement): void {
        super.render(machineEl);
        const belt = machineEl.querySelector<SVGRectElement>(`#beltSurface${this.id}`);
        if (!belt) {
            return;
        }

        belt.classList.toggle('movingPartNotOperational', !this.isOperational);
        belt.classList.toggle('forward', this.isOperational && this.direction === 'forward');
        belt.classList.toggle('backward', this.isOperational && (this.direction === 'backward' || this.direction === 'reverse'));
    }
}