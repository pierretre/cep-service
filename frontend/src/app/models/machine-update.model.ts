export interface MachineStateUpdate {
    machineId: string;
    machineType: string;
    state: Record<string, unknown>;
    timestamp: string;
}

export interface ShopfloorMachineUpdate {
    machineId: string;
    state: Record<string, unknown>;
    timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function toText(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function fromMachineUpdate(raw: unknown): MachineStateUpdate {
    const update = toRecord(raw);

    return {
        machineId: toText(update['machineId']),
        machineType: toText(update['machineType']),
        state: toRecord(update['state']),
        timestamp: toText(update['timestamp']) || new Date().toISOString()
    };
}

export function toShopfloorMachineUpdate(update: MachineStateUpdate): ShopfloorMachineUpdate {
    return {
        machineId: update.machineId.trim(),
        state: update.state,
        timestamp: update.timestamp
    };
}
