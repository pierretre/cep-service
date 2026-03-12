package gemoc.mbdo.cep.api.telemetry.state;

public final class MachineStateFactory {

    private MachineStateFactory() {
    }

    public static MachineState create(String machineId) {
        String normalized = machineId == null ? "" : machineId.trim().toUpperCase();

        if (normalized.startsWith("CB")) {
            return new ConveyorBeltState(machineId);
        }
        if (normalized.startsWith("HBW")) {
            return new HighBayWarehouseState(machineId);
        }
        if (normalized.startsWith("SL")) {
            return new SortingLineState(machineId);
        }
        if (normalized.startsWith("MP")) {
            return new MultiProcessingStationState(machineId);
        }
        if (normalized.startsWith("VGR")) {
            return new VacuumGripperState(machineId);
        }

        return new GenericMachineState(machineId);
    }
}
