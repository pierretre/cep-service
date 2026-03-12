import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toTelemetryText, toggleActive } from './machine-rendering.utils';

export class SortingLineModel implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    sortingLineSensInputLightBarrier: boolean = false;
    sortingLineSensMiddleLightBarrier: boolean = false;
    sortingLineSensWhiteLightBarrier: boolean = false;
    sortingLineSensBlueLightBarrier: boolean = false;
    sortingLineSensRedLightBarrier: boolean = false;
    sortingLineSensImpulseCounterRaw: number = 0;

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

        if (typeof state['sortingLineSensInputLightBarrier'] === 'boolean') {
            this.sortingLineSensInputLightBarrier = state['sortingLineSensInputLightBarrier'];
        }
        if (typeof state['sortingLineSensMiddleLightBarrier'] === 'boolean') {
            this.sortingLineSensMiddleLightBarrier = state['sortingLineSensMiddleLightBarrier'];
        }
        if (typeof state['sortingLineSensWhiteLightBarrier'] === 'boolean') {
            this.sortingLineSensWhiteLightBarrier = state['sortingLineSensWhiteLightBarrier'];
        }
        if (typeof state['sortingLineSensBlueLightBarrier'] === 'boolean') {
            this.sortingLineSensBlueLightBarrier = state['sortingLineSensBlueLightBarrier'];
        }
        if (typeof state['sortingLineSensRedLightBarrier'] === 'boolean') {
            this.sortingLineSensRedLightBarrier = state['sortingLineSensRedLightBarrier'];
        }
        if (typeof state['sortingLineSensImpulseCounterRaw'] === 'number') {
            this.sortingLineSensImpulseCounterRaw = state['sortingLineSensImpulseCounterRaw'];
        }
    }

    getTelemetryState(): Record<string, unknown> {
        return {
            ...this.telemetryState,
            sortingLineSensInputLightBarrier: this.sortingLineSensInputLightBarrier,
            sortingLineSensMiddleLightBarrier: this.sortingLineSensMiddleLightBarrier,
            sortingLineSensWhiteLightBarrier: this.sortingLineSensWhiteLightBarrier,
            sortingLineSensBlueLightBarrier: this.sortingLineSensBlueLightBarrier,
            sortingLineSensRedLightBarrier: this.sortingLineSensRedLightBarrier,
            sortingLineSensImpulseCounterRaw: this.sortingLineSensImpulseCounterRaw
        };
    }

    render(machineEl: SVGGElement): void {
        toggleActive(machineEl, `#sortingLineSensInputLightBarrier${this.id}`, this.sortingLineSensInputLightBarrier);
        toggleActive(machineEl, `#sortingLineSensMiddleLightBarrier${this.id}`, this.sortingLineSensMiddleLightBarrier);
        toggleActive(machineEl, `#sortingLineSensWhiteLightBarrier${this.id}`, this.sortingLineSensWhiteLightBarrier);
        toggleActive(machineEl, `#sortingLineSensBlueLightBarrier${this.id}`, this.sortingLineSensBlueLightBarrier);
        toggleActive(machineEl, `#sortingLineSensRedLightBarrier${this.id}`, this.sortingLineSensRedLightBarrier);

        const impulseCounterText = machineEl.querySelector<SVGTextElement>(`#sortingLineSensImpulseCounterRaw${this.id} tspan`);
        if (impulseCounterText) {
            const textValue = toTelemetryText(this.sortingLineSensImpulseCounterRaw);
            if (textValue !== null) {
                impulseCounterText.textContent = textValue;
            }
        }
    }
}
