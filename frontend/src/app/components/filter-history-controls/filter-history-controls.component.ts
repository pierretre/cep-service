import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterHistoryStore } from '../../stores/filter-history.store';

@Component({
    selector: 'app-filter-history-controls',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './filter-history-controls.component.html',
    styleUrls: ['./filter-history-controls.component.css']
})
export class FilterHistoryControlsComponent {
    @Output() back = new EventEmitter<void>();
    @Output() forward = new EventEmitter<void>();

    constructor(private filterStore: FilterHistoryStore) { }

    // Use computed signals from store
    get canGoBack() {
        return this.filterStore.canGoBack();
    }

    get canGoForward() {
        return this.filterStore.canGoForward();
    }

    onBack() {
        if (this.canGoBack) {
            this.back.emit();
        }
    }

    onForward() {
        if (this.canGoForward) {
            this.forward.emit();
        }
    }
}
