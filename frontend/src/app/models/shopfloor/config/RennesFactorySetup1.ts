import { IMachine } from '../machines/interfaces/IMachine.js';
import { ConveyorBeltModel } from '../machines/models/ConveyorBelt.model.js';
import { HighBayWarehouseModel } from '../machines/models/HighBayWharehouse.js';
import { SortingLineModel } from '../machines/models/SortingLine.model.js';
import { MultiProcessingStationModel } from '../machines/models/MultiProcessingStation.model.js';
import { VacuumGripperModel } from '../machines/models/VacummGripper.model.js';

export const RENNES_FACTORY_MACHINE_MODELS: IMachine[] = [
    new ConveyorBeltModel('CBSystemModel', { x: 730, y: 1010 }, 180),
    new HighBayWarehouseModel('HBWSystemModel', { x: 460, y: 150 }, 0),
    new SortingLineModel('SLSystemModel', { x: 150, y: 1350 }, 270),
    new MultiProcessingStationModel('MPSystemModel', { x: 460, y: 470 }, 90),
    new VacuumGripperModel('VGRSystemModel_01', { x: 750, y: 810 }, 180),
    new VacuumGripperModel('VGRSystemModel_02', { x: 660, y: 1020 }, 90)
];

export const RENNES_FACTORY_MACHINE_MODELS_BY_ID: Record<string, IMachine> =
    RENNES_FACTORY_MACHINE_MODELS.reduce<Record<string, IMachine>>((accumulator, machineModel) => {
        accumulator[machineModel.id] = machineModel;
        return accumulator;
    }, {});