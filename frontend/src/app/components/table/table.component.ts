import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
}

export interface TableRow {
    [key: string]: any;
}

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th *ngFor="let column of columns"
                scope="col"
                class="px-6 py-3"
                [style.width]="column.width">
              <div class="flex items-center">
                {{ column.label }}
                <button *ngIf="column.sortable"
                        (click)="onSort(column.key)"
                        class="ml-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                  </svg>
                </button>
              </div>
            </th>
            <th *ngIf="showActions" scope="col" class="px-6 py-3">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of data; let i = index"
              class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <td *ngFor="let column of columns"
                class="px-6 py-4"
                [class.font-medium]="column.key === primaryKey"
                [class.text-gray-900]="column.key === primaryKey"
                [class.dark:text-white]="column.key === primaryKey">
              {{ getColumnValue(row, column.key) }}
            </td>
            <td *ngIf="showActions" class="px-6 py-4 text-right">
              <ng-content select="[slot=actions]" [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ row: row, index: i }"></ng-content>
            </td>
          </tr>
          <tr *ngIf="data.length === 0">
            <td [attr.colspan]="columns.length + (showActions ? 1 : 0)"
                class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
              {{ emptyMessage }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class TableComponent {
    @Input() columns: TableColumn[] = [];
    @Input() data: TableRow[] = [];
    @Input() primaryKey: string = 'id';
    @Input() showActions: boolean = false;
    @Input() emptyMessage: string = 'No data available';
    @Output() onSortChange = new EventEmitter<{ column: string, direction: 'asc' | 'desc' }>();
    @Output() onRowClick = new EventEmitter<{ row: TableRow, index: number }>();

    currentSort: { column: string, direction: 'asc' | 'desc' } | null = null;
    actionsTemplate: any;

    onSort(columnKey: string): void {
        let direction: 'asc' | 'desc' = 'asc';

        if (this.currentSort && this.currentSort.column === columnKey) {
            direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        }

        this.currentSort = { column: columnKey, direction };
        this.onSortChange.emit(this.currentSort);
    }

    getColumnValue(row: TableRow, key: string): any {
        return row[key] || '';
    }
}
