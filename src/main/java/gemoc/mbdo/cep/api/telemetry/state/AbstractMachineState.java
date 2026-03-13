package gemoc.mbdo.cep.api.telemetry.state;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j

public abstract class AbstractMachineState implements MachineState {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    protected final String machineId;
    protected Instant updatedAt;
    protected boolean isOperational = true;
    protected boolean isInitialized;

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
        if (normalized.contains("isoperational")) {
            Boolean boolValue = asBoolean(value);
            if (boolValue != null) {
                isOperational = boolValue;
            }
        } else if (normalized.contains("machinefeedback")) {
            applyMachineFeedback(value);
        } else {
            applyAttributeInternal(normalized, value);
        }
        if (timestamp != null) {
            this.updatedAt = timestamp;
            log.debug("[{}] State updated - attribute: {}, timestamp: {}",
                    machineId, attribute, timestamp);
        }
    }

    protected abstract void applyAttributeInternal(String normalizedAttribute, Object value);

    protected Map<String, Object> withCommonState(Map<String, Object> state) {
        Map<String, Object> result = new LinkedHashMap<>(state);
        result.put("isOperational", isOperational);
        result.put("isInitialized", isInitialized);
        return result;
    }

    @Override
    public boolean isReadyForFrontend() {
        return isInitialized;
    }

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

    protected void applyMachineFeedback(Object value) {
        Map<String, Object> payload = asMap(value);
        if (payload == null && value instanceof String text) {
            try {
                payload = OBJECT_MAPPER.readValue(text, Map.class);
            } catch (Exception ignored) {
                payload = null;
            }
        }

        if (payload == null) {
            return;
        }

        Object status = payload.get("status");
        if (!(status instanceof String statusText)) {
            return;
        }

        if ("INITIALIZED_IDLE".equals(statusText)) {
            isInitialized = true;
            onInitializedFromFeedback(payload);
            log.info("[{}] Machine initialized from machine feedback status INITIALIZED_IDLE", machineId);
        }
    }

    protected void onInitializedFromFeedback(Map<String, Object> payload) {
        // Default hook for machine-specific initialization side effects.
    }
}
