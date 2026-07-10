// hamsters-event.decorator.ts
import { HamstersEventService } from '../services/hamsters-event.service';
import { AppInjector } from '../app-injector';
import { SessionService } from '../services/session.service';
import { safeSerialize } from './safe-serialize.util';

/**
 * @param contextFn Optional extractor for context that isn't in the method's
 * arguments (e.g. resulting component/store state). Receives the component
 * instance and the call args, run before the original method executes.
 */
export function HamstersEvent(
    eventName: string,
    nodeId?: string,
    contextFn?: (instance: any, args: any[]) => any
) {
    return function (
        _target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {

        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            console.log(`[HamstersEvent] Emitting event: ${eventName} from ${propertyKey} with args:`, args);
            const eventService = AppInjector.get(HamstersEventService);
            const sessionService = AppInjector.get(SessionService);
            const data = contextFn ? safeSerialize(contextFn(this, args)) : undefined;

            eventService.emit({
                time: new Date().toISOString(),
                name: eventName,
                caseid: sessionService.getUser(),
                context: {
                    nodeId,
                    method: propertyKey,
                    args: args.map((arg) => safeSerialize(arg)),
                    ...(data !== undefined ? { data } : {}),
                },
            });

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
