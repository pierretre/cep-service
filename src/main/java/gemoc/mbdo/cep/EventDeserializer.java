package gemoc.mbdo.cep;

import com.fasterxml.jackson.databind.ObjectMapper;
import gemoc.mbdo.cep.engine.model.Event;
import org.apache.kafka.common.serialization.Deserializer;

import java.util.Map;

public class EventDeserializer implements Deserializer<Event> {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        // No configuration needed
    }

    @Override
    public Event deserialize(String topic, byte[] data) {
        if (data == null) {
            return null;
        }
        try {
            return objectMapper.readValue(data, Event.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize Event", e);
        }
    }

    @Override
    public void close() {
        // Nothing to close
    }
}
