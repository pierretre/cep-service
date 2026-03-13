import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { ShopfloorMachineUpdate } from '../../models/machine-update.model';
import { MachineTelemetryStore } from '../../stores/machine-telemetry.store';

@Component({
    selector: 'app-factory-shopfloor-layout',
    template: `
        <div class="shopfloor-layout-root flex h-screen">
            <aside
                id="shopfloor-legend-panel"
                class="legend-panel z-20 h-full w-72 border-r border-slate-200 bg-white"
                aria-label="Shopfloor legend"
            >
                <div class="h-full overflow-y-auto px-4 py-5">
                    <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Shopfloor Legend</h2>
                    <p class="mb-4 text-xs text-slate-500">Machine color states</p>

                    <ul class="space-y-3 text-sm text-slate-700">
                        <li class="flex items-center gap-3">
                            <span class="h-4 w-4 rounded border border-red-200" style="background:#dc2626"></span>
                            <span>Not operational</span>
                        </li>
                        <li class="flex items-center gap-3">
                            <span class="h-4 w-4 rounded border border-amber-200" style="background:#fef3c7"></span>
                            <span>Not initialized</span>
                        </li>
                    </ul>

                    <p class="mb-4 mt-6 text-xs text-slate-500">SVG Elements</p>
                    <ul class="space-y-3 text-sm text-slate-700">
                        <li class="flex items-center gap-3">
                            <span class="h-4 w-4 rounded border border-blue-200" style="background:rgba(59, 130, 246, 0.3)"></span>
                            <span>Access Zone</span>
                        </li>
                        <li class="flex items-center gap-3">
                            <span class="h-4 w-4 rounded border border-gray-400" style="background:#374151"></span>
                            <span>Moving Parts</span>
                        </li>
                        <li class="flex items-center gap-3">
                            <span class="h-4 w-4 rounded border border-yellow-300" style="background:rgba(255, 255, 0, 0.5)"></span>
                            <span>Light Barrier Sensor</span>
                        </li>
                    </ul>
                </div>
            </aside>

            <div #svgContainer class="shopfloor-container flex-1"></div>
        </div>
    `,
    styleUrls: ['./factory-shopfloor-layout.component.css'],
    standalone: true
})
export class FactoryShopfloorLayoutComponent implements AfterViewInit, OnDestroy {
    @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef<HTMLElement>;
    private subscription: Subscription | null = null;
    private static readonly MACHINE_NAME_BY_ID: Record<string, string> = {
        CBSystemModel: 'Conveyor Belt',
        HBWSystemModel: 'High Bay Warehouse',
        SLSystemModel: 'Sorting Line',
        MPSystemModel: 'Multi Processing Station',
        VGRSystemModel_01: 'Vacuum Gripper Robot 01',
        VGRSystemModel_02: 'Vacuum Gripper Robot 02'
    };

    // Cache machine elements for fast updates
    private readonly machineCache = new Map<string, SVGGElement>();

    constructor(private readonly telemetryStore: MachineTelemetryStore) { }

    ngAfterViewInit(): void {
        // Load SVG into container
        fetch('/assets/shopfloor.svg')
            .then(resp => resp.text())
            .then(svgText => {
                this.svgContainer.nativeElement.innerHTML = svgText;
                const svg = this.svgContainer.nativeElement.querySelector<SVGSVGElement>('svg');
                if (svg) {
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');
                    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                }
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

        this.renderInitialMachineState();
        this.attachMachineTooltips(svg);

        console.log('[Shopfloor] Cached machine elements:', this.machineCache.size);
    }

    private renderInitialMachineState(): void {
        console.log(this.machineCache);
        this.machineCache.forEach((machineEl, machineId) => {
            const machine = this.telemetryStore.getMachineById(machineId);
            if (!machine) {
                return;
            }
            machine.render(machineEl);
        });
    }

    private attachMachineTooltips(svg: SVGSVGElement): void {
        const machineGroups = svg.querySelectorAll<SVGGElement>(':scope > g[id]');
        machineGroups.forEach(group => {
            if (!this.isMachineGroup(group.id)) {
                return;
            }

            const tooltipText = FactoryShopfloorLayoutComponent.MACHINE_NAME_BY_ID[group.id] ?? group.id;
            const existingTitle = group.querySelector(':scope > title');
            if (existingTitle) {
                existingTitle.textContent = tooltipText;
                return;
            }

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = tooltipText;
            group.insertBefore(title, group.firstChild);
        });
    }

    private isMachineGroup(groupId: string): boolean {
        return Object.hasOwn(FactoryShopfloorLayoutComponent.MACHINE_NAME_BY_ID, groupId);
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