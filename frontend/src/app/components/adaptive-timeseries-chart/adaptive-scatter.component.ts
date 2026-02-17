import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    AfterViewInit,
    Output,
    EventEmitter,
    effect
} from '@angular/core';
import * as echarts from 'echarts';
import { EChartsOption, ECharts } from 'echarts';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { SSETimeSeriesService } from '../../services/sse-timeseries.service';
import { CommonModule } from '@angular/common';
import { FilterStore } from '../../stores/filter.store';
import { ZoomStore } from '../../stores/zoom.store';

@Component({
    selector: 'app-adaptive-scatter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './adaptive-scatter.component.html',
    styleUrls: ['./adaptive-scatter.component.css']
})
export class AdaptiveScatterComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
    @Output() selectionChange = new EventEmitter<any>();

    chartInstance!: ECharts;
    chartOption!: EChartsOption;

    private zoomChange$ = new Subject<{ start: number; end: number }>();
    private destroy$ = new Subject<void>();
    private lastRequestKey = '';
    private isInternalZoom = false;
    private currentResolution = '';
    private currentStart = 0;
    private currentEnd = 0;
    private currentDataSignal: any = null;
    private lastDataLength = 0;

    constructor(
        private sseService: SSETimeSeriesService,
        private filterStore: FilterStore,
        private zoomStore: ZoomStore
    ) {
        // React to filter changes from store
        effect(() => {
            const filters = this.filterStore.filters();
            if (filters.startDate && filters.endDate && !this.isInternalZoom) {
                const start = new Date(filters.startDate).getTime();
                const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
                this.zoomChange$.next({ start, end });
            }
        });
    }

    ngOnInit(): void {
        this.initChartOption();
        this.setupZoomHandling();
    }

    ngAfterViewInit(): void {
        this.initChart();
        this.loadInitialRange();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.sseService.unsubscribeAll();
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    private initChart(): void {
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
                    color: '#3b82f6',
                    progressive: 5000,
                    progressiveThreshold: 10000,
                    data: []
                }
            ]
        };
    }

    private loadInitialRange(): void {
        const filters = this.filterStore.filters();
        if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate).getTime();
            const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
            this.zoomChange$.next({ start, end });
        } else {
            const now = Date.now();
            const start = this.getEarliestDataTime();
            this.zoomChange$.next({ start, end: now });
        }
    }

    private getEarliestDataTime(): number {
        // Start from 30 days ago or earliest available data
        return Date.now() - 30 * 24 * 3600 * 1000;
    }

    private setupZoomHandling(): void {
        this.zoomChange$
            .pipe(
                debounceTime(200),
                takeUntil(this.destroy$)
            )
            .subscribe(range => {
                const resolution = this.computeResolution(range.start, range.end);
                const isFirstLoad = !this.currentResolution;

                // Update zoom store
                const reason = isFirstLoad ? 'initial' : (this.isInternalZoom ? 'filter' : 'zoom');
                this.zoomStore.updateZoomState(range.start, range.end, resolution, reason);
                this.currentResolution = resolution;
                this.currentStart = range.start;
                this.currentEnd = range.end;

                // Update filter store with new date range (unless change came from filters)
                if (!this.isInternalZoom) {
                    this.filterStore.updateDateRangeFromZoom(range.start, range.end);
                }
                this.isInternalZoom = false;

                // Create request key for deduplication
                const key = `${range.start}-${range.end}-${resolution}`;
                this.lastRequestKey = key;

                if (this.chartInstance) {
                    this.chartInstance.showLoading();
                }

                // Subscribe to SSE stream instead of making one-off request
                const dataSignal = this.sseService.subscribeToTimeSeries(
                    range.start,
                    range.end,
                    resolution,
                    this.filterStore.filters()
                );

                this.currentDataSignal = dataSignal;
                this.lastDataLength = 0;

                // Set up an effect to react to data updates (in the constructor context)
                // We'll handle this via a polling check within the Angular zone
                this.checkAndUpdateChartData();
            });
    }

    private checkAndUpdateChartData(): void {
        // Check for data updates and smoothly update chart
        const checkInterval = setInterval(() => {
            if (!this.currentDataSignal || !this.chartInstance) {
                clearInterval(checkInterval);
                return;
            }

            const data = this.currentDataSignal();
            if (data && data.length > 0) {
                // Check if data has changed (not just length)
                const currentOption = this.chartInstance.getOption() as any;
                const existingData = currentOption.series?.[0]?.data as any[] || [];

                // Only update if data actually changed
                if (data.length !== this.lastDataLength || this.hasDataChanged(data, existingData)) {
                    this.lastDataLength = data.length;

                    const formatted = data.map((p: any) => [p.timestamp, p.value]);

                    // Use a slight merge animation for smooth transitions
                    this.chartInstance.setOption({
                        series: [{
                            data: formatted,
                            animationDuration: 300, // Smooth animation
                            animationEasing: 'linear'
                        }]
                    }, { replaceMerge: ['series'] });
                }
            }
        }, 100); // Check every 100ms for updates

        // Clean up interval on destroy
        this.destroy$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            clearInterval(checkInterval);
        });
    }

    private hasDataChanged(newData: any[], existingData: any[]): boolean {
        if (newData.length !== existingData.length) {
            return true;
        }
        // Check if any data point has changed
        for (let i = 0; i < newData.length; i++) {
            if (existingData[i] === undefined ||
                newData[i].timestamp !== existingData[i][0] ||
                newData[i].value !== existingData[i][1]) {
                return true;
            }
        }
        return false;
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
