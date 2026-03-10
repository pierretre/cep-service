import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { ShopfloorMachineUpdate } from '../../models/machine-update.model';
import { MachineTelemetryStore } from '../../stores/machine-telemetry.store';

@Component({
    selector: 'app-factory-shopfloor-layout',
    template: `<div #svgContainer class="shopfloor-container"></div>`,
    styleUrls: ['./factory-shopfloor-layout.component.css'],
    standalone: true
})
export class FactoryShopfloorLayoutComponent implements AfterViewInit, OnDestroy {
    @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef<HTMLElement>;
    private subscription: Subscription | null = null;

    // Cache machine elements for fast updates
    private readonly machineCache = new Map<string, SVGGElement>();

    constructor(private readonly telemetryStore: MachineTelemetryStore) { }

    ngAfterViewInit(): void {
        // Load SVG into container
        fetch('/assets/shopfloor.svg')
            .then(resp => resp.text())
            .then(svgText => {
                this.svgContainer.nativeElement.innerHTML = svgText;
                this.cacheMachines();
            });

        // Subscribe to telemetry
        this.subscription = this.telemetryStore.connect().subscribe({
            next: update => this.applyUpdate(update),
            error: err => console.error('[Shopfloor] Telemetry error:', err)
        });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        this.telemetryStore.disconnect();
    }

    /** Cache machine elements by ID */
    private cacheMachines(): void {
        const svg = this.svgContainer.nativeElement.querySelector<SVGSVGElement>('svg');
        if (!svg) return;

        svg.querySelectorAll<SVGGElement>('g[id]').forEach(g => {
            this.machineCache.set(g.id, g);
        });

        console.log('[Shopfloor] Cached machine elements:', this.machineCache.size);
    }

    /**
     * Apply a telemetry update to a machine
     */
    private applyUpdate(update: ShopfloorMachineUpdate): void {
        const machine = this.telemetryStore.getMachineById(update.machineId);
        if (!machine) return;

        const machineEl = this.machineCache.get(update.machineId);
        if (!machineEl) return;

        machine.render(machineEl); // model handles the rendering
    }
}