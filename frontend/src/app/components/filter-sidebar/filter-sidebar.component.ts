import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterHistoryControlsComponent } from '../filter-history-controls/filter-history-controls.component';
import { HistoryStore } from '../../stores/filter-history.store';
import { FilterStore } from '../../stores/filter.store';
import { FilterConfig } from '../../models/filter-config.model';
import { RuleService } from '../../services/rule.service';
import { Rule } from '../../models/rule.model';
import { HamstersEvent } from '../../decorators/hamsters.decorator';

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

    availableRules = signal<Rule[]>([]);
    isRuleDropdownOpen = signal<boolean>(false);
    dateRangeError = signal<string | null>(null);

    constructor(
        private historyStore: HistoryStore,
        protected filterStore: FilterStore,
        private ruleService: RuleService
    ) { }

    ngOnInit(): void {
        // Save initial state to history
        this.historyStore.saveState(this.filters);

        // Load available rules
        this.loadRules();
    }

    loadRules(): void {
        this.ruleService.getAllRules().subscribe({
            next: (rules) => {
                this.availableRules.set(rules);

                // If no rules are currently selected, select all by default
                if (this.filters.selectedRules.length === 0 && rules.length > 0) {
                    const allRuleNames = rules.map(rule => rule.name);
                    this.filterStore.updateFilters({ selectedRules: allRuleNames });
                    this.historyStore.saveState(this.filters);
                }
            },
            error: (err) => {
                console.error('Failed to load rules:', err);
            }
        });
    }

    getStartDateTimeString(): string {
        if (isNaN(this.filters.startDate.getTime())) return '';
        const date = this.filters.startDate;
        // Format: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    getEndDateTimeString(): string {
        if (isNaN(this.filters.endDate.getTime())) return '';
        const date = this.filters.endDate;
        // Format: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    getMaxStartDateTime(): string {
        if (isNaN(this.filters.endDate.getTime())) return '';
        const endDate = this.filters.endDate;
        const maxDate = new Date(endDate.getTime() - 60000); // 1 minute before end
        const year = maxDate.getFullYear();
        const month = String(maxDate.getMonth() + 1).padStart(2, '0');
        const day = String(maxDate.getDate()).padStart(2, '0');
        const hours = String(maxDate.getHours()).padStart(2, '0');
        const minutes = String(maxDate.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    getMinEndDateTime(): string {
        if (isNaN(this.filters.startDate.getTime())) return '';
        const startDate = this.filters.startDate;
        const minDate = new Date(startDate.getTime() + 60000); // 1 minute after start
        const year = minDate.getFullYear();
        const month = String(minDate.getMonth() + 1).padStart(2, '0');
        const day = String(minDate.getDate()).padStart(2, '0');
        const hours = String(minDate.getHours()).padStart(2, '0');
        const minutes = String(minDate.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    onStartDateChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const newDate = new Date(input.value);
        const endDate = this.filters.endDate;

        if (newDate > endDate) {
            this.dateRangeError.set('Start date must be before end date');
            return;
        }

        this.dateRangeError.set(null);
        this.filterStore.updateFilters({ startDate: newDate });
        this.historyStore.saveState(this.filters);
    }

    onEndDateChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const newDate = new Date(input.value);
        const startDate = this.filters.startDate;

        if (newDate < startDate) {
            this.dateRangeError.set('End date must be after start date');
            return;
        }

        this.dateRangeError.set(null);
        this.filterStore.updateFilters({ endDate: newDate });
        this.historyStore.saveState(this.filters);
    }

    onLiveModeChange(): void {
        const liveMode = this.filters.liveMode;
        console.log('[FilterSidebar] Live mode changed to:', liveMode);

        if (liveMode) {
            // When enabling live mode, set end date to now
            this.filterStore.updateFilters({
                liveMode: true,
                endDate: new Date()
            });
        } else {
            this.filterStore.updateFilters({ liveMode: false });
        }

        this.historyStore.saveState(this.filters);
    }

    toggleRuleDropdown(): void {
        this.isRuleDropdownOpen.update(v => !v);
    }

    isRuleSelected(ruleName: string): boolean {
        return this.filters.selectedRules.includes(ruleName);
    }

    onRuleToggle(ruleName: string): void {
        const currentRules = [...this.filters.selectedRules];
        const index = currentRules.indexOf(ruleName);

        if (index >= 0) {
            currentRules.splice(index, 1);
        } else {
            currentRules.push(ruleName);
        }

        this.filterStore.updateFilters({ selectedRules: currentRules });
        this.historyStore.saveState(this.filters);
    }

    clearRuleSelection(): void {
        this.filterStore.updateFilters({ selectedRules: [] });
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

    @HamstersEvent('Set incident Severity')
    onSeverityChange(): void {
        this.onFilterChange();
    }

    onFilterChange(): void {
        // Automatically save to history when filters change
        this.historyStore.saveState(this.filters);
        this.filterStore.updateFilters(this.filters);
    }

    onReset(): void {
        this.filterStore.resetFilters();
        this.dateRangeError.set(null);
        this.isRuleDropdownOpen.set(false);
        this.historyStore.saveState(this.filters);

        // Reload rules to re-select all by default
        this.loadRules();
    }
}
