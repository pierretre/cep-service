import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UiTraceLoggerService } from './ui-trace-logger.service';

export type TrackedInteractionEvent =
    | 'click'
    | 'scroll'
    | 'input'
    | 'change'
    | 'keydown'
    | 'submit'
    | 'wheel'
    | 'pointerdown'
    | 'touchstart';

export interface InteractionObserverOptions {
    events?: TrackedInteractionEvent[];
    scrollThrottleMs?: number;
}

@Injectable({
    providedIn: 'root'
})
export class UiInteractionObserverService {
    private cleanupCallbacks: Array<() => void> = [];
    private lastScrollLogAt = 0;

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private traceLogger: UiTraceLoggerService
    ) { }

    start(options: InteractionObserverOptions = {}): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.stop();

        const events = options.events ?? [
            'click',
            'scroll',
            'input',
            'change',
            'keydown',
            'submit',
            'wheel',
            'pointerdown',
            'touchstart'
        ];

        const scrollThrottleMs = options.scrollThrottleMs ?? 250;

        events.forEach(eventType => {
            if (eventType === 'scroll') {
                const scrollHandler = () => {
                    const now = Date.now();
                    if (now - this.lastScrollLogAt < scrollThrottleMs) {
                        return;
                    }

                    this.lastScrollLogAt = now;
                    this.logEvent(eventType, null, null);
                };

                window.addEventListener('scroll', scrollHandler, { passive: true });
                this.cleanupCallbacks.push(() => window.removeEventListener('scroll', scrollHandler));
                return;
            }

            const handler = (event: Event) => this.logEvent(eventType, event, event.target);
            document.addEventListener(eventType, handler, { capture: true, passive: true });
            this.cleanupCallbacks.push(() => document.removeEventListener(eventType, handler, { capture: true }));
        });
    }

    stop(): void {
        this.cleanupCallbacks.forEach(cleanup => cleanup());
        this.cleanupCallbacks = [];
        this.lastScrollLogAt = 0;
    }

    private logEvent(eventType: string, event: Event | null, target: EventTarget | null): void {
        const element = target instanceof HTMLElement ? target : null;
        const keyboardEvent = event instanceof KeyboardEvent ? event : null;
        const pointerEvent = event instanceof MouseEvent ? event : null;
        const value = this.extractValue(element);

        this.traceLogger.logInteraction({
            type: eventType,
            tag: element?.tagName ?? 'WINDOW',
            id: element?.id || null,
            classes: element ? Array.from(element.classList) : [],
            text: (element?.innerText || '').trim().slice(0, 120),
            x: pointerEvent?.clientX ?? null,
            y: pointerEvent?.clientY ?? null,
            key: keyboardEvent?.key ?? null,
            value,
            scrollX: eventType === 'scroll' ? window.scrollX : null,
            scrollY: eventType === 'scroll' ? window.scrollY : null,
            timestamp: new Date().toISOString()
        });
    }

    private extractValue(element: HTMLElement | null): string | null {
        if (!element) {
            return null;
        }

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
            return String(element.value).slice(0, 120);
        }

        return null;
    }
}
