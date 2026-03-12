package gemoc.mbdo.cep.api.telemetry.state;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
public class VacuumGripperState extends AbstractMachineState {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final double MAX_VERTICAL_ENCODER_COUNTER = 1750d;
    private static final double MAX_ARM_ENCODER_COUNTER = 1970d;
    private static final double MAX_ROT_ENCODER_COUNTER = 3040d;

    // Visual arm length range is constrained by the VGR blue access-zone annulus.
    private static final double MIN_ARM_EXTENSION_MM = 165d;
    private static final double MAX_ARM_EXTENSION_MM = 315d;
    private static final double MAX_ARM_ROTATION_DEG = 360d;

    private boolean isOperational;
    private double armExtension;
    private double armRotation;
    private double gripperExtension;
    private boolean gripperState;
    private boolean isArmElevated;
    private boolean isArmExtended;
    private boolean isInitialized;

    public VacuumGripperState(String machineId) {
        super(machineId);
        this.armExtension = MIN_ARM_EXTENSION_MM;
    }

    @Override
    public String machineType() {
        return "vacuum-gripper";
    }

    @Override
    protected void applyAttributeInternal(String normalizedAttribute, Object value) {
        if (normalizedAttribute.contains("machinefeedback")) {
            applyMachineFeedback(value);
            return;
        }

        Boolean boolValue = asBoolean(value);
        if (boolValue != null) {
            if (normalizedAttribute.contains("isoperational")) {
                isOperational = boolValue;
                return;
            }
            if (normalizedAttribute.contains("gripperstate")) {
                gripperState = boolValue;
                return;
            }
            if (normalizedAttribute.contains("armelevated")) {
                isArmElevated = boolValue;
                return;
            }
            if (normalizedAttribute.contains("armextended")) {
                isArmExtended = boolValue;
                return;
            }
        }

        Double numberValue = asDouble(value);
        if (numberValue != null) {
            if (normalizedAttribute.contains("verticalencodercounter")
                    || normalizedAttribute.contains("vacuumsensverticalencodercounter")) {
                applyVerticalCounter(numberValue);
                return;
            }
            if (normalizedAttribute.contains("armencodercounter")
                    || normalizedAttribute.contains("vacuumsensarmencodercounter")) {
                applyArmCounter(numberValue);
                return;
            }
            if (normalizedAttribute.contains("rotencodercounter")
                    || normalizedAttribute.contains("vacuumsensrotencodercounter")) {
                applyRotationCounter(numberValue);
                return;
            }
            if (normalizedAttribute.contains("armextension")) {
                armExtension = clamp(numberValue, MIN_ARM_EXTENSION_MM, MAX_ARM_EXTENSION_MM);
                isArmExtended = armExtension > MIN_ARM_EXTENSION_MM;
                return;
            }
            if (normalizedAttribute.contains("armrotation")) {
                armRotation = numberValue;
                return;
            }
            if (normalizedAttribute.contains("gripperextension")) {
                gripperExtension = numberValue;
            }
        }
    }

    @Override
    public Map<String, Object> toState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("isOperational", isOperational);
        state.put("armExtension", armExtension);
        state.put("armRotation", armRotation);
        state.put("gripperExtension", gripperExtension);
        state.put("gripperState", gripperState);
        state.put("isArmElevated", isArmElevated);
        state.put("isArmExtended", isArmExtended);
        state.put("isInitialized", isInitialized);
        return state;
    }

    @Override
    public boolean isReadyForFrontend() {
        return isInitialized;
    }

    private void applyMachineFeedback(Object value) {
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
            armRotation = 0d;
            armExtension = MIN_ARM_EXTENSION_MM;
            isArmElevated = true;
            isArmExtended = false;
            isInitialized = true;
            log.info("[{}] VGR initialized from machine feedback status INITIALIZED_IDLE", machineId);
        }
    }

    private void applyVerticalCounter(double rawCounter) {
        double clamped = clamp(rawCounter, 0d, MAX_VERTICAL_ENCODER_COUNTER);
        double ratio = clamped / MAX_VERTICAL_ENCODER_COUNTER;
        isArmElevated = ratio >= 0.5d;
    }

    private void applyArmCounter(double rawCounter) {
        double clamped = clamp(rawCounter, 0d, MAX_ARM_ENCODER_COUNTER);
        double ratio = clamped / MAX_ARM_ENCODER_COUNTER;
        armExtension = MIN_ARM_EXTENSION_MM + (ratio * (MAX_ARM_EXTENSION_MM - MIN_ARM_EXTENSION_MM));
        isArmExtended = armExtension > MIN_ARM_EXTENSION_MM;
    }

    private void applyRotationCounter(double rawCounter) {
        double clamped = clamp(rawCounter, 0d, MAX_ROT_ENCODER_COUNTER);
        // SVG positive rotation is clockwise, so invert sign to map counter growth to
        // CCW.
        armRotation = -((clamped / MAX_ROT_ENCODER_COUNTER) * MAX_ARM_ROTATION_DEG);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
