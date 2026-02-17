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
import * as echarts from 'echarts';
import { EChartsOption, ECharts } from 'echarts';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IncidentStore } from '../../stores/incident.store';
import { Incident, IncidentSeverity } from '../../models';

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

            this.updateChartData(incidents);
        });
    }

    ngOnInit(): void {
        this.initChartOption();
    }

    ngAfterViewInit(): void {
        this.initChart();
        this.incidentStore.setPageReady(true);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.incidentStore.setPageReady(false);
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private initChart(): void {
        if (this.chartContainer) {
            this.chartInstance = echarts.init(this.chartContainer.nativeElement);
            this.chartInstance.setOption(this.chartOption);

            // Handle window resize
            window.addEventListener('resize', () => {
                this.chartInstance?.resize();
            });
        }
    }

    private initChartOption(): void {
        this.updateChartData([]);
    }

    private updateChartData(data: Array<Incident>): void {
        console.log('[Component] Updating chart data with', data.length, 'incidents');
        if (!this.chartInstance) return;

        this.chartOption = {
            animation: false,
            title: {
                text: 'Incident Count Over Time (Real-Time)',
                left: 'center',
                top: 10
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: (params: any) => {
                    if (!params || params.length === 0) return '';
                    const point = params[0];
                    const date = new Date(point.value[0]);
                    const count = point.value[1];
                    return `${date.toLocaleString()}<br/>Incidents: ${count}`;
                }
            },
            grid: {
                left: '5%',
                right: '5%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                name: 'Time',
                nameLocation: 'middle',
                nameGap: 30
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
                    end: 100
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
                    type: 'bar',
                    stack: 'total',
                    data: hourlyData.critical,
                    itemStyle: {
                        color: '#ef4444' // red
                    }
                },
                {
                    name: 'Warning',
                    type: 'bar',
                    stack: 'total',
                    data: hourlyData.warning,
                    itemStyle: {
                        color: '#f97316' // orange
                    }
                },
                {
                    name: 'Info',
                    type: 'bar',
                    stack: 'total',
                    data: hourlyData.info,
                    itemStyle: {
                        color: '#eab308' // yellow
                    }
                }
            ]
        };
    }

    private groupData(incidents: Incident[]): {
        hours: string[];
        critical: number[];
        warning: number[];
        info: number[];
    } {
        const now = new Date();
        const critical: number[] = [];
        const warning: number[] = [];
        const info: number[] = [];
        const zoomLevel = '1m'; // This should ideally come from the store or component state

        // TODO

        return { hours: [], critical, warning, info };
    }
}
