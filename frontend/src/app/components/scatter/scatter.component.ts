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

@Component({
    selector: 'app-scatter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scatter.component.html',
    styleUrls: ['./scatter.component.css']
})
export class ScatterComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    chartInstance!: ECharts;
    chartOption!: EChartsOption;

    private destroy$ = new Subject<void>();

    // Inject store
    private incidentStore = inject(IncidentStore);

    constructor() {
        // React to incident changes
        effect(() => {
            const incidents = this.incidentStore.incidents();
            console.log('[Component] Incidents updated - total count:', incidents.length);
            this.updateChartData();
        });
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        console.log('[Component] Ready');
        // Initialize the chart instance here
        this.chartInstance = echarts.init(this.chartContainer.nativeElement);
        this.updateChartData();
        this.updateVisibleRangeFromChart();
        // Click handling
        this.chartInstance.on('click', (params: any) => {
            if (!params || !params.data) return;

            const incidents = params.data.incidents;
            if (!incidents || !incidents.length) return;

            // For simplicity, just log them
            console.log('Clicked incidents in this bucket:', incidents);

            // Or trigger your detail display logic
            // e.g., this.openIncidentDetails(incidents);
        });

        this.chartInstance.on('datazoom', () => {
            this.updateVisibleRangeFromChart();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private updateChartData(visibleRange?: [number, number]): void {
        if (!this.chartInstance) return;

        const incidents = this.incidentStore.incidents();
        if (!incidents?.length) {
            this.chartInstance.setOption({ series: [] }, true);
            return;
        }

        // Filter by visible range if provided
        const visibleIncidents = visibleRange
            ? incidents.filter(i => {
                const ts = i.startTime.getTime();
                return ts >= visibleRange[0] && ts <= visibleRange[1];
            })
            : incidents;

        // Map each incident to a point
        const seriesData: Record<'critical' | 'warning' | 'info', any[]> = {
            critical: [],
            warning: [],
            info: []
        };

        visibleIncidents.forEach(i => {
            const key = i.severity.toLowerCase() as 'critical' | 'warning' | 'info';
            seriesData[key].push({
                value: [i.startTime.getTime(), 1], // y=1 for scatter
                incident: i // attach full incident for tooltip/click
            });
        });

        this.chartOption = {
            animation: false,
            title: {
                text: 'Incident Count Over Time (Real-Time)',
                left: 'center',
                top: 10
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
                min: this.incidentStore.startTime(),
                max: this.incidentStore.endTime()
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
        this.updateVisibleRangeFromChart();
    }

    private updateVisibleRangeFromChart(): void {
        if (!this.chartInstance) return;

        const option = this.chartInstance.getOption() as any;
        const dataZoom = option?.dataZoom?.[0];
        const startPercent = typeof dataZoom?.start === 'number' ? dataZoom.start : 0;
        const endPercent = typeof dataZoom?.end === 'number' ? dataZoom.end : 100;

        const min = this.incidentStore.startTime();
        const max = this.incidentStore.endTime();

        if (!isFinite(min) || !isFinite(max) || min >= max) {
            return;
        }

        const visibleStart = min + ((max - min) * startPercent) / 100;
        const visibleEnd = min + ((max - min) * endPercent) / 100;

        this.incidentStore.setVisibleRange(visibleStart, visibleEnd);
    }
}
