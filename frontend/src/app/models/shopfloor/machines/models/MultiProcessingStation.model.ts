import { MachineTelemetryData } from '../interfaces/IMachine';
import { GenericMachine } from './GenericMachine.model';

export class MultiProcessingStationModel extends GenericMachine {

    sawEnabled: boolean = false;
    sawRotation: number = 0;
    sliderExtended: boolean = false;

    override update(data: MachineTelemetryData): void {
        super.update(data);
        const state = data.value as Record<string, unknown>;

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

    override render(machineEl: SVGGElement): void {
        super.render(machineEl);

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
