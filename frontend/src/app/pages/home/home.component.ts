import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';
import { IncidentService, PaginatedResponse } from '../../services/incident.service';
import { Incident, IncidentSeverity } from '../../models/incident.model';
import { Subscription } from 'rxjs';

interface ExplorationState {
    timestamp: number;
    filters: FilterState;
    zoom: ZoomState;
    selection: number[];
    description: string;
}

interface FilterState {
    timeRange: [number, number];
    severities: Set<IncidentSeverity>;
    searchQuery: string;
}

interface ZoomState {
    level: number;
    center: [number, number];
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
    // Expose enum to template
    readonly IncidentSeverity = IncidentSeverity;

    // Core data
    allIncidents: Incident[] = [];
    filteredIncidents: Incident[] = [];
    selectedIncidents: Set<number> = new Set();

    // Pagination
    currentPage: number = 0;
    pageSize: number = 500;
    totalItems: number = 0;
    totalPages: number = 0;
    hasNextPage: boolean = false;
    hasPreviousPage: boolean = false;
    isLoadingMore: boolean = false;
    isInitialLoad: boolean = true;

    // Time-based loading
    private readonly ONE_DAY_MS = 24 * 60 * 60 * 1000;
    private readonly ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    private currentLoadEndTime: number = Date.now();
    private currentLoadStartTime: number = Date.now() - this.ONE_DAY_MS;
    private oldestLoadedTime: number = Date.now() - this.ONE_DAY_MS;
    private isLoadingOlderData: boolean = false;

    // Charts
    private overviewChart: echarts.ECharts | null = null;
    private detailChart: echarts.ECharts | null = null;
    private scatterChart: echarts.ECharts | null = null;

    // State management
    private currentState: ExplorationState;
    stateHistory: ExplorationState[] = [];
    historyIndex: number = -1;
    private maxHistorySize: number = 500;

    // Relationship graph
    private relationshipGraph: Map<number, Set<number>> = new Map();

    // Filter controls
    filterState: FilterState = {
        timeRange: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
        severities: new Set([IncidentSeverity.Critical, IncidentSeverity.Warning, IncidentSeverity.Info]),
        searchQuery: ''
    };

    // UI state
    showDetailPanel: boolean = false;
    showFilterPanel: boolean = true;
    showHistoryPanel: boolean = false;
    selectedIncidentDetails: Incident | null = null;
    relatedIncidents: Incident[] = [];

    // Performance tracking
    lastFilterTime: number = 0;

    // Subscriptions
    private subscriptions: Subscription = new Subscription();

    // Zoom configuration
    zoomLevel: number = 1;
    minZoom: number = 1;
    maxZoom: number = 30;

    constructor(private incidentService: IncidentService) {
        this.currentState = this.captureState();
    }

    ngOnInit(): void {
        this.loadIncidents();
        setTimeout(() => {
            this.initOverviewChart();
        }, 100);
        this.connectToRealTimeStream();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.incidentService.disconnectFromIncidentStream();

        if (this.overviewChart) this.overviewChart.dispose();
        if (this.detailChart) this.detailChart.dispose();
        if (this.scatterChart) this.scatterChart.dispose();
    }

    // DATA LOADING
    private loadIncidents(): void {
        // Load last 24h first
        this.loadIncidentsInTimeRange(this.currentLoadStartTime, this.currentLoadEndTime, 0, true);
    }

    private loadIncidentsInTimeRange(startTime: number, endTime: number, page: number, reset: boolean = false): void {
        if (this.isLoadingMore) return;

        this.isLoadingMore = true;

        this.subscriptions.add(
            this.incidentService.getIncidentsPaginated({
                page,
                size: this.pageSize,
                sortBy: 'startTime',
                sortDir: 'desc',
                startTime,
                endTime
            }).subscribe({
                next: (response: PaginatedResponse) => {
                    console.log(`Loaded incidents from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}:`, response);
                    if (reset) {
                        this.allIncidents = response.incidents;
                        this.isInitialLoad = false;
                    } else {
                        // Merge and sort by startTime descending
                        this.allIncidents = [...this.allIncidents, ...response.incidents]
                            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                    }

                    this.currentPage = response.currentPage;
                    this.totalItems = response.totalItems;
                    this.totalPages = response.totalPages;
                    this.hasNextPage = response.hasNext;
                    this.hasPreviousPage = response.hasPrevious;
                    this.isLoadingMore = false;

                    this.buildRelationshipGraph();
                    this.applyFilters();
                    this.updateAllVisualizations();
                },
                error: (error) => {
                    console.error('Error loading incidents:', error);
                    this.isLoadingMore = false;
                    this.isInitialLoad = false;
                }
            })
        );
    }

