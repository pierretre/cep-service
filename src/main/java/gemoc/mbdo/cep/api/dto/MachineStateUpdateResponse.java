package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Machine state snapshot pushed through SSE")
public class MachineStateUpdateResponse {

    @Schema(description = "Machine identifier", example = "VGRSystemModel_01")
    private String machineId;

    @Schema(description = "Machine type", example = "vacuum-gripper")
    private String machineType;

    @Schema(description = "Current machine state")
    private Map<String, Object> state;

    @Schema(description = "Timestamp of the update", example = "2026-03-11T10:38:42.311870Z")
    private Instant timestamp;
}