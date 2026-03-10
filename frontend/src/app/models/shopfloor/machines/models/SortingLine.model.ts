import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toBoolean, toTelemetryText, toggleActive } from './machine-rendering.utils';

export class SortingLineModel implements IMachine {
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
        const inputSensor = toBoolean(this.telemetryState['sortingLineSensInputLightBarrier']);
        const middleSensor = toBoolean(this.telemetryState['sortingLineSensMiddleLightBarrier']);
        const whiteSensor = toBoolean(this.telemetryState['sortingLineSensWhiteLightBarrier']);
        const blueSensor = toBoolean(this.telemetryState['sortingLineSensBlueLightBarrier']);
        const redSensor = toBoolean(this.telemetryState['sortingLineSensRedLightBarrier']);
        const impulseCounter = this.telemetryState['sortingLineSensImpulseCounterRaw'];

        toggleActive(machineEl, `#sortingLineSensInputLightBarrier${this.id}`, inputSensor);
        toggleActive(machineEl, `#sortingLineSensMiddleLightBarrier${this.id}`, middleSensor);
        toggleActive(machineEl, `#sortingLineSensWhiteLightBarrier${this.id}`, whiteSensor);
        toggleActive(machineEl, `#sortingLineSensBlueLightBarrier${this.id}`, blueSensor);
        toggleActive(machineEl, `#sortingLineSensRedLightBarrier${this.id}`, redSensor);

        const impulseCounterText = machineEl.querySelector<SVGTextElement>(`#sortingLineSensImpulseCounterRaw${this.id} tspan`);
        if (impulseCounterText) {
            const textValue = toTelemetryText(impulseCounter);
            if (textValue !== null) {
                impulseCounterText.textContent = textValue;
            }
        }
    }
}
