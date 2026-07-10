import { Injectable, inject } from '@angular/core';
import { HamstersEventService } from './hamsters-event.service';
import { SessionService } from './session.service';
import { describeElement } from '../decorators/element-context.util';

// Elements whose interaction already fires an @HamstersEvent-decorated
// handler carry this attribute, so the generic listeners below don't log
// the same user action twice.
const DECORATOR_TRACKED_SELECTOR = '[data-hamsters-tracked]';

@Injectable({
    providedIn: 'root'
})
export class GlobalClickTrackerService {

    constructor(private eventService: HamstersEventService, private sessionService: SessionService) { }

    /**
     * Initializes global click tracking.
     * Should be called in app.config.ts or app.component.ts
     */
    init() {
        window.addEventListener('click', (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const element = target.closest('button, a, input, select, textarea') as HTMLElement;

            if (element && !element.closest(DECORATOR_TRACKED_SELECTOR)) {
                this.trackEvent('global_click: ' + element.id, element);
            }
        }, true);

        window.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLElement;
            if (
                (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) &&
                !target.closest(DECORATOR_TRACKED_SELECTOR)
            ) {
                this.trackEvent('global_change: ' + target.id, target);
            }
        }, true);
    }

    private trackEvent(eventName: string, element: HTMLElement) {
        this.eventService.emit({
            time: new Date().toISOString(),
            name: eventName,
            caseid: this.sessionService.getUser(),
            context: describeElement(element)
        });
    }
}
