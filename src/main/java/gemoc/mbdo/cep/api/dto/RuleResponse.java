package gemoc.mbdo.cep.api.dto;

import gemoc.mbdo.cep.shared.model.Rule;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
@Schema(description = "Response object containing CEP rule details")
public class RuleResponse {

    @Schema(description = "Unique identifier of the rule", example = "1")
    private Long id;

    @Schema(description = "Name of the rule", example = "HighTemperatureAlert")
    private String name;

    @Schema(description = "EPL query for the rule", example = "select * from SensorEvent(temperature > 100)")
    private String eplQuery;

    @Schema(description = "Description of the rule", example = "Alert when temperature exceeds 100 degrees")
    private String description;

    @Schema(description = "Whether the rule is currently active", example = "true")
    private Boolean active;

    @Schema(description = "Timestamp when the rule was created", example = "2026-01-15T10:30:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the rule was last updated", example = "2026-01-15T10:30:00")
    private LocalDateTime updatedAt;

    public static RuleResponse fromRule(Rule rule) {
        RuleResponse response = new RuleResponse();
        response.setId(rule.getId());
        response.setName(rule.getName());
        response.setEplQuery(rule.getEplQuery());
        response.setDescription(rule.getDescription());
        response.setActive(rule.getActive());
        response.setCreatedAt(rule.getCreatedAt());
        response.setUpdatedAt(rule.getUpdatedAt());
        return response;
    }

}
