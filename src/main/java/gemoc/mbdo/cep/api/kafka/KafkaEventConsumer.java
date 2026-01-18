package gemoc.mbdo.cep.api.kafka;

import gemoc.mbdo.cep.api.model.Event;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer that feeds events to the CEP engine
 */
@Component
@Slf4j
public class KafkaEventConsumer {

    // private final CepEngine engine;

    @KafkaListener(topics = "events", groupId = "cep-engine-consumer")
    public void consumeEvents(Event event) {
        log.info("Message received: {}", event);
        // TODO: Send event to CEP engine
        // cepEngine.sendEvent(event);
    }
}
