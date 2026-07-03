import { Injectable, inject } from '@angular/core';
import { HamstersEventService } from './hamsters-event.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalClickTrackerService {
    private eventService = inject(HamstersEventService);

    /**
     * Initializes global click tracking. 
     * Should be called in app.config.ts or app.component.ts
     */
    init() {
        window.addEventListener('click', (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const element = target.closest('button, a, input, select, textarea') as HTMLElement;

            if (element) {
                this.trackEvent('global_click', element);
            }
        }, true);

        window.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
                this.trackEvent('global_change', target);
            }
        }, true);
    }

    private trackEvent(eventName: string, element: HTMLElement) {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const context = {
            tagName: element.tagName,
            text: element.innerText?.trim() || (inputElement && inputElement.value) || '',
            timestamp: new Date().toISOString()
        };

        this.eventService.emit({
            name: eventName,
            context: context
        });
    }
}
