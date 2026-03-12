package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.dto.MachineStateUpdateResponse;
import gemoc.mbdo.cep.api.model.Event;
import gemoc.mbdo.cep.api.telemetry.state.MachineState;
import gemoc.mbdo.cep.api.telemetry.state.MachineStateFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j

@Service
public class MachineStateRegistryService {

    private final Map<String, MachineState> machineStates = new ConcurrentHashMap<>();

    public Optional<MachineStateUpdateResponse> applyEvent(Event event) {
        if (event == null) {
            return Optional.empty();
        }

        Map<String, Object> valueMap = asMap(event.getValue());
        String machineId = extractMachineId(event, valueMap);
        if (machineId.isBlank()) {
            log.warn("[StateRegistry] Could not extract machineId from event - source: {}, key: {}",
                    event.getSource(), event.getKey());
            return Optional.empty();
        }

        String attribute = extractAttribute(event, valueMap);
        Object attributeValue = extractAttributeValue(event, valueMap, attribute);
        Instant timestamp = event.getTimestamp();

        log.debug("[StateRegistry] Applying event to machine state - machineId: {}, attribute: {}, value: {}",
                machineId, attribute, attributeValue);

        MachineState machineState = machineStates.computeIfAbsent(machineId, id -> {
            log.info("[StateRegistry] Creating new machine state - machineId: {}", id);
            return MachineStateFactory.create(id);
        });
        machineState.applyAttribute(attribute, attributeValue, timestamp);

        if (!machineState.isReadyForFrontend()) {
            log.debug("[StateRegistry] Machine state not ready for frontend - machineId: {}, type: {}, attribute: {}",
                    machineState.machineId(), machineState.machineType(), attribute);
            return Optional.empty();
        }

        MachineStateUpdateResponse response = MachineStateUpdateResponse.builder()
                .machineId(machineState.machineId())
                .machineType(machineState.machineType())
                .state(machineState.toState())
                .timestamp(machineState.updatedAt())
                .build();

        log.trace("[StateRegistry] Machine state updated - machineId: {}, type: {}, timestamp: {}",
                response.getMachineId(), response.getMachineType(), response.getTimestamp());

        return Optional.of(response);
    }

    private static String extractMachineId(Event event, Map<String, Object> value) {
        if (value != null) {
            String machineId = asString(value.get("machineId"));
            String machine = asString(value.get("machine"));
            String candidate = machineId != null ? machineId : machine;
            if (candidate != null && !candidate.isBlank()) {
                return normalizeMachineId(candidate);
            }
        }

        if (event.getSource() != null && !event.getSource().isBlank()) {
            return normalizeMachineId(event.getSource());
        }

        String key = event.getKey() == null ? "" : event.getKey();
        if (key.contains(".")) {
            return key.substring(0, key.indexOf('.')).trim();
        }
        if (key.contains("/")) {
            return key.substring(0, key.indexOf('/')).trim();
        }

        return "";
    }

    private static String extractAttribute(Event event, Map<String, Object> value) {
        String eventKey = event.getKey() == null ? "" : event.getKey().trim();
        if (!eventKey.isBlank()) {
            int slashIndex = eventKey.lastIndexOf('/');
            int dotIndex = eventKey.lastIndexOf('.');
            int index = Math.max(slashIndex, dotIndex);
            return index >= 0 ? eventKey.substring(index + 1) : eventKey;
        }

        if (value != null) {
            for (String key : value.keySet()) {
                if (!"machineId".equals(key) && !"machine".equals(key) && !"sensors".equals(key)) {
                    return key;
                }
            }

            Map<String, Object> sensors = asMap(value.get("sensors"));
            if (sensors != null && !sensors.isEmpty()) {
                return sensors.keySet().iterator().next();
            }
        }

        return "value";
    }

    private static Object extractAttributeValue(Event event, Map<String, Object> value, String attribute) {
        if (value == null) {
            return event.getValue();
        }

        if (value.containsKey(attribute)) {
            return value.get(attribute);
        }

        String normalizedAttribute = normalize(attribute);
        for (Map.Entry<String, Object> entry : value.entrySet()) {
            if (normalize(entry.getKey()).equals(normalizedAttribute)) {
                return entry.getValue();
            }
        }

        Map<String, Object> sensors = asMap(value.get("sensors"));
        if (sensors != null) {
            if (sensors.containsKey(attribute)) {
                return sensors.get(attribute);
            }

            for (Map.Entry<String, Object> entry : sensors.entrySet()) {
                if (normalize(entry.getKey()).equals(normalizedAttribute)) {
                    return entry.getValue();
                }
            }
        }

        return event.getValue();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private static String asString(Object value) {
        return value instanceof String text ? text : null;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static String normalizeMachineId(String machineId) {
        String trimmed = machineId == null ? "" : machineId.trim();
        int slashIndex = trimmed.lastIndexOf('/');
        if (slashIndex >= 0 && slashIndex < trimmed.length() - 1) {
            return trimmed.substring(slashIndex + 1);
        }
        return trimmed;
    }
}
