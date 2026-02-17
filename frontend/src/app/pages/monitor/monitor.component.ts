import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { initFlowbite } from 'flowbite';

import { Incident, IncidentSeverity } from '../../models';
import { Rule } from '../../models/rule.model';
import { IncidentService } from '../../services/incident.service';
import { RuleFormComponent } from '../../components/rule-form/rule-form.component';
import { IncidentsChartComponent } from '../../components/incidents-chart/incidents-chart.component';

@Component({
    selector: 'app-monitor',
    standalone: true,
    imports: [CommonModule, FormsModule, RuleFormComponent, IncidentsChartComponent],
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})
export class MonitorComponent implements OnInit, OnDestroy {
    title = 'Incident Dashboard';
    searchTerm = '';
    selectedSeverity = '';
    startDate = '';
    startTime = '';
    endDate = '';
    endTime = '';
    private sseSubscription: Subscription | null = null;
    private lastUpdateTime = new Date();

    // Expose enums to template
    IncidentSeverity = IncidentSeverity;
    Math = Math;

    incidents: Incident[] = [];

    // Rule form state
    showRulePanel = false;
    editingRule: Rule | null = null;

    // Pagination state
    currentPage = 1;
    pageSize = 10;

    // Expanded incidents state
    expandedIncidentIds = new Set<number>();

    get filteredIncidents(): Incident[] {
        let filtered = this.incidents;

        // Filter by search term
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(incident =>
                incident.rule.name.toLowerCase().includes(searchLower) ||
                incident.message.toLowerCase().includes(searchLower)
            );
        }

        // Filter by severity
        if (this.selectedSeverity) {
            filtered = filtered.filter(incident => incident.severity === this.selectedSeverity);
        }

        // Filter by start date/time range
        if (this.startDate) {
            const timeStr = this.startTime || '00:00:00';
            const startDateTimeStr = `${this.startDate}T${timeStr}`;
            const startDateTime = new Date(startDateTimeStr);
            console.log('[Component] Start datetime string:', startDateTimeStr, 'Parsed:', startDateTime, 'Valid:', !isNaN(startDateTime.getTime()));

            if (!isNaN(startDateTime.getTime())) {
                const beforeFilter = filtered.length;
                filtered = filtered.filter(incident => {
                    const incidentDate = incident.startTime instanceof Date ? incident.startTime : new Date(incident.startTime);
                    const result = incidentDate >= startDateTime;
                    if (!result) {
                        console.log('[Component] Filtered out incident:', incident.id, 'Date:', incidentDate, 'vs Filter:', startDateTime);
                    }
                    return result;
                });
            }
        }

        // Filter by end date/time range
        if (this.endDate) {
            const timeStr = this.endTime || '23:59:59';
            const endDateTimeStr = `${this.endDate}T${timeStr}`;
            const endDateTime = new Date(endDateTimeStr);

            if (!isNaN(endDateTime.getTime())) {
                const beforeFilter = filtered.length;
                filtered = filtered.filter(incident => {
                    const incidentDate = incident.startTime instanceof Date ? incident.startTime : new Date(incident.startTime);
                    const result = incidentDate <= endDateTime;
                    if (!result) {
                        console.log('[Component] Filtered out incident:', incident.id, 'Date:', incidentDate, 'vs Filter:', endDateTime);
                    }
                    return result;
                });
            }
        }

