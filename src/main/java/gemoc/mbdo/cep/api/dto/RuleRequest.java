package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Schema(description = "Request object for creating or updating a CEP rule")
public class RuleRequest {

    @Schema(description = "Unique name of the rule", example = "HighTemperatureAlert", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "EPL (Event Processing Language) query for the rule", example = "select * from Event(temperature > 100)", requiredMode = Schema.RequiredMode.REQUIRED)
    private String eplQuery;

    @Schema(description = "Human-readable description of the rule", example = "Alert when temperature exceeds 100 degrees")
    private String description;

    @Schema(description = "Whether the rule is active", example = "true", defaultValue = "true")
    private Boolean active = true;

}
