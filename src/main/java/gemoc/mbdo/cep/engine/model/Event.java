package gemoc.mbdo.cep.engine.model;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Event {
    public String id;
    public String type;
    public String key;
    public double value;
    public long timestamp;

    public Event() {
    }

    public Event(String id, String type, String key, double value, long timestamp) {
        this.id = id;
        this.type = type;
        this.key = key;
        this.value = value;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "Event{id='" + id + "', type='" + type + "', key='" + key + "', value=" + value + ", timestamp=" + timestamp + "}";
    }
}
