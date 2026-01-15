package gemoc.mbdo.cep;

import com.fasterxml.jackson.databind.ObjectMapper;
import gemoc.mbdo.cep.model.Event;
import org.apache.kafka.common.serialization.Serializer;

import java.util.Map;

public class EventSerializer implements Serializer<Event> {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        // No configuration needed
    }

    @Override
    public byte[] serialize(String topic, Event data) {
        if (data == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize Event", e);
        }
    }

    @Override
    public void close() {
        // Nothing to close
    }
}
