package gemoc.mbdo.cep.api.kafka;

import gemoc.mbdo.cep.api.model.Event;
import gemoc.mbdo.cep.api.service.MachineTelemetrySseService;
import gemoc.mbdo.cep.interfaces.CepEngine;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer that feeds events to the CEP engine
 */
@Component
@Slf4j
public class KafkaEventConsumer {

    private final CepEngine engine;
    private final MachineTelemetrySseService machineTelemetrySseService;

    @Autowired
    public KafkaEventConsumer(CepEngine engine, MachineTelemetrySseService machineTelemetrySseService) {
        this.engine = engine;
        this.machineTelemetrySseService = machineTelemetrySseService;
    }

    @KafkaListener(topics = "events", groupId = "cep-engine-consumer")
    public void consumeEvents(Event event) {
        machineTelemetrySseService.onKafkaEvent(event);
        engine.sendEvent(event);
    }
}
