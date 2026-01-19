package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.dto.IncidentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class IncidentSseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Register a new SSE client
     */
    public SseEmitter registerClient() {
        SseEmitter emitter = new SseEmitter(0L); // No timeout (0L means infinite)

        emitter.onCompletion(() -> {
            log.info("SSE connection completed");
            emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.info("SSE connection timed out");
            emitters.remove(emitter);
        });

        emitter.onError((ex) -> {
            log.error("SSE connection error", ex);
            emitters.remove(emitter);
        });

        emitters.add(emitter);

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("SSE connection established"));
        } catch (IOException e) {
            log.error("Error sending initial connection event", e);
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Broadcast an incident to all connected clients
     */
    public void broadcastIncident(IncidentResponse incident) {
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        log.info("Broadcasting incident {} to {} clients", incident.getId(), emitters.size());

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("incident")
                        .data(incident));
                log.debug("Incident broadcasted to client");
            } catch (IOException e) {
                log.error("Error sending incident to client", e);
                deadEmitters.add(emitter);
            }
        }

        // Remove dead emitters
        emitters.removeAll(deadEmitters);
        log.debug("Active SSE clients: {}", emitters.size());
    }

    /**
     * Get count of active connections
     */
    public int getActiveConnectionCount() {
        return emitters.size();
    }
}
