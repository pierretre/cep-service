import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UiTraceLoggerService } from './ui-trace-logger.service';

export interface VisibilityObserverOptions {
    selector?: string;
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
    logOncePerElement?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UiVisibilityObserverService {
    private intersectionObserver: IntersectionObserver | null = null;
    private domMutationObserver: MutationObserver | null = null;
    private trackedElements = new WeakSet<Element>();
    private loggedVisibleElements = new WeakSet<Element>();
    private activeOptions: Required<VisibilityObserverOptions> = {
        selector: '*',
        root: null,
        rootMargin: '0px',
        threshold: 0,
        logOncePerElement: true
    };

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private traceLogger: UiTraceLoggerService
    ) { }

    start(options: VisibilityObserverOptions = {}): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.stop();

        this.activeOptions = {
            ...this.activeOptions,
            ...options
        };

        this.intersectionObserver = new IntersectionObserver(
            entries => this.handleIntersections(entries),
            {
                root: this.activeOptions.root,
                rootMargin: this.activeOptions.rootMargin,
                threshold: this.activeOptions.threshold
            }
        );

        this.observeNodeAndChildren(document.body, this.activeOptions.selector);

        this.domMutationObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (node instanceof Element) {
                        this.observeNodeAndChildren(node, this.activeOptions.selector);
                    }
                }
            }
        });

        this.domMutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    stop(): void {
        this.domMutationObserver?.disconnect();
        this.intersectionObserver?.disconnect();

        this.domMutationObserver = null;
        this.intersectionObserver = null;
        this.trackedElements = new WeakSet<Element>();
        this.loggedVisibleElements = new WeakSet<Element>();
    }

    observeElement(element: Element): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.registerElement(element);
    }

    private handleIntersections(entries: IntersectionObserverEntry[]): void {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }

            if (this.activeOptions.logOncePerElement && this.loggedVisibleElements.has(entry.target)) {
                continue;
            }

            this.loggedVisibleElements.add(entry.target);

            const element = entry.target as HTMLElement;
            this.traceLogger.logVisibility({
                tag: element.tagName,
                id: element.id || null,
                classes: Array.from(element.classList),
                text: (element.innerText || '').trim().slice(0, 120),
                ratio: Number(entry.intersectionRatio.toFixed(3)),
                timestamp: new Date().toISOString()
            });
        }
    }

    private observeNodeAndChildren(node: Element, selector: string): void {
        if (this.matchesSelector(node, selector)) {
            this.registerElement(node);
        }

        const descendants = this.getMatchingDescendants(node, selector);
        descendants.forEach(element => this.registerElement(element));
    }

    private getMatchingDescendants(node: Element, selector: string): Element[] {
        try {
            return Array.from(node.querySelectorAll(selector));
        } catch {
            return [];
        }
    }

    private registerElement(element: Element): void {
        if (!this.intersectionObserver || this.trackedElements.has(element) || this.shouldSkipElement(element)) {
            return;
        }

        this.trackedElements.add(element);
        this.intersectionObserver.observe(element);
    }

    private matchesSelector(element: Element, selector: string): boolean {
        try {
            return element.matches(selector);
        } catch {
            return false;
        }
    }

    private shouldSkipElement(element: Element): boolean {
        const tag = element.tagName.toLowerCase();
        return tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'noscript';
    }
}
