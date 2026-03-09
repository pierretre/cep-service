package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Schema(description = "Live machine movement and sensor update")
public class MachineUpdateResponse {

    @Schema(description = "Machine identifier", example = "mps1")
    private String machineId;

    @Schema(description = "Current sensor values keyed by sensor name")
    private Map<String, Double> sensors;

    @Schema(description = "Timestamp of update", example = "2026-03-06T13:25:42")
    private LocalDateTime timestamp;
}
