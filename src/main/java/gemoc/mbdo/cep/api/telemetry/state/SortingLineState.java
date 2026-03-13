package gemoc.mbdo.cep.api.telemetry.state;

import java.util.LinkedHashMap;
import java.util.Map;

public class SortingLineState extends AbstractMachineState {

    private boolean sortingLineSensInputLightBarrier;
    private boolean sortingLineSensMiddleLightBarrier;
    private boolean sortingLineSensWhiteLightBarrier;
    private boolean sortingLineSensBlueLightBarrier;
    private boolean sortingLineSensRedLightBarrier;
    private double sortingLineSensImpulseCounterRaw;

    public SortingLineState(String machineId) {
        super(machineId);
    }

    @Override
    public String machineType() {
        return "sorting-line";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        Boolean boolValue = asBoolean(value);
        if (boolValue != null) {
            if (normalizedAttribute.contains("sortinglinesensinputlightbarrier")) {
                sortingLineSensInputLightBarrier = boolValue;
                return;
            }
            if (normalizedAttribute.contains("sortinglinesensmiddlelightbarrier")) {
                sortingLineSensMiddleLightBarrier = boolValue;
                return;
            }
            if (normalizedAttribute.contains("sortinglinesenswhitelightbarrier")) {
                sortingLineSensWhiteLightBarrier = boolValue;
                return;
            }
            if (normalizedAttribute.contains("sortinglinesensbluelightbarrier")) {
                sortingLineSensBlueLightBarrier = boolValue;
                return;
            }
            if (normalizedAttribute.contains("sortinglinesensredlightbarrier")) {
                sortingLineSensRedLightBarrier = boolValue;
                return;
            }
        }

        Double numberValue = asDouble(value);
        if (numberValue != null && normalizedAttribute.contains("sortinglinesensimpulsecounterraw")) {
            sortingLineSensImpulseCounterRaw = numberValue;
        }
    }

    @Override
    public Map<String, Object> toState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("sortingLineSensInputLightBarrier", sortingLineSensInputLightBarrier);
        state.put("sortingLineSensMiddleLightBarrier", sortingLineSensMiddleLightBarrier);
        state.put("sortingLineSensWhiteLightBarrier", sortingLineSensWhiteLightBarrier);
        state.put("sortingLineSensBlueLightBarrier", sortingLineSensBlueLightBarrier);
        state.put("sortingLineSensRedLightBarrier", sortingLineSensRedLightBarrier);
        state.put("sortingLineSensImpulseCounterRaw", sortingLineSensImpulseCounterRaw);
        return withCommonState(state);
    }
}