    private connectToRealTimeStream(): void {
        this.subscriptions.add(
            this.incidentService.connectToIncidentStream().subscribe({
                next: (incident) => {
                    this.allIncidents.unshift(incident);
                    this.updateRelationshipGraph(incident);
                    this.applyFilters();
                    this.updateAllVisualizations();
                },
                error: (error) => console.error('Stream error:', error)
            })
        );
    }

    // 1. OVERVIEW
    private initOverviewChart(): void {
        const chartDom = document.getElementById('overview-chart');
        if (!chartDom) return;

        this.overviewChart = echarts.init(chartDom);

        // Calculate the percentage for last 24h window
        const now = Date.now();
        const last24h = now - this.ONE_DAY_MS;
        const oneYearAgo = now - this.ONE_YEAR_MS;

        // Calculate start and end percentages for dataZoom (focused on last 24h)
        const totalRange = now - oneYearAgo;
        const last24hStart = ((last24h - oneYearAgo) / totalRange) * 100;
        const last24hEnd = 100;

        const option: echarts.EChartsOption = {
            title: { text: 'Incident Overview - Full Timeline', left: 'center' },
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
            grid: { left: '5%', right: '5%', bottom: '20%', top: '15%', containLabel: true },
            brush: {
                toolbox: ['rect', 'polygon', 'clear'],
                xAxisIndex: 0,
                brushStyle: {
                    borderWidth: 2,
                    color: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 0.8)'
                }
            },
            toolbox: {
                feature: {
                    brush: { type: ['rect', 'polygon', 'clear'] },
                    dataZoom: { yAxisIndex: 'none' },
                    restore: {},
                    saveAsImage: {}
                }
            },
            xAxis: { type: 'time' },
            yAxis: { type: 'value', name: 'Severity Score' },
            dataZoom: [
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    start: last24hStart,
                    end: last24hEnd,
                    height: 30,
                    bottom: 10,
                    minValueSpan: 3600 * 1000 // Minimum 1 hour span
                },
                { type: 'inside', xAxisIndex: 0 }
            ],
            series: []
        };

        this.overviewChart.setOption(option);
        this.overviewChart.on('brushSelected', (params: any) => this.handleBrushSelection(params));
        this.overviewChart.on('dataZoom', (params: any) => this.handleDataZoom(params));

        window.addEventListener('resize', () => this.overviewChart?.resize());
    }

    // 2. ZOOM
    zoomIn(): void {
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, this.maxZoom);
        this.applyZoom(true);
        this.saveState('Zoom In');
    }

    zoomOut(): void {
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, this.minZoom);
        this.applyZoom(true);
        this.saveState('Zoom Out');
    }

    resetZoom(): void {
        this.zoomLevel = 1;
        this.applyZoom(true);
        this.saveState('Reset Zoom');
    }

    private applyZoom(animated: boolean = true): void {
        if (!this.detailChart) return;

        const center = 50;
        const range = 100 / this.zoomLevel;
        const start = Math.max(0, center - range / 2);
        const end = Math.min(100, center + range / 2);

        this.detailChart.setOption({
            dataZoom: [{ type: 'inside', start, end, zoomOnMouseWheel: true, moveOnMouseMove: true }]
        }, { replaceMerge: ['dataZoom'] });
    }

    private handleDataZoom(params: any): void {
        if (params.batch && params.batch.length > 0) {
            const zoom = params.batch[0];
            this.filterState.timeRange = [
                zoom.startValue || this.filterState.timeRange[0],
                zoom.endValue || this.filterState.timeRange[1]
            ];
            this.applyFilters();
            this.updateDetailChart();
        }
    }

    // 3. FILTER
    applyFilters(): void {
        const startTime = performance.now();

        this.filteredIncidents = this.allIncidents.filter(incident => {
            const incidentTime = new Date(incident.startTime).getTime();
            if (incidentTime < this.filterState.timeRange[0] || incidentTime > this.filterState.timeRange[1]) return false;
            if (!this.filterState.severities.has(incident.severity)) return false;
            if (this.filterState.searchQuery) {
                const query = this.filterState.searchQuery.toLowerCase();
                if (!incident.message.toLowerCase().includes(query) && !incident.rule.name.toLowerCase().includes(query)) return false;
            }
            return true;
        });

        this.lastFilterTime = performance.now() - startTime;
        this.updateAllVisualizations();
    }

    toggleSeverity(severity: IncidentSeverity): void {
        if (this.filterState.severities.has(severity)) {
            this.filterState.severities.delete(severity);
        } else {
            this.filterState.severities.add(severity);
        }
        this.applyFilters();
        this.saveState(`Toggle ${severity}`);
    }

    updateSearchQuery(query: string): void {
        this.filterState.searchQuery = query;
        this.applyFilters();
        this.saveState('Search');
    }

    updateTimeRange(start: number, end: number): void {
        this.filterState.timeRange = [start, end];
        this.applyFilters();
        this.saveState('Time Range Update');
    }

    clearFilters(): void {
        this.filterState = {
            timeRange: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
            severities: new Set([IncidentSeverity.Critical, IncidentSeverity.Warning, IncidentSeverity.Info]),
            searchQuery: ''
        };
        this.applyFilters();
        this.saveState('Clear Filters');
    }

    // 4. DETAILS ON DEMAND
    handleIncidentClick(params: any): void {
        if (!params.data || !params.data.incident) return;

        const incident = params.data.incident as Incident;
        this.selectedIncidentDetails = incident;
        this.selectedIncidents.add(incident.id);
        this.showDetailPanel = true;

        this.findRelatedIncidents(incident);
        this.saveState(`Select Incident ${incident.id}`);
    }

    closeDetailPanel(): void {
        this.showDetailPanel = false;
        this.selectedIncidentDetails = null;
        this.selectedIncidents.clear();
        this.updateAllVisualizations();
    }

    // 5. RELATE
    private buildRelationshipGraph(): void {
        this.relationshipGraph.clear();

        for (const incident of this.allIncidents) {
            this.relationshipGraph.set(incident.id, new Set());
        }

        for (let i = 0; i < this.allIncidents.length; i++) {
            for (let j = i + 1; j < this.allIncidents.length; j++) {
                const inc1 = this.allIncidents[i];
                const inc2 = this.allIncidents[j];

                if (this.areRelated(inc1, inc2)) {
                    this.relationshipGraph.get(inc1.id)?.add(inc2.id);
                    this.relationshipGraph.get(inc2.id)?.add(inc1.id);
                }
            }
        }
    }

    private updateRelationshipGraph(incident: Incident): void {
        this.relationshipGraph.set(incident.id, new Set());

        for (const existingIncident of this.allIncidents) {
            if (existingIncident.id !== incident.id && this.areRelated(incident, existingIncident)) {
                this.relationshipGraph.get(incident.id)?.add(existingIncident.id);
                this.relationshipGraph.get(existingIncident.id)?.add(incident.id);
            }
        }
    }

    private areRelated(inc1: Incident, inc2: Incident): boolean {
        if (inc1.rule.id === inc2.rule.id) return true;

        if (inc1.severity === inc2.severity) {
            const timeDiff = Math.abs(new Date(inc1.startTime).getTime() - new Date(inc2.startTime).getTime());
            if (timeDiff < 5 * 60 * 1000) return true;
        }

        const similarity = this.calculateSimilarity(inc1.message, inc2.message);
        if (similarity > 0.7) return true;

        return false;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    private findRelatedIncidents(incident: Incident): void {
        const relatedIds = this.relationshipGraph.get(incident.id);
        if (!relatedIds) {
            this.relatedIncidents = [];
            return;
        }

        this.relatedIncidents = Array.from(relatedIds)
            .map(id => this.allIncidents.find(i => i.id === id))
            .filter(inc => inc !== undefined) as Incident[];
    }

    showSimilarIncidents(incident: Incident): void {
        this.findRelatedIncidents(incident);
        this.selectedIncidents = new Set(this.relatedIncidents.map(i => i.id));
        this.updateAllVisualizations();
    }

    // 6. HISTORY
    private captureState(): ExplorationState {
        return {
            timestamp: Date.now(),
            filters: {
                timeRange: [...this.filterState.timeRange] as [number, number],
                severities: new Set(this.filterState.severities),
                searchQuery: this.filterState.searchQuery
            },
            zoom: {
                level: this.zoomLevel,
                center: [0, 0]
            },
            selection: Array.from(this.selectedIncidents),
            description: ''
        };
    }

    private saveState(description: string): void {
        this.stateHistory = this.stateHistory.slice(0, this.historyIndex + 1);

        const state = this.captureState();
        state.description = description;

        this.stateHistory.push(state);
        this.historyIndex++;

        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
            this.historyIndex--;
        }

        this.currentState = state;
    }

    undo(): void {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.stateHistory[this.historyIndex]);
        }
    }

    redo(): void {
        if (this.historyIndex < this.stateHistory.length - 1) {
            this.historyIndex++;
            this.restoreState(this.stateHistory[this.historyIndex]);
        }
    }

    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    canRedo(): boolean {
        return this.historyIndex < this.stateHistory.length - 1;
    }

    private restoreState(state: ExplorationState): void {
        this.filterState = {
            timeRange: [...state.filters.timeRange] as [number, number],
            severities: new Set(state.filters.severities),
            searchQuery: state.filters.searchQuery
        };

        this.zoomLevel = state.zoom.level;
        this.selectedIncidents = new Set(state.selection);

        this.applyFilters();
        this.applyZoom(false);
        this.currentState = state;
    }

    toggleHistoryPanel(): void {
        this.showHistoryPanel = !this.showHistoryPanel;
    }

    jumpToState(index: number): void {
        if (index >= 0 && index < this.stateHistory.length) {
            this.historyIndex = index;
            this.restoreState(this.stateHistory[index]);
        }
    }

    // 7. EXTRACT
    exportFilteredIncidents(): void {
        const data = this.filteredIncidents.map(incident => ({
            id: incident.id,
            message: incident.message,
            severity: incident.severity,
            rule: incident.rule.name,
            startTime: incident.startTime,
            createdAt: incident.createdAt
        }));

        this.downloadJSON(data, 'filtered-incidents.json');
    }

    exportCurrentQuery(): void {
        const query = {
            timeRange: this.filterState.timeRange,
            severities: Array.from(this.filterState.severities),
            searchQuery: this.filterState.searchQuery,
            zoomLevel: this.zoomLevel,
            timestamp: new Date().toISOString()
        };

        this.downloadJSON(query, 'query-config.json');
    }

    exportVisualization(): void {
        if (this.overviewChart) {
            const url = this.overviewChart.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: '#fff'
            });

            this.downloadImage(url, 'incident-visualization.png');
        }
    }

    exportExplorationHistory(): void {
        const history = this.stateHistory.map((state, index) => ({
            step: index + 1,
            description: state.description,
            timestamp: new Date(state.timestamp).toISOString(),
            filters: {
                timeRange: state.filters.timeRange,
                severities: Array.from(state.filters.severities),
                searchQuery: state.filters.searchQuery
            },
            zoomLevel: state.zoom.level,
            selectedCount: state.selection.length
        }));

        this.downloadJSON(history, 'exploration-history.json');
    }

    private downloadJSON(data: any, filename: string): void {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    private downloadImage(dataUrl: string, filename: string): void {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
    }

    // VISUALIZATION UPDATES
    private updateAllVisualizations(): void {
        this.updateOverviewChart();
        this.updateDetailChart();
        this.updateScatterChart();
    }

    private updateOverviewChart(): void {
        if (!this.overviewChart) return;

        const severityScore = {
            [IncidentSeverity.Info]: 1,
            [IncidentSeverity.Warning]: 2,
            [IncidentSeverity.Critical]: 3
        };

        const series = [
            {
                name: 'Critical',
                type: 'scatter',
                data: this.allIncidents
                    .filter(i => i.severity === IncidentSeverity.Critical)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#dc2626' : '#ef4444' }
                    })),
                symbolSize: 8
            },
            {
                name: 'Warning',
                type: 'scatter',
                data: this.allIncidents
                    .filter(i => i.severity === IncidentSeverity.Warning)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#d97706' : '#f59e0b' }
                    })),
                symbolSize: 6
            },
            {
                name: 'Info',
                type: 'scatter',
                data: this.allIncidents
                    .filter(i => i.severity === IncidentSeverity.Info)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#2563eb' : '#3b82f6' }
                    })),
                symbolSize: 4
            }
        ];

        this.overviewChart.setOption({ series }, { replaceMerge: ['series'] });
    }

    private updateDetailChart(): void {
        if (!this.detailChart) return;

        const severityScore = {
            [IncidentSeverity.Info]: 1,
            [IncidentSeverity.Warning]: 2,
            [IncidentSeverity.Critical]: 3
        };

        const series = [
            {
                name: 'Critical',
                type: 'scatter',
                data: this.filteredIncidents
                    .filter(i => i.severity === IncidentSeverity.Critical)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#dc2626' : '#ef4444' }
                    })),
                symbolSize: 12
            },
            {
                name: 'Warning',
                type: 'scatter',
                data: this.filteredIncidents
                    .filter(i => i.severity === IncidentSeverity.Warning)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#d97706' : '#f59e0b' }
                    })),
                symbolSize: 10
            },
            {
                name: 'Info',
                type: 'scatter',
                data: this.filteredIncidents
                    .filter(i => i.severity === IncidentSeverity.Info)
                    .map(i => ({
                        value: [new Date(i.startTime).getTime(), severityScore[i.severity]],
                        incident: i,
                        itemStyle: { color: this.selectedIncidents.has(i.id) ? '#2563eb' : '#3b82f6' }
                    })),
                symbolSize: 8
            }
        ];

        this.detailChart.setOption({ series }, { replaceMerge: ['series'] });
    }

    private updateScatterChart(): void {
        if (!this.scatterChart) return;

        const series = [
            {
                name: 'Incidents',
                type: 'scatter',
                data: this.filteredIncidents.map(i => ({
                    value: [new Date(i.startTime).getTime(), i.severity],
                    incident: i,
                    itemStyle: {
                        color: i.severity === IncidentSeverity.Critical ? '#ef4444' :
                            i.severity === IncidentSeverity.Warning ? '#f59e0b' : '#3b82f6'
                    }
                })),
                symbolSize: (data: any) => this.selectedIncidents.has(data.incident.id) ? 15 : 8
            }
        ];

        this.scatterChart.setOption({ series }, { replaceMerge: ['series'] });
    }

    private handleBrushSelection(params: any): void {
        if (!params.batch || params.batch.length === 0) return;
        this.saveState('Brush Selection');
    }

    // UTILITY METHODS
    getSeverityColor(severity: IncidentSeverity): string {
        switch (severity) {
            case IncidentSeverity.Critical: return 'text-red-600';
            case IncidentSeverity.Warning: return 'text-yellow-600';
            case IncidentSeverity.Info: return 'text-blue-600';
            default: return 'text-gray-600';
        }
    }

    getSeverityBgColor(severity: IncidentSeverity): string {
        switch (severity) {
            case IncidentSeverity.Critical: return 'bg-red-100';
            case IncidentSeverity.Warning: return 'bg-yellow-100';
            case IncidentSeverity.Info: return 'bg-blue-100';
            default: return 'bg-gray-100';
        }
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleString();
    }

    get filteredCount(): number {
        return this.filteredIncidents.length;
    }

    get totalCount(): number {
        return this.allIncidents.length;
    }

    get Date() {
        return Date;
    }
}
