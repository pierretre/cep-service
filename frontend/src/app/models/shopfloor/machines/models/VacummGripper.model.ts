import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';
import { toBoolean, toNumber } from './machine-rendering.utils';

export class VacuumGripperModel implements IMachine {
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
        const armExtension = toNumber(this.telemetryState['vacuumSensArmEncoderCounter']);
        const rotationCounter = toNumber(this.telemetryState['vacuumSensRotEncoderCounter']);

        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id}`);
        if (woodBase && isOperational !== null) {
            woodBase.setAttribute('fill', isOperational ? 'burlywood' : 'red');
        }

        const rotationGroup = machineEl.querySelector<SVGGElement>(`#vgrArmRotation${this.id}`);
        if (rotationGroup && rotationCounter !== null) {
            rotationGroup.setAttribute('transform', `rotate(${rotationCounter} 214 105)`);
        }

        const armBody = machineEl.querySelector<SVGRectElement>(`#vgrArmBody${this.id}`);
        const endEffector = machineEl.querySelector<SVGRectElement>(`#vgrEndEffector${this.id}`);
        if (armBody && endEffector && armExtension !== null) {
            const minLength = 110;
            const maxLength = 220;
            const clampedLength = Math.max(minLength, Math.min(maxLength, armExtension));
            armBody.setAttribute('width', `${clampedLength}`);
            endEffector.setAttribute('x', `${214 + clampedLength - 6}`);
        }
    }

}
