import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterHistoryControlsComponent } from '../filter-history-controls/filter-history-controls.component';
import { FilterHistoryStore, FilterConfig } from '../../stores/filter-history.service';
import { FilterStore } from '../../stores/filter.store';

@Component({
    selector: 'app-filter-sidebar',
    standalone: true,
    imports: [CommonModule, FormsModule, FilterHistoryControlsComponent],
    templateUrl: './filter-sidebar.component.html',
    styleUrls: ['./filter-sidebar.component.css']
})
export class FilterSidebarComponent implements OnInit {
    protected get filters(): FilterConfig {
        return this.filterStore.filters();
    }

    constructor(
        private historyStore: FilterHistoryStore,
        protected filterStore: FilterStore
    ) { }

    ngOnInit(): void {
        // Save initial state to history
        this.historyStore.saveState(this.filters);
    }

    onBack(): void {
        const previousState = this.historyStore.goBack();
        if (previousState) {
            this.filterStore.updateFilters(previousState);
        }
    }

    onForward(): void {
        const nextState = this.historyStore.goForward();
        if (nextState) {
            this.filterStore.updateFilters(nextState);
        }
    }

    onFilterChange(): void {
        // Automatically save to history when filters change
        this.historyStore.saveState(this.filters);
    }

    updateSeverity(level: keyof FilterConfig['severityLevels'], value: boolean): void {
        this.filterStore.updateSeverityLevels({ [level]: value });
        this.onFilterChange();
    }

    updateDateRange(startDate: string, endDate: string): void {
        this.filterStore.updateFilters({ startDate, endDate });
        this.onFilterChange();
    }
}
