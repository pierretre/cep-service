export interface MachineUpdate {
    source: string;
    key: string;
    value: unknown;
    timestamp: string;
}

export interface ShopfloorMachineUpdate {
    machineId: string;
    attribute: string;
    value: any;
    timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function keyTail(key: string): string {
    const trimmed = key.trim();
    const slashIndex = trimmed.lastIndexOf('/');
    const dotIndex = trimmed.lastIndexOf('.');
    const index = Math.max(slashIndex, dotIndex);
    return index >= 0 ? trimmed.substring(index + 1) : trimmed;
}

function normalizeMachineId(machineId: string): string {
    const trimmed = machineId.trim();
    if (!trimmed) {
        return '';
    }

    const slashIndex = trimmed.lastIndexOf('/');
    if (slashIndex >= 0 && slashIndex < trimmed.length - 1) {
        return trimmed.substring(slashIndex + 1);
    }

    return trimmed;
}

function extractMachineId(update: MachineUpdate, value: Record<string, unknown> | null): string {
    if (value) {
        const mapMachineId = typeof value['machineId'] === 'string' ? value['machineId'] : null;
        const mapMachine = typeof value['machine'] === 'string' ? value['machine'] : null;
        const candidate = mapMachineId ?? mapMachine;

        if (candidate && candidate.trim().length > 0) {
            return normalizeMachineId(candidate);
        }
    }

    const source = update.source;
    if (source.trim().length > 0) {
        return normalizeMachineId(source);
    }

    const key = update.key;
    if (key.includes('.')) {
        return key.substring(0, key.indexOf('.'));
    }
    if (key.includes('/')) {
        return key.substring(0, key.indexOf('/'));
    }

    return '';
}

function normalizeKey(key: string): string {
    return key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function extractAttribute(update: MachineUpdate, value: Record<string, unknown> | null): string {
    const eventKey = update.key.trim();
    if (eventKey.length > 0) {
        return keyTail(eventKey);
    }

    if (value) {
        const directEntries = Object.entries(value).filter(([key]) => key !== 'machineId' && key !== 'machine' && key !== 'sensors');
        if (directEntries.length > 0) {
            return directEntries[0][0];
        }

        const sensors = value['sensors'];
        if (isRecord(sensors)) {
            const firstSensorKey = Object.keys(sensors)[0];
            if (firstSensorKey) {
                return firstSensorKey;
            }
        }
    }

    return 'value';
}

function extractAttributeValue(
    update: MachineUpdate,
    value: Record<string, unknown> | null,
    attribute: string
): unknown {
    if (!value) {
        return update.value;
    }

    if (Object.hasOwn(value, attribute)) {
        return value[attribute];
    }

    const normalizedAttribute = normalizeKey(attribute);
    const directMatch = Object.entries(value).find(([key]) => normalizeKey(key) === normalizedAttribute);
    if (directMatch) {
        return directMatch[1];
    }

    const sensors = value['sensors'];
    if (isRecord(sensors)) {
        if (Object.hasOwn(sensors, attribute)) {
            return sensors[attribute];
        }

        const sensorMatch = Object.entries(sensors).find(([key]) => normalizeKey(key) === normalizedAttribute);
        if (sensorMatch) {
            return sensorMatch[1];
        }
    }

    return update.value;
}

export function fromMachineUpdate(raw: unknown): MachineUpdate {
    const update = isRecord(raw) ? raw : {};
    const source = typeof update['source'] === 'string' ? update['source'] : '';
    const key = typeof update['key'] === 'string' ? update['key'] : '';
    const value = update['value'];
    const timestampValue = typeof update['timestamp'] === 'string' ? update['timestamp'] : new Date().toISOString();

    return {
        source,
        key,
        value,
        timestamp: timestampValue
    };
}

export function toShopfloorMachineUpdate(update: MachineUpdate): ShopfloorMachineUpdate {
    const value = isRecord(update.value) ? update.value : null;
    const attribute = extractAttribute(update, value);
    const attributeValue = extractAttributeValue(update, value, attribute);

    return {
        machineId: extractMachineId(update, value),
        attribute,
        value: attributeValue,
        timestamp: update.timestamp
    };
}
