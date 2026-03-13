import { MachineTelemetryData } from "../interfaces/IMachine";
import { GenericMachine } from "./GenericMachine.model";

export class VacuumGripperModel extends GenericMachine {

    armExtension: number = 0; // in mm
    armRotation: number = 0; // in degrees
    gripperExtension: number = 0; // in mm
    gripperState: boolean = false; // true if gripper is closed, false if open
    isArmElevated: boolean = false;
    isArmExtended: boolean = false;

    override update(data: MachineTelemetryData): void {
        super.update(data);
        const state = data.value as Record<string, unknown>;

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
    }

    override render(machineEl: SVGGElement): void {
        super.render(machineEl);

        const rotationGroup = machineEl.querySelector<SVGGElement>(`#vgrArmRotation${this.id}`);
        if (rotationGroup) {
            rotationGroup.setAttribute('transform', `rotate(${this.armRotation} 214 105)`);
            console.log(`Rotating arm to ${this.armRotation} degrees`);
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
