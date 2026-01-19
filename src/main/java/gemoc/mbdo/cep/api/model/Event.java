package gemoc.mbdo.cep.api.model;

import java.time.Instant;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import gemoc.mbdo.cep.api.config.CustomInstantDeserializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    private String source;
    private String key;
    private Object value;

    @JsonDeserialize(using = CustomInstantDeserializer.class)
    private Instant timestamp;

    @Override
    public String toString() {
        return "Event{source='" + source + "' key='" + key + "', value=" + value + ", timestamp=" + timestamp + "}";
    }
}
