import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { GenericMachine } from './GenericMachine.model';

export class SortingLineModel extends GenericMachine {

    sortingLineSensInputLightBarrier: boolean = false;
    sortingLineSensMiddleLightBarrier: boolean = false;
    sortingLineSensWhiteLightBarrier: boolean = false;
    sortingLineSensBlueLightBarrier: boolean = false;
    sortingLineSensRedLightBarrier: boolean = false;
    sortingLineSensImpulseCounterRaw: number = 0;

    override update(data: MachineTelemetryData): void {
        super.update(data);

        const state = data.value as Record<string, unknown>;

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

    override render(machineEl: SVGGElement): void {
        super.render(machineEl);
    }
}
