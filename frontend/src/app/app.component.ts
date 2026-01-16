import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import '@greycat/web';
import { Incident, IncidentSeverity } from './models';
import { initFlowbite } from 'flowbite';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Incident Dashboard';
  searchTerm = '';
  selectedSeverity = '';
  private pollingInterval: any = null;
  private greycat: any = null;
  private isPolling = false;
  private lastUpdateTime = new Date();

  // Expose enums to template
  IncidentSeverity = IncidentSeverity;

  incidents: Incident[] = [];

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

  constructor(private readonly http: HttpClient) { }

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

  getStatusBadgeClass(endTime?: Date): string {
    return endTime ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getIncidentCountBySeverity(severity: IncidentSeverity): number {
    return this.incidents.filter(incident => incident.severity === severity).length;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedSeverity = '';
  }

  // Connection status for polling
  isConnected(): boolean {
    return this.greycat !== null && this.isPolling;
  }

  // Manual refresh method
  refreshData(): void {
    this.fetchIncidentsData();
  }

  // Get last update time
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  async ngOnInit(): Promise<void> {
    // Initialize Flowbite
    initFlowbite();

    try {
      // Check if GreyCat is available
      if (typeof gc !== 'undefined' && (gc as any).sdk) {
        // Initialize GreyCat
        this.greycat = await (gc as any).sdk.init({ timezone: 'Europe/Luxembourg' });
        if ((gc as any).core && (gc as any).core.TimeZone) {
          this.greycat.timezone = (gc as any).core.TimeZone['Europe/Luxembourg'];
        }

        console.log('GreyCat initialized successfully');

        // Start polling for incidents data
        this.startPolling();

        // Initial data fetch
        await this.fetchIncidentsData();
      } else {
        console.warn('GreyCat SDK not available');
      }

    } catch (error) {
      console.error('Error initializing GreyCat:', error);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.isPolling = true;
    console.log('Starting polling every 200ms...');

    this.pollingInterval = setInterval(() => {
      this.fetchIncidentsData();
    }, 200); // Poll every 200ms
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Polling stopped');
  }

  private async fetchIncidentsDataFromGreycat(): Promise<void> {
    if (!this.greycat) {
      return;
    }

    try {
      // Spawn the task to get incidents
      const task = await this.greycat.spawn('web-api::incidents');
      const result = await this.greycat.await(task);

      // Update last update time
      this.lastUpdateTime = new Date();

      // Process the incidents data
      this.processIncidentsData(result);

    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  }
  private async fetchIncidentsData(): Promise<void> {
    try {
      console.log('Fetching incidents from REST API...', environment.apiUrl);
      this.http.get<Incident[]>(`${environment.apiUrl}/incidents`).subscribe(result => {
        // Update last update time
        this.lastUpdateTime = new Date();

        // Process the incidents data
        this.processIncidentsData(result);
      });
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  }
  private processIncidentsData(result: any): void {
    if (!result) {
      return;
    }

    // Minimal handling - assume result is already in correct Incident format
    if (Array.isArray(result)) {
      this.incidents = result.map(incident => ({
        ...incident,
        start_time: new Date(incident.start_time),
        end_time: new Date(incident.end_time)
      }));
    } else if (result && typeof result === 'object') {
      this.incidents = [{
        ...result,
        start_time: new Date(result.start_time),
        end_time: new Date(result.end_time)
      }];
    }

    console.log(`Updated incidents: ${this.incidents.length} items`);
  }
}

