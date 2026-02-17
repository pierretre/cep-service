import * as echarts from 'echarts';
import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    AfterViewInit,
    effect,
    inject
} from '@angular/core';
import { EChartsOption, ECharts } from 'echarts';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IncidentStore } from '../../stores/incident.store';
import { FilterStore } from '../../stores/filter.store';
import { Incident } from '../../models';
import { IncidentDetailsComponent } from '../incident-details/incident-details.component';

@Component({
    selector: 'app-scatter',
    standalone: true,
    imports: [CommonModule, IncidentDetailsComponent],
    templateUrl: './scatter.component.html',
    styleUrls: ['./scatter.component.css']
})
export class ScatterComponent implements OnDestroy, AfterViewInit {

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    chartInstance!: ECharts;
    chartOption!: EChartsOption;
    selectedIncident: Incident | null = null;

    private destroy$ = new Subject<void>();

    // Inject stores
    private incidentStore = inject(IncidentStore);
    private filterStore = inject(FilterStore);

    constructor() {
        // React to incident changes
        effect(() => {
            const incidents = this.incidentStore.filteredIncidents();
            console.log('[Component] Incidents updated - total count:', incidents.length);
            this.updateChartData(incidents);
        });
    }

    ngAfterViewInit(): void {
        // Initialize the chart instance here
        this.chartInstance = echarts.init(this.chartContainer.nativeElement);
        this.updateChartData(this.incidentStore.filteredIncidents());

        // Click handling
        this.chartInstance.on('click', (params: any) => {
            if (!params || !params.data) return;

            const incident = params.data.incident;
            if (!incident) return;

            this.selectedIncident = incident;
            console.log('Selected incident:', incident);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private updateChartData(incidents: Array<Incident>): void {
        if (!this.chartInstance) return;

        // if (!incidents?.length) {
        //     this.chartInstance.setOption({ series: [] }, true);
        //     return;
        // }

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
                text: 'Incident Count Over Time (Real-Time)',
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
                axisPointer: { type: 'cross' },
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
                    start: 0,
                    end: 100,
                    zoomLock: false
                },
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    start: 0,
                    end: 100,
                    height: 30,
                    bottom: 10
                }
            ],
            series: [
                {
                    name: 'Critical',
                    type: 'line',
                    stack: 'total',
                    data: seriesData.critical,
                    itemStyle: { color: '#ef4444' }
                },
                {
                    name: 'Warning',
                    type: 'line',
                    stack: 'total',
                    data: seriesData.warning,
                    itemStyle: { color: '#f97316' }
                },
                {
                    name: 'Info',
                    type: 'line',
                    stack: 'total',
                    data: seriesData.info,
                    itemStyle: { color: '#eab308' }
                }
            ]
        };

        this.chartInstance.setOption(this.chartOption);
    }

    clearSelection(): void {
        this.selectedIncident = null;
    }
}
