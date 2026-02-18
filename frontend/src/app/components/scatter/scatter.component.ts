import * as echarts from 'echarts';
import {
    Component,
    OnDestroy,
    ElementRef,
    ViewChild,
    AfterViewInit,
    effect,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    NgZone
} from '@angular/core';
import { EChartsOption, ECharts } from 'echarts';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IncidentStore } from '../../stores/incident.store';
import { FilterStore } from '../../stores/filter.store';
import { Incident } from '../../models';
import { IncidentDetailsComponent } from '../incident-details/incident-details.component';
import { RelateHoverComponent, RelateHoverInfo } from '../relate-hover/relate-hover.component';
import { HamstersEvent } from '../../decorators/hamsters.decorator';

@Component({
    selector: 'app-scatter',
    standalone: true,
    imports: [CommonModule, IncidentDetailsComponent, RelateHoverComponent],
    templateUrl: './scatter.component.html',
    styleUrls: ['./scatter.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScatterComponent implements OnDestroy, AfterViewInit {

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    chartInstance!: ECharts;
    chartOption!: EChartsOption;
    selectedIncident: Incident | null = null;
    hoverInfo: RelateHoverInfo | null = null;

    private destroy$ = new Subject<void>();
    private currentZoom: { start: number; end: number } = { start: 0, end: 100 };
    private hoverThrottleTimer: any = null;
    private cachedRelatedIndices = new Map<string, number[]>();

    // Inject stores
    private incidentStore = inject(IncidentStore);
    private filterStore = inject(FilterStore);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);

    constructor() {
        // React to incident changes
        effect(() => {
            const incidents = this.incidentStore.filteredIncidents();
            console.log('[Component] Incidents updated - total count:', incidents.length);
            // Clear cache when incidents change
            this.cachedRelatedIndices.clear();
            this.updateChartData(incidents);
            this.cdr.markForCheck();
        });
    }

    ngAfterViewInit(): void {
        // Initialize the chart instance here
        this.chartInstance = echarts.init(this.chartContainer.nativeElement);
        this.updateChartData(this.incidentStore.filteredIncidents());

        // Click handling
        this.chartInstance.on('click', (params: any) => this.handleChartClick(params));

        // Track zoom changes
        this.chartInstance.on('dataZoom', (params: any) => this.handleDataZoom(params));

        // Highlight related incidents on hover (optimized with throttling)
        this.chartInstance.on('mouseover', (params: any) => this.handleChartMouseOver(params));
        this.chartInstance.on('mouseout', () => this.handleChartMouseOut());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.hoverThrottleTimer) {
            clearTimeout(this.hoverThrottleTimer);
        }
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private updateChartData(incidents: Array<Incident>): void {
        if (!this.chartInstance) return;

        // Map each incident to a point
        const seriesData: Record<'critical' | 'warning' | 'info', any[]> = {
            critical: [],
            warning: [],
            info: []
        };

        incidents.forEach(i => {
            const key = i.severity.toLowerCase() as 'critical' | 'warning' | 'info';
            seriesData[key].push({
                value: [i.startTime.getTime(), 1], // y=1 for scatter
                incident: i // attach full incident for tooltip/click
            });
        });

        this.chartOption = {
            animation: false,
            title: incidents.length > 0 ? {
                text: `Incident Count Over Time${this.filterStore.filters().liveMode ? ' (Real-Time)' : ''}`,
                left: 'center',
                top: 10
            } :
                {
                    show: true,
                    textStyle: {
                        color: '#bcbcbc'
                    },
                    text: 'No Data',
                    left: 'center',
                    top: 'center'
                },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    if (!params || params.length === 0) return '';
                    const point = params[0];
                    const date = new Date(point.value[0]);
                    const count = params.reduce((sum: number, p: any) => sum + p.value[1], 0);
                    return `${date.toLocaleString()}<br/>Incidents: ${count}`;
                }
            },
            grid: { left: '5%', right: '5%', bottom: '15%', top: '15%', containLabel: true },
            xAxis: {
                type: 'time',
                name: 'Time',
                min: new Date(this.filterStore.filters().startDate).getTime(),
                max: new Date(this.filterStore.filters().endDate).getTime()
            },
            yAxis: {
                type: 'value',
                scale: true,
                minInterval: 1
            },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: 0,
                    start: this.currentZoom.start,
                    end: this.currentZoom.end,
                    zoomLock: false
                },
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    start: this.currentZoom.start,
                    end: this.currentZoom.end,
                    height: 30,
                    bottom: 10
                }
            ],
            series: [
                {
                    name: 'Critical',
                    type: 'scatter',
                    stack: 'total',
                    data: seriesData.critical,
                    itemStyle: { color: '#ef4444' },
                    emphasis: {
                        focus: 'none',
                        itemStyle: {
                            color: '#dc2626',
                            borderColor: '#000',
                            borderWidth: 2,
                            shadowBlur: 10,
                            shadowColor: 'rgba(239, 68, 68, 0.5)'
                        },
                        scale: 1.5
                    }
                },
                {
                    name: 'Warning',
                    type: 'scatter',
                    stack: 'total',
                    data: seriesData.warning,
                    itemStyle: { color: '#f97316' },
                    emphasis: {
                        focus: 'none',
                        itemStyle: {
                            color: '#ea580c',
                            borderColor: '#000',
                            borderWidth: 2,
                            shadowBlur: 10,
                            shadowColor: 'rgba(249, 115, 22, 0.5)'
                        },
                        scale: 1.5
                    }
                },
                {
                    name: 'Info',
                    type: 'scatter',
                    stack: 'total',
                    data: seriesData.info,
                    itemStyle: { color: '#eab308' },
                    emphasis: {
                        focus: 'none',
                        itemStyle: {
                            color: '#ca8a04',
                            borderColor: '#000',
                            borderWidth: 2,
                            shadowBlur: 10,
                            shadowColor: 'rgba(234, 179, 8, 0.5)'
                        },
                        scale: 1.5
                    }
                }
            ]
        };

        this.chartInstance.setOption(this.chartOption);
    }

    clearSelection(): void {
        this.selectedIncident = null;
        this.hoverInfo = null;

        // Clear all highlights
        if (this.chartInstance) {
            this.chartInstance.dispatchAction({
                type: 'downplay',
                seriesIndex: [0, 1, 2]
            });
        }

        this.cdr.markForCheck();
    }

    private getRelatedIncidentIndices(hoveredIncident: Incident): number[] {
        const ruleId = hoveredIncident.rule.id;
        const severity = hoveredIncident.severity.toLowerCase();
        const incidents = this.incidentStore.filteredIncidents();

        const indices: number[] = [];
        let currentIndex = 0;

        incidents.forEach(incident => {
            if (incident.severity.toLowerCase() === severity) {
                if (incident.rule.id === ruleId) {
                    indices.push(currentIndex);
                }
                currentIndex++;
            }
        });

        return indices;
    }

    @HamstersEvent('User points at reference incident to relate to')
    // @HamstersEvent('User holds activates Relation mode')
    private highlightRelatedIncidents(incident: Incident): void {
        const severity = incident.severity;
        const cacheKey = `${incident.rule.id}-${severity}`;

        // Use cached indices if available
        let relatedIndices = this.cachedRelatedIndices.get(cacheKey);
        if (!relatedIndices) {
            relatedIndices = this.getRelatedIncidentIndices(incident);
            this.cachedRelatedIndices.set(cacheKey, relatedIndices);
        }

        // Set hover info
        this.hoverInfo = {
            count: relatedIndices.length,
            ruleName: incident.rule.name,
            severity: severity
        };

        // Highlight all incidents with same rule and severity
        this.chartInstance.dispatchAction({
            type: 'highlight',
            seriesName: severity,
            dataIndex: relatedIndices
        });

        this.cdr.markForCheck();
    }

    @HamstersEvent('User selects incident')
    private handleChartClick(params: any): void {
        if (!params?.data?.incident) {
            return;
        }

        const incident = params.data.incident as Incident;
        this.selectedIncident = incident;
        console.log('Selected incident:', incident);
        this.highlightRelatedIncidents(incident);
    }


    // @HamstersEvent('User selects an area')
    @HamstersEvent('User drags zoom bar on axis')
    private handleDataZoom(params: any): void {
        const option = this.chartInstance.getOption() as any;
        if (option.dataZoom && option.dataZoom.length > 0) {
            this.currentZoom = {
                start: option.dataZoom[0].start,
                end: option.dataZoom[0].end
            };
            console.log('Zoom changed:', this.currentZoom);
        }
    }

    @HamstersEvent('User hovers data points')
    private handleChartMouseOver(params: any): void {
        if (!params?.data?.incident) {
            return;
        }

        // Throttle to prevent excessive updates
        if (this.hoverThrottleTimer) {
            return;
        }

        this.hoverThrottleTimer = setTimeout(() => {
            this.hoverThrottleTimer = null;
        }, 50); // 50ms throttle

        const hoveredIncident = params.data.incident as Incident;
        const severity = hoveredIncident.severity;
        const cacheKey = `${hoveredIncident.rule.id}-${severity}`;

        // Use cached indices if available
        let relatedIndices = this.cachedRelatedIndices.get(cacheKey);
        if (!relatedIndices) {
            relatedIndices = this.getRelatedIncidentIndices(hoveredIncident);
            this.cachedRelatedIndices.set(cacheKey, relatedIndices);
        }

        // Run inside Angular zone to update UI
        this.ngZone.run(() => {
            this.hoverInfo = {
                count: relatedIndices!.length,
                ruleName: hoveredIncident.rule.name,
                severity: severity
            };
            this.cdr.markForCheck();
        });

        // Highlight all incidents with same rule and severity
        this.chartInstance.dispatchAction({
            type: 'highlight',
            seriesName: severity,
            dataIndex: relatedIndices
        });
    }

    private handleChartMouseOut(): void {
        // Don't clear if an incident is selected
        if (this.selectedIncident) {
            return;
        }

        // Run inside Angular zone to update UI
        this.ngZone.run(() => {
            this.hoverInfo = null;
            this.cdr.markForCheck();
        });

        // Clear all highlights
        this.chartInstance.dispatchAction({
            type: 'downplay',
            seriesIndex: [0, 1, 2]
        });
    }
}
