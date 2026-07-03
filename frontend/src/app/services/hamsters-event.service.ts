import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class HamstersEventService {
    private csvLog: any[] = [];

    emit(event: any) {
        // JSON emit to backend
        fetch('http://localhost:8082/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });

        // CSV logging
        this.logAsCsv(event);
    }

    private logAsCsv(event: any) {
        this.csvLog.push(event);
        localStorage.setItem('hamsters_event_log', JSON.stringify(this.csvLog));
    }

    getCsvLog() {
        return localStorage.getItem('hamsters_event_log') || '';
    }
}
