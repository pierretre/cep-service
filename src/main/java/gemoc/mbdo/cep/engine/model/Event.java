package gemoc.mbdo.cep.engine.model;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Event {
    public String id;
    public String type;
    public double value;
    public long timestamp;

    public Event() {
    }

    public Event(String id, String type, double value, long timestamp) {
        this.id = id;
        this.type = type;
        this.value = value;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "Event{id='" + id + "', type='" + type + "', value=" + value + ", timestamp=" + timestamp + "}";
    }
}
