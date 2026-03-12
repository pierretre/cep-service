package gemoc.mbdo.cep.api.telemetry.state;

import java.util.LinkedHashMap;
import java.util.Map;

public class ConveyorBeltState extends AbstractMachineState {

    private String direction = "forward";
    private boolean isExecuting;
    private boolean sensorFeed;
    private boolean sensorSwap;
    private boolean sensorImpulse;
    private double productPosition;
    private boolean hasProduct;

    public ConveyorBeltState(String machineId) {
        super(machineId);
    }

    @Override
    public String machineType() {
        return "conveyor-belt";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        if (normalizedAttribute.contains("direction") && value != null) {
            direction = String.valueOf(value);
            return;
        }

        Boolean boolValue = asBoolean(value);
        if (normalizedAttribute.contains("isexecut") && boolValue != null) {
            isExecuting = boolValue;
            return;
        }
        if (normalizedAttribute.contains("sensorfeed") && boolValue != null) {
            sensorFeed = boolValue;
            return;
        }
        if (normalizedAttribute.contains("sensorswap") && boolValue != null) {
            sensorSwap = boolValue;
            return;
        }
        if (normalizedAttribute.contains("sensorimpulse") && boolValue != null) {
            sensorImpulse = boolValue;
            return;
        }
        if (normalizedAttribute.contains("hasproduct") && boolValue != null) {
            hasProduct = boolValue;
            return;
        }

        Double numberValue = asDouble(value);
        if (normalizedAttribute.contains("productposition") && numberValue != null) {
            productPosition = numberValue;
        }
    }

    @Override
    public Map<String, Object> toState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("direction", direction);
        state.put("isExecuting", isExecuting);
        state.put("sensorFeed", sensorFeed);
        state.put("sensorSwap", sensorSwap);
        state.put("sensorImpulse", sensorImpulse);
        state.put("productPosition", productPosition);
        state.put("hasProduct", hasProduct);
        return state;
    }
}
