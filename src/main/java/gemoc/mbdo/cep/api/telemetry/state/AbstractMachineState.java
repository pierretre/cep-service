package gemoc.mbdo.cep.api.telemetry.state;

import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;

@Slf4j

public abstract class AbstractMachineState implements MachineState {

    protected final String machineId;
    protected Instant updatedAt;

    protected AbstractMachineState(String machineId) {
        this.machineId = machineId;
    }

    @Override
    public String machineId() {
        return machineId;
    }

    @Override
    public Instant updatedAt() {
        return updatedAt;
    }

    @Override
    public void applyAttribute(String attribute, Object value, Instant timestamp) {
        String normalized = normalize(attribute);
        log.trace("[{}] Applying attribute - attr: {} (normalized: {}), value: {}, timestamp: {}",
                machineId, attribute, normalized, value, timestamp);
        applyAttributeInternal(normalized, value);
        if (timestamp != null) {
            this.updatedAt = timestamp;
            log.debug("[{}] State updated - attribute: {}, timestamp: {}",
                    machineId, attribute, timestamp);
        }
    }

    protected abstract void applyAttributeInternal(String normalizedAttribute, Object value);

    protected static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    protected static Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    protected static Boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String text) {
            String normalized = text.trim().toLowerCase(Locale.ROOT);
            if ("true".equals(normalized) || "1".equals(normalized) || "on".equals(normalized)) {
                return true;
            }
            if ("false".equals(normalized) || "0".equals(normalized) || "off".equals(normalized)) {
                return false;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    protected static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }
}
