import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toBoolean, toNumber } from './machine-rendering.utils';

export class MultiProcessingStationModel implements IMachine {
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
        const sawEnabled = toBoolean(this.telemetryState['sawEnabled']);
        const sawRotation = toNumber(this.telemetryState['sawRotation']);
        const sliderExtended = toBoolean(this.telemetryState['sliderExtended']);

        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase && isOperational !== null) {
            woodBase.setAttribute('fill', isOperational ? 'burlywood' : 'red');
        }

        const slider = machineEl.querySelector<SVGRectElement>('#sliderMPSystemModel rect');
        if (slider && sliderExtended !== null) {
            slider.classList.toggle('active', sliderExtended);
        }

        const saw = machineEl.querySelector<SVGPolygonElement>('#sawMPSystemModel polygon');
        if (saw) {
            if (sawEnabled !== null) {
                saw.classList.toggle('active', sawEnabled);
            }
            if (sawRotation !== null) {
                saw.setAttribute('transform', `rotate(${sawRotation} 156 180)`);
            }
        }
    }

}
