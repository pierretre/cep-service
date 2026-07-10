import { Injectable } from '@angular/core';

export interface UIEvent {
    time: string;
    name: string;
    caseid: string | null;
    context?: any;
}

@Injectable({
    providedIn: 'root'
})
export class HamstersEventService {
    private csvLog: UIEvent[] = [];

    emit(event: UIEvent) {
        // JSON emit to backend
        fetch('http://localhost:8082/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    }
}
