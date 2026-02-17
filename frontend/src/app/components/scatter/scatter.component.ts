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
    aggregatedData: any = {};

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

        // React to aggregated incidents data changes
        effect(() => {
            this.aggregatedData = this.incidentStore.timeSeriesData();
            console.log('[Component] Time-series data updated - critical:', this.aggregatedData.critical.length, 'warning:', this.aggregatedData.warning.length, 'info:', this.aggregatedData.info.length);
            console.log('[Component] Aggregated incidents updated - total count:', this.aggregatedData.critical.length + this.aggregatedData.warning.length + this.aggregatedData.info.length);
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
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private updateChartData(): void {
        console.log('[Component] Updating chart data with aggregated data:', this.aggregatedData);
        if (!this.chartInstance) return;

        this.aggregatedData = {
            critical: [],
            warning: [],
            info: []
        };

        this.incidentStore.incidents().forEach(incident => {
            this.aggregatedData[incident.severity.toLowerCase()].push({
                value: [incident.startTime.getTime(), 1],
                severity: incident.severity.toLowerCase()
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
                name: 'Incident Count',
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
                    data: this.aggregatedData.critical,
                    itemStyle: { color: '#ef4444' }
                },
                {
                    name: 'Warning',
                    type: 'line',
                    stack: 'total',
                    data: this.aggregatedData.warning,
                    itemStyle: { color: '#f97316' }
                },
                {
                    name: 'Info',
                    type: 'line',
                    stack: 'total',
                    data: this.aggregatedData.info,
                    itemStyle: { color: '#eab308' }
                }
            ]
        };

        this.chartInstance.setOption(this.chartOption);
    }
}
