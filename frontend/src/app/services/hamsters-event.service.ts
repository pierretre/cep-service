import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class HamstersEventService {

    emit(event: any) {
        fetch('http://localhost:8082/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    }

}
