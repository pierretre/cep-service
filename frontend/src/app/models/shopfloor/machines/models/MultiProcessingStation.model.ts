import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';

export class MultiProcessingStationModel implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    isOperational: boolean = false;
    sawEnabled: boolean = false;
    sawRotation: number = 0;
    sliderExtended: boolean = false;

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
        if (typeof state['sawEnabled'] === 'boolean') {
            this.sawEnabled = state['sawEnabled'];
        }
        if (typeof state['sawRotation'] === 'number') {
            this.sawRotation = state['sawRotation'];
        }
        if (typeof state['sliderExtended'] === 'boolean') {
            this.sliderExtended = state['sliderExtended'];
        }
    }

    getTelemetryState(): Record<string, unknown> {
        return {
            ...this.telemetryState,
            isOperational: this.isOperational,
            sawEnabled: this.sawEnabled,
            sawRotation: this.sawRotation,
            sliderExtended: this.sliderExtended
        };
    }

    render(machineEl: SVGGElement): void {
        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase) {
            woodBase.setAttribute('fill', this.isOperational ? 'burlywood' : 'red');
        }

        const slider = machineEl.querySelector<SVGRectElement>('#sliderMPSystemModel rect');
        if (slider) {
            slider.classList.toggle('active', this.sliderExtended);
        }

        const saw = machineEl.querySelector<SVGPolygonElement>('#sawMPSystemModel polygon');
        if (saw) {
            saw.classList.toggle('active', this.sawEnabled);
            saw.setAttribute('transform', `rotate(${this.sawRotation} 156 180)`);
        }
    }

}
