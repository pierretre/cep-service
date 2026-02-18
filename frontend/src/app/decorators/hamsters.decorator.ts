// hamsters-event.decorator.ts
import { HamstersEventService } from '../services/hamsters-event.service';

export function HamstersEvent(
    eventName: string,
    nodeId?: string
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {

        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            console.log(`[HamstersEvent] Emitting event: ${eventName} from ${propertyKey} with args:`, args);
            let eventService: HamstersEventService = new HamstersEventService();
            eventService.emit({
                event: eventName,
                nodeId,
                method: propertyKey,
                timestamp: Date.now()
            });

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
