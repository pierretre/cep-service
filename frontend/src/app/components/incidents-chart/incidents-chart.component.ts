import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';
import { Incident, IncidentSeverity } from '../../models';

@Component({
    selector: 'app-incidents-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './incidents-chart.component.html',
    styleUrls: ['./incidents-chart.component.css']
})
export class IncidentsChartComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() incidents: Incident[] = [];
    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    private chart: echarts.ECharts | null = null;
    private resizeObserver: ResizeObserver | null = null;

    ngOnInit(): void {
        // Chart will be initialized in ngAfterViewInit
    }

    ngAfterViewInit(): void {
        this.initChart();
        this.updateChart();
        this.setupResizeObserver();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['incidents'] && !changes['incidents'].firstChange) {
            this.updateChart();
        }
    }

    private setupResizeObserver(): void {
        if (this.chartContainer && this.chart) {
            // Use ResizeObserver to detect container size changes
            this.resizeObserver = new ResizeObserver(() => {
                if (this.chart) {
                    // Use setTimeout to ensure the resize happens after the DOM update
                    setTimeout(() => {
                        this.chart?.resize();
                    }, 100);
                }
            });

            this.resizeObserver.observe(this.chartContainer.nativeElement);
        }
    }

    private initChart(): void {
        if (this.chartContainer) {
            this.chart = echarts.init(this.chartContainer.nativeElement);
        }
    }

    private updateChart(): void {
        if (!this.chart) return;

        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        // Filter incidents from last 24 hours
        const recentIncidents = this.incidents.filter(
            incident => incident.startTime >= last24Hours
        );

        // Group by hour and severity
        const hourlyData = this.groupByHourAndSeverity(recentIncidents);

        const option: echarts.EChartsOption = {
            title: {
                text: 'Incidents - Last 24 Hours',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                data: ['Critical', 'Warning', 'Info'],
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: hourlyData.hours,
                axisLabel: {
                    rotate: 45,
                    fontSize: 10
                }
            },
            yAxis: {
                type: 'value',
                name: 'Count',
                minInterval: 1
            },
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

        this.chart.setOption(option);
    }

    private groupByHourAndSeverity(incidents: Incident[]): {
        hours: string[];
        critical: number[];
        warning: number[];
        info: number[];
    } {
        const now = new Date();
        const hours: string[] = [];
        const critical: number[] = [];
        const warning: number[] = [];
        const info: number[] = [];

        // Generate last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now);
            hour.setHours(hour.getHours() - i);
            hour.setMinutes(0, 0, 0);

            const hourLabel = hour.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            hours.push(hourLabel);

            const nextHour = new Date(hour);
            nextHour.setHours(nextHour.getHours() + 1);

            // Count incidents in this hour by severity
            const incidentsInHour = incidents.filter(
                incident => incident.startTime >= hour && incident.startTime < nextHour
            );

            critical.push(
                incidentsInHour.filter(i => i.severity === IncidentSeverity.Critical).length
            );
            warning.push(
                incidentsInHour.filter(i => i.severity === IncidentSeverity.Warning).length
            );
            info.push(
                incidentsInHour.filter(i => i.severity === IncidentSeverity.Info).length
            );
        }

        return { hours, critical, warning, info };
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
}
