import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import '@greycat/web';
import { Incident, IncidentSeverity } from './models';
import { initFlowbite } from 'flowbite';
import { IncidentService } from './services/incident.service';
import { Subscription } from 'rxjs';

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
  private sseSubscription: Subscription | null = null;
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
        console.log(`Loaded ${incidents.length} incidents`);
      },
      error: (error) => {
        console.error('Error loading incidents:', error);
      }
    });
  }

  private connectToSseStream(): void {
    this.sseSubscription = this.incidentService.connectToIncidentStream().subscribe({
      next: (incident) => {
        console.log('New incident received via SSE:', incident);

        // Check if incident already exists (by ID)
        const existingIndex = this.incidents.findIndex(i => i.id === incident.id);

        if (existingIndex >= 0) {
          // Update existing incident
          this.incidents[existingIndex] = incident;
          console.log(`Updated incident ${incident.id}`);
        } else {
          // Add new incident
          this.incidents.push(incident);
          console.log(`Added new incident ${incident.id}`);
        }

        this.lastUpdateTime = new Date();
      },
      error: (error) => {
        console.error('SSE stream error:', error);
      }
    });
  }
}

