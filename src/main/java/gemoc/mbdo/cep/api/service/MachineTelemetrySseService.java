package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.model.Event;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class MachineTelemetrySseService {

    private final java.util.List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerClient() {
        SseEmitter emitter = new SseEmitter(0L);

        emitter.onCompletion(() -> {
            log.info("Machine SSE connection completed");
            emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.info("Machine SSE connection timed out");
            emitters.remove(emitter);
        });

        emitter.onError(ex -> {
            if (isClientDisconnect(ex)) {
                log.debug("Machine SSE client disconnected");
            } else {
                log.warn("Machine SSE connection error", ex);
            }
            emitters.remove(emitter);
        });

        emitters.add(emitter);

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Machine telemetry SSE connection established"));
        } catch (Exception e) {
            if (!isClientDisconnect(e)) {
                log.warn("Error sending initial machine SSE event", e);
            }
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Forward Kafka events as-is so the frontend can handle SVG transformations.
     */
    public void onKafkaEvent(Event event) {
        if (event == null) {
            return;
        }
        broadcastMachineUpdate(event);
    }

    private void broadcastMachineUpdate(Event event) {
        if (emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("machine-update")
                        .data(event));
            } catch (Exception e) {
                if (!isClientDisconnect(e)) {
                    log.debug("Failed to send machine update to SSE client", e);
                }
                deadEmitters.add(emitter);
            }
        }

        emitters.removeAll(deadEmitters);
    }

    private boolean isClientDisconnect(Throwable ex) {
        if (ex == null) {
            return false;
        }

        Throwable current = ex;
        while (current != null) {
            String typeName = current.getClass().getName();
            String message = current.getMessage();
            String lower = message == null ? "" : message.toLowerCase();

            if (typeName.endsWith("AsyncRequestNotUsableException")
                    || lower.contains("broken pipe")
                    || lower.contains("connection reset")
                    || lower.contains("disconnected client")
                    || lower.contains("stream is closed")) {
                return true;
            }

            current = current.getCause();
        }

        return false;
    }
}
