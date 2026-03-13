package gemoc.mbdo.cep.api.telemetry.state;

import java.util.LinkedHashMap;
import java.util.Map;

public class GenericMachineState extends AbstractMachineState {

    private final Map<String, Object> state = new LinkedHashMap<>();

    public GenericMachineState(String machineId) {
        super(machineId);
    }

    @Override
    public String machineType() {
        return "generic";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        state.put(normalizedAttribute, value);
    }

    @Override
    public Map<String, Object> toState() {
        return withCommonState(state);
    }
}
