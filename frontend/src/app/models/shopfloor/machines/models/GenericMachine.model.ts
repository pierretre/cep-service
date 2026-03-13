import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';

export class GenericMachine implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;
    isOperational: boolean = true;
    isInitialized: boolean = false;
    lastUpdateTimestamp: Date | null = null;

    constructor(id: string, position: { x: number; y: number }, rotation: number) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.isInitialized = true;
    }

    update(data: MachineTelemetryData): void {
        if (data.attribute !== 'state' || typeof data.value !== 'object' || data.value === null) {
            return;
        }

        const state = data.value as Record<string, unknown>;
        this.lastUpdateTimestamp = new Date(data.timestamp);

        if (typeof state['isOperational'] === 'boolean') {
            this.isOperational = state['isOperational'];
        }
        if (typeof state['isInitialized'] === 'boolean') {
            this.isInitialized = state['isInitialized'];
        }

    }

    render(machineEl: SVGGElement): void {
        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id} rect`);
        if (woodBase) {
            if (!this.isOperational) {
                woodBase.setAttribute('fill', 'red');
            } else if (!this.isInitialized) {
                woodBase.setAttribute('fill', '#fef3c7');
            } else {
                woodBase.setAttribute('fill', 'burlywood');
            }
        }

        this.renderMachinePopup(machineEl);
    }

    private renderMachinePopup(machineEl: SVGGElement): void {
        const popup = machineEl.ownerSVGElement?.querySelector<SVGGElement>(`#popup${this.id}`) ?? null;
        if (popup) {
            popup.classList.toggle("machinePopupVisible", !this.isOperational);
            this.lastUpdateTimestamp = this.lastUpdateTimestamp ?? new Date();
            const timeText = popup.querySelector<SVGTextElement>('.machinePopupTime');
            if (timeText) {
                timeText.textContent = this.lastUpdateTimestamp
                    ? `Stopped at: ${this.lastUpdateTimestamp.toLocaleString()}`
                    : 'Stopped at: -';
            }
        }

        machineEl.classList.toggle("machineNotOperational", !this.isOperational);
        machineEl.classList.toggle("machineNotInitialized", this.isOperational && !this.isInitialized);
    }
}
