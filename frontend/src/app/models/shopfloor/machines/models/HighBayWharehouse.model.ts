import { MachineTelemetryData } from '../interfaces/IMachine';
import { GenericMachine } from './GenericMachine.model';

export class HighBayWarehouseModel extends GenericMachine {

    storageA: boolean = false;
    storageB: boolean = false;
    storageC: boolean = false;
    inputBarrier: boolean = false;
    outputBarrier: boolean = false;

    override update(data: MachineTelemetryData): void {
        super.update(data);
        const state = data.value as Record<string, unknown>;

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

    override render(machineEl: SVGGElement): void {
        super.render(machineEl);
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