        // Sort by severity priority (critical > warning > info) and then by start time
        return filtered.sort((a, b) => {
            const severityOrder = {
                [IncidentSeverity.Critical]: 0,
                [IncidentSeverity.Warning]: 1,
                [IncidentSeverity.Info]: 2
            };
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];

            if (severityDiff !== 0) {
                return severityDiff;
            }

            return b.startTime.getTime() - a.startTime.getTime();
        });
    }

    get paginatedIncidents(): Incident[] {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.filteredIncidents.slice(startIndex, endIndex);
    }

    get totalPages(): number {
        return Math.ceil(this.filteredIncidents.length / this.pageSize);
    }

    get pageNumbers(): number[] {
        const pages: number[] = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    constructor(private readonly incidentService: IncidentService) { }

    getSeverityClass(severity: IncidentSeverity): string {
        switch (severity) {
            case IncidentSeverity.Critical: return 'severity-critical';
            case IncidentSeverity.Warning: return 'severity-warning';
            case IncidentSeverity.Info: return 'severity-info';
            default: return '';
        }
    }

    getSeverityBadgeClass(severity: IncidentSeverity): string {
        switch (severity) {
            case IncidentSeverity.Critical: return 'bg-red-100 text-red-800';
            case IncidentSeverity.Warning: return 'bg-orange-100 text-orange-800';
            case IncidentSeverity.Info: return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getIncidentCountBySeverity(severity: IncidentSeverity): number {
        return this.incidents.filter(incident => incident.severity === severity).length;
    }

    clearFilters(): void {
        this.searchTerm = '';
        this.selectedSeverity = '';
        this.startDate = '';
        this.startTime = '';
        this.endDate = '';
        this.endTime = '';
        this.currentPage = 1; // Reset to first page when clearing filters
    }

    onFilterChange(): void {
        console.log('[Component] Filter changed - resetting to page 1');
        // Reset to first page when filters change
        this.currentPage = 1;
    }

    // Pagination methods
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    // Rule panel methods
    toggleRulePanel(): void {
        this.showRulePanel = !this.showRulePanel;
        if (!this.showRulePanel) {
            this.editingRule = null;
        }
    }

    onRulePanelClose(): void {
        this.showRulePanel = false;
        this.editingRule = null;
    }

    onRuleCreated(): void {
        // Optionally refresh incidents or show a notification
        console.log('[Component] Rule created, you may want to refresh data');
    }

    onRuleUpdated(): void {
        // Refresh incidents to show updated rule information
        console.log('[Component] Rule updated, refreshing incidents');
        this.loadInitialIncidents();
    }

    onRuleDeleted(): void {
        // Refresh incidents after rule deletion
        console.log('[Component] Rule deleted, refreshing incidents');
        this.loadInitialIncidents();
        this.showRulePanel = false;
        this.editingRule = null;
    }

    // Open rule form for editing
    openRuleForEdit(rule: Rule): void {
        this.editingRule = rule;
        this.showRulePanel = true;
    }

    // Connection status for SSE
    isConnected(): boolean {
        return this.incidentService.isConnected();
    }

    // Manual refresh method
    refreshData(): void {
        this.loadInitialIncidents();
    }

    // Get last update time
    getLastUpdateTime(): Date {
        return this.lastUpdateTime;
    }

    // Toggle incident expansion
    toggleIncidentExpansion(incidentId: number): void {
        if (this.expandedIncidentIds.has(incidentId)) {
            this.expandedIncidentIds.delete(incidentId);
        } else {
            this.expandedIncidentIds.add(incidentId);
        }
    }

    // Check if incident is expanded
    isIncidentExpanded(incidentId: number): boolean {
        return this.expandedIncidentIds.has(incidentId);
    }

    async ngOnInit(): Promise<void> {
        // Initialize Flowbite
        initFlowbite();

        // Load initial incidents
        this.loadInitialIncidents();

        // Connect to SSE stream for real-time updates
        this.connectToSseStream();
    }

    ngOnDestroy(): void {
        // Disconnect from SSE stream
        if (this.sseSubscription) {
            this.sseSubscription.unsubscribe();
        }
        this.incidentService.disconnectFromIncidentStream();
    }

    private loadInitialIncidents(): void {
        this.incidentService.getAllIncidents().subscribe({
            next: (incidents) => {
                this.incidents = incidents;
                this.lastUpdateTime = new Date();
                console.log(`[Component] Loaded ${incidents.length} incidents`);
            },
            error: (error) => {
                console.error('[Component] Error loading incidents:', error);
            }
        });
    }

    private connectToSseStream(): void {
        this.sseSubscription = this.incidentService.connectToIncidentStream().subscribe({
            next: (incident) => {
                console.log('[Component] New incident received via SSE:', incident);

                // Check if incident already exists (by ID)
                const existingIndex = this.incidents.findIndex(i => i.id === incident.id);

                if (existingIndex >= 0) {
                    // Update existing incident
                    this.incidents[existingIndex] = incident;
                    console.log(`[Component] Updated incident ${incident.id}`);
                } else {
                    // Add new incident
                    this.incidents.push(incident);
                    console.log(`[Component] Added new incident ${incident.id}`);
                }

                this.lastUpdateTime = new Date();
            },
            error: (error) => {
                console.error('[Component] SSE stream error:', error);
            }
        });
    }
}
