package gemoc.mbdo.cep.api.telemetry.state;

import java.util.LinkedHashMap;
import java.util.Map;

public class MultiProcessingStationState extends AbstractMachineState {

    private boolean sawEnabled;
    private double sawRotation;
    private boolean sliderExtended;

    public MultiProcessingStationState(String machineId) {
        super(machineId);
    }

    @Override
    public String machineType() {
        return "multi-processing-station";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        Boolean boolValue = asBoolean(value);
        if (boolValue != null) {
            if (normalizedAttribute.contains("sawenabled")) {
                sawEnabled = boolValue;
                return;
            }
            if (normalizedAttribute.contains("sliderextended")) {
                sliderExtended = boolValue;
                return;
            }
        }

        Double numberValue = asDouble(value);
        if (numberValue != null && normalizedAttribute.contains("sawrotation")) {
            sawRotation = numberValue;
        }
    }

    @Override
    public Map<String, Object> toState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("sawEnabled", sawEnabled);
        state.put("sawRotation", sawRotation);
        state.put("sliderExtended", sliderExtended);
        return withCommonState(state);
    }
}
