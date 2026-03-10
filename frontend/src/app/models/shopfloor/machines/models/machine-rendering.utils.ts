export function toBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'on', 'active', 'running'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'off', 'inactive', 'stopped'].includes(normalized)) {
            return false;
        }
    }

    return null;
}

export function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function toDirection(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase();
}

export function toTelemetryText(value: unknown): string | null {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return `${value}`;
    }

    return null;
}

export function toggleActive(
    root: ParentNode,
    selector: string,
    value: boolean | null,
    inactiveClassName = 'sensorInactive'
): void {
    const element = root.querySelector<SVGElement>(selector);
    if (!element || value === null) {
        return;
    }

    element.classList.toggle('active', value);
    if (inactiveClassName.length > 0) {
        element.classList.toggle(inactiveClassName, !value);
    }
}
