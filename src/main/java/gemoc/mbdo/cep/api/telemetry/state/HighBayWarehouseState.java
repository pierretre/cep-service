package gemoc.mbdo.cep.api.telemetry.state;

import java.util.LinkedHashMap;
import java.util.Map;

public class HighBayWarehouseState extends AbstractMachineState {

    private boolean storageA;
    private boolean storageB;
    private boolean storageC;
    private boolean inputBarrier;
    private boolean outputBarrier;

    public HighBayWarehouseState(String machineId) {
        super(machineId);
    }

    @Override
    public String machineType() {
        return "high-bay-warehouse";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        Boolean boolValue = asBoolean(value);
        if (boolValue == null) {
            return;
        }

        if (normalizedAttribute.contains("storagea")) {
            storageA = boolValue;
        } else if (normalizedAttribute.contains("storageb")) {
            storageB = boolValue;
        } else if (normalizedAttribute.contains("storagec")) {
            storageC = boolValue;
        } else if (normalizedAttribute.contains("inputbarrier")) {
            inputBarrier = boolValue;
        } else if (normalizedAttribute.contains("outputbarrier")) {
            outputBarrier = boolValue;
        }
    }

    @Override
    public Map<String, Object> toState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("storageA", storageA);
        state.put("storageB", storageB);
        state.put("storageC", storageC);
        state.put("inputBarrier", inputBarrier);
        state.put("outputBarrier", outputBarrier);
        return withCommonState(state);
    }
}
