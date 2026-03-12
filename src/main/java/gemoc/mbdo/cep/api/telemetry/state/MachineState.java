package gemoc.mbdo.cep.api.telemetry.state;

import java.time.Instant;
import java.util.Map;

public interface MachineState {
    String machineId();

    String machineType();

    Instant updatedAt();

    void applyAttribute(String attribute, Object value, Instant timestamp);

    Map<String, Object> toState();

    default boolean isReadyForFrontend() {
        return true;
    }
}
