import { IMachine, MachineTelemetryData } from '../interfaces/IMachine';

export class VacuumGripperModel implements IMachine {
    id: string;
    position: { x: number; y: number };
    rotation: number;

    // properties of the vaccum gripper:
    armExtension: number = 0; // in mm
    armRotation: number = 0; // in degrees
    gripperExtension: number = 0; // in mm
    gripperState: boolean = false; // true if gripper is closed, false if open
    isArmElevated: boolean = false;
    isArmExtended: boolean = false;
    isOperational: boolean = false;
    isInitialized: boolean = false;

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
        if (typeof state['armExtension'] === 'number') {
            this.armExtension = state['armExtension'];
        }
        if (typeof state['armRotation'] === 'number') {
            this.armRotation = state['armRotation'];
        }
        if (typeof state['gripperExtension'] === 'number') {
            this.gripperExtension = state['gripperExtension'];
        }
        if (typeof state['gripperState'] === 'boolean') {
            this.gripperState = state['gripperState'];
        }
        if (typeof state['isArmElevated'] === 'boolean') {
            this.isArmElevated = state['isArmElevated'];
        }
        if (typeof state['isArmExtended'] === 'boolean') {
            this.isArmExtended = state['isArmExtended'];
        }
        if (typeof state['isInitialized'] === 'boolean') {
            this.isInitialized = state['isInitialized'];
        }
    }

    getTelemetryState(): Record<string, unknown> {
        return {
            ...this.telemetryState,
            armExtension: this.armExtension,
            armRotation: this.armRotation,
            gripperExtension: this.gripperExtension,
            gripperState: this.gripperState,
            isArmElevated: this.isArmElevated,
            isArmExtended: this.isArmExtended,
            isOperational: this.isOperational,
            isInitialized: this.isInitialized
        };
    }

    render(machineEl: SVGGElement): void {
        const woodBase = machineEl.querySelector<SVGRectElement>(`#woodBase${this.id}`);
        if (woodBase) {
            woodBase.setAttribute('fill', this.isOperational ? 'burlywood' : 'red');
        }

        const rotationGroup = machineEl.querySelector<SVGGElement>(`#vgrArmRotation${this.id}`);
        if (rotationGroup) {
            rotationGroup.setAttribute('transform', `rotate(${this.armRotation} 214 105)`);
        }

        const armBody = machineEl.querySelector<SVGRectElement>(`#vgrArmBody${this.id}`);
        const endEffector = machineEl.querySelector<SVGRectElement>(`#vgrEndEffector${this.id}`);
        if (armBody && endEffector) {
            const pivotX = 214;
            const minLength = 165;
            const maxLength = 315;
            const endEffectorWidth = 22;
            const clampedLength = Math.max(minLength, Math.min(maxLength, this.armExtension));
            armBody.setAttribute('width', `${clampedLength}`);
            endEffector.setAttribute('x', `${pivotX + clampedLength - endEffectorWidth}`);
        }
    }

}
