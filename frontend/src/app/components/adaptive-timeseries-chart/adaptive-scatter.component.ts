import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    AfterViewInit
} from '@angular/core';
import * as echarts from 'echarts';
import { EChartsOption, ECharts } from 'echarts';
import { Subject, debounceTime, switchMap, takeUntil } from 'rxjs';
import { TimeseriesService } from '../../services/time-series-data.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-adaptive-scatter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './adaptive-scatter.component.html',
    styleUrls: ['./adaptive-scatter.component.css']
})
export class AdaptiveScatterComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    chartInstance!: ECharts;
    chartOption!: EChartsOption;

    private zoomChange$ = new Subject<{ start: number; end: number }>();
    private destroy$ = new Subject<void>();

    private lastRequestKey = '';

    constructor(private dataService: TimeseriesService) { }

    ngOnInit() {
        this.initChartOption();
        this.setupZoomHandling();
    }

    ngAfterViewInit() {
        this.initChart();
        this.loadInitialRange();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private initChart() {
        if (this.chartContainer) {
            this.chartInstance = echarts.init(this.chartContainer.nativeElement);
            this.chartInstance.setOption(this.chartOption);

            // Listen to dataZoom events
            this.chartInstance.on('dataZoom', () => {
                this.onDataZoom();
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                this.chartInstance?.resize();
            });
        }
    }

    private initChartOption() {
        this.chartOption = {
            animation: false,
            title: {
                text: 'Incident Count Over Time',
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
                    type: 'scatter',
                    symbolSize: 8,
                    itemStyle: {
                        color: '#3b82f6'
                    },
                    progressive: 5000,
                    progressiveThreshold: 10000,
                    data: []
                }
            ]
        };
    }

    private loadInitialRange() {
        const now = Date.now();
        const start = this.getEarliestDataTime();
        this.zoomChange$.next({ start, end: now });
    }

    private getEarliestDataTime(): number {
        // Start from 30 days ago or earliest available data
        return Date.now() - 30 * 24 * 3600 * 1000;
    }

    private setupZoomHandling() {
        this.zoomChange$
            .pipe(
                debounceTime(200),
                switchMap(range => {
                    const resolution = this.computeResolution(range.start, range.end);

                    const key = `${range.start}-${range.end}-${resolution}`;
                    if (key === this.lastRequestKey) return [];

                    this.lastRequestKey = key;
                    if (this.chartInstance) {
                        this.chartInstance.showLoading();
                    }

                    return this.dataService.getTimeseries(
                        range.start,
                        range.end,
                        resolution
                    );
                }),
                takeUntil(this.destroy$)
            )
            .subscribe(data => {
                if (!data || !this.chartInstance) return;

                const formatted = data.map(p => [p.timestamp, p.value]);

                this.chartInstance.setOption({
                    series: [{ data: formatted }]
                });

                this.chartInstance.hideLoading();
            });
    }

    private onDataZoom() {
        if (!this.chartInstance) return;

        const option = this.chartInstance.getOption() as any;
        const dataZoom = option.dataZoom?.[0];

        if (!dataZoom) return;

        const xAxis = option.xAxis?.[0];
        if (!xAxis) return;

        // Get the current data range
        const series = option.series?.[0];
        if (!series || !series.data || series.data.length === 0) return;

        const allData = series.data as number[][];
        const startPercent = dataZoom.start || 0;
        const endPercent = dataZoom.end || 100;

        const startIndex = Math.floor((startPercent / 100) * allData.length);
        const endIndex = Math.ceil((endPercent / 100) * allData.length);

        if (startIndex < allData.length && endIndex > 0) {
            const start = allData[Math.max(0, startIndex)][0];
            const end = allData[Math.min(allData.length - 1, endIndex - 1)][0];

            this.zoomChange$.next({ start, end });
        }
    }

    private computeResolution(start: number, end: number): string {
        const range = end - start;
        const hour = 3600_000;
        const day = 24 * hour;

        if (range <= day) return '1m';
        if (range <= 7 * day) return '5m';
        if (range <= 30 * day) return '15m';
        if (range <= 90 * day) return '1h';
        if (range <= 365 * day) return '6h';
        return '1d';
    }
}
