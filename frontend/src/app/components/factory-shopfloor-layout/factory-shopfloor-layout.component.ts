import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MachineTelemetryService } from '../../services/machine-telemetry.service';
import { toShopfloorMachineUpdate } from '../../models/machine-update.model';

@Component({
    selector: 'app-factory-shopfloor-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './factory-shopfloor-layout.component.html',
    styleUrls: ['./factory-shopfloor-layout.component.css']
})
export class FactoryShopfloorLayoutComponent implements OnInit, OnDestroy {
    private machineSubscription: Subscription | null = null;
    private conveyorPatternOffset = 0;
    private conveyorSpeed = 0;
    private conveyorProximity = 0;

    constructor(private readonly machineTelemetryService: MachineTelemetryService) { }

    ngOnInit(): void {
        this.machineSubscription = this.machineTelemetryService.connectToMachineStream().subscribe({
            next: (update) => {
                this.applyMachineUpdate(toShopfloorMachineUpdate(update));
            },
            error: (error) => {
                console.error('[Shopfloor] Machine telemetry stream error:', error);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.machineSubscription) {
            this.machineSubscription.unsubscribe();
            this.machineSubscription = null;
        }
        this.machineTelemetryService.disconnectFromMachineStream();
    }

    private applyMachineUpdate(update: { machineId: string; attribute: string; value: unknown }): void {
        const machineId = (update.machineId ?? '').toLowerCase();
        const attribute = this.normalizeSensorKey(update.attribute ?? '');

        if (machineId === 'vgr1' || machineId === 'vgr2') {
            this.updateVacuumGripper(machineId, attribute, update.value);
            return;
        }

        if (machineId === 'cb1') {
            this.updateConveyor(attribute, update.value);
        }
    }

    private updateVacuumGripper(machineId: string, attribute: string, rawValue: unknown): void {
        const rotationGroup = document.getElementById(`vacuumSensRotEncoderCounter_${machineId}`);
        const armHead = document.getElementById(`vacuumSensArmEncoderCounter_${machineId}`) as SVGCircleElement | null;
        const verticalEncoder = document.getElementById(`vacuumSensVerticalEncoderCounter_${machineId}`) as SVGRectElement | null;
        const numericValue = this.toNumber(rawValue);

        if (numericValue !== null && (attribute === 'rotation' || attribute === 'rot' || attribute === 'vacuumsensrotencodercounter')) {
            const rotAngle = this.clampNumber(numericValue, 0, 360);
            if (rotationGroup) {
                rotationGroup.setAttribute('transform', `rotate(${rotAngle} 214 105)`);
            }
            return;
        }

        if (numericValue !== null && (attribute === 'vacuumsensarmencodercounter' || attribute === 'arm' || attribute === 'armencoder' || attribute === 'x')) {
            if (armHead) {
                const normalizedArm = this.normalize(numericValue, 0, 100);
                const armX = 214 + (normalizedArm * 86);
                armHead.setAttribute('cx', armX.toFixed(2));
            }
            return;
        }

        if (numericValue !== null && (attribute === 'vacuumsensverticalencodercounter' || attribute === 'vertical' || attribute === 'z' || attribute === 'y')) {
            if (verticalEncoder) {
                const normalizedVertical = this.normalize(numericValue, 0, 100);
                const verticalY = -15 + ((1 - normalizedVertical) * 170);
                verticalEncoder.setAttribute('y', verticalY.toFixed(2));
            }
            return;
        }

        if (attribute === 'vacuumsensverticalendup' || attribute === 'verticalendup') {
            this.setSensorLamp(`vacuumSensVerticalEndUp_${machineId}`, this.toBoolean(rawValue));
            return;
        }

        if (attribute === 'vacuumsensrotend' || attribute === 'rotend') {
            this.setSensorLamp(`vacuumSensRotEnd_${machineId}`, this.toBoolean(rawValue));
            return;
        }

        if (attribute === 'vacuumsensarmendin' || attribute === 'armendin') {
            this.setSensorLamp(`vacuumSensArmEndIn_${machineId}`, this.toBoolean(rawValue));
        }
    }

    private updateConveyor(attribute: string, rawValue: unknown): void {
        const numericValue = this.toNumber(rawValue);

        if ((attribute === 'speed' || attribute === 'conveyorspeed' || attribute === 'linearspeed') && numericValue !== null) {
            this.conveyorSpeed = numericValue;
            const beltPattern = document.getElementById('beltPattern_cb1');
            this.conveyorPatternOffset = (this.conveyorPatternOffset + (this.conveyorSpeed * 6)) % 24;
            if (beltPattern) {
                beltPattern.setAttribute('patternTransform', `translate(${this.conveyorPatternOffset.toFixed(2)},0)`);
            }

            const direction = document.getElementById('conveyorDirection_cb1');
            if (direction) {
                const arrowAngle = this.conveyorSpeed < 0 ? 180 : 0;
                direction.setAttribute('transform', `rotate(${arrowAngle} 135 30)`);
            }

            this.updateConveyorExecutionIndicator();
            return;
        }

        if ((attribute === 'proximity' || attribute === 'presence' || attribute === 'occupied') && numericValue !== null) {
            this.conveyorProximity = numericValue;
            this.updateConveyorExecutionIndicator();
            return;
        }

        if ((attribute === 'sortinglinesensimpulsecounterraw' || attribute === 'impulse' || attribute === 'counter') && numericValue !== null) {
            const product = document.getElementById('conveyorProduct_cb1') as SVGRectElement | null;
            if (product) {
                const normalizedImpulse = this.normalize(numericValue, 0, 100);
                const productX = 35 + (normalizedImpulse * 190);
                product.setAttribute('x', productX.toFixed(2));
            }
            this.setSensorLamp('sensorImpulse_cb1', numericValue > 0);
            return;
        }

        if (attribute === 'feed' || attribute === 'sensorfeed') {
            this.setSensorLamp('sensorFeed_cb1', this.toBoolean(rawValue));
            return;
        }

        if (attribute === 'swap' || attribute === 'sensorswap') {
            this.setSensorLamp('sensorSwap_cb1', this.toBoolean(rawValue));
        }
    }

    private updateConveyorExecutionIndicator(): void {
        const executionIndicator = document.getElementById('executionIndicator_cb1');
        if (!executionIndicator) {
            return;
        }

        const active = this.conveyorProximity > 0.5 || Math.abs(this.conveyorSpeed) > 0.01;
        executionIndicator.setAttribute('fill', active ? '#22c55e' : '#ef4444');
    }

    private setSensorLamp(elementId: string, active: boolean): void {
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }

        if (active) {
            element.setAttribute('fill', '#22c55e');
            element.setAttribute('fill-opacity', '0.7');
        } else {
            element.setAttribute('fill', '#facc15');
            element.setAttribute('fill-opacity', '0.45');
        }
    }

    private normalizeSensorKey(key: string): string {
        return key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
    }

    private toNumber(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value.trim());
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    private toBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        const numericValue = this.toNumber(value);
        if (numericValue !== null) {
            return numericValue > 0;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === 'on' || normalized === 'yes';
        }

        return false;
    }

    private normalize(value: number, min: number, max: number): number {
        if (max <= min) {
            return 0;
        }
        const clamped = this.clampNumber(value, min, max);
        return (clamped - min) / (max - min);
    }

    private clampNumber(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
    }
}
