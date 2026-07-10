import { describeElement } from './element-context.util';

const MAX_DEPTH = 4;

/**
 * Recursively converts arbitrary values (DOM elements, Events, library event
 * payloads with internal circular references such as ECharts/zrender params)
 * into plain, JSON-safe data. Cycles are broken with '[Circular]' and depth
 * is capped so large internal object graphs don't get fully walked.
 */
export function safeSerialize(value: any, seen: WeakSet<object> = new WeakSet(), depth = 0): any {
    if (value === null || typeof value !== 'object') {
        return typeof value === 'function' ? undefined : value;
    }

    if (value instanceof HTMLElement) {
        return describeElement(value);
    }

    if (value instanceof Event) {
        return value.target instanceof HTMLElement
            ? { eventType: value.type, element: describeElement(value.target) }
            : { eventType: value.type };
    }

    if (seen.has(value)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[Truncated]';

    seen.add(value);
    try {
        if (Array.isArray(value)) {
            return value.map((item) => safeSerialize(item, seen, depth + 1));
        }

        const result: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith('__ngContext__') || key.startsWith('__zone_symbol__')) continue;
            try {
                result[key] = safeSerialize(value[key], seen, depth + 1);
            } catch {
                // getter threw, skip this key
            }
        }
        return result;
    } finally {
        seen.delete(value);
    }
}
