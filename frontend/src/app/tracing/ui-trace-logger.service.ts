import { Injectable } from '@angular/core';

export interface VisibilityTraceEvent {
    tag: string;
    id: string | null;
    classes: string[];
    text: string;
    ratio: number;
    timestamp: string;
}

export interface InteractionTraceEvent {
    type: string;
    tag: string;
    id: string | null;
    classes: string[];
    text: string;
    x: number | null;
    y: number | null;
    key: string | null;
    value: string | null;
    scrollX: number | null;
    scrollY: number | null;
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class UiTraceLoggerService {
    logVisibility(event: VisibilityTraceEvent): void {
        console.log('[UI][visible]', event);
    }

    logInteraction(event: InteractionTraceEvent): void {
        console.log('[UI][interaction]', event);
    }
}
