package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import javax.validation.constraints.NotBlank;

@Schema(description = "Request object for creating or updating a CEP rule")
public class RuleRequest {

    @Schema(description = "Unique name of the rule", example = "HighTemperatureAlert", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Rule name is required")
    private String name;

    @Schema(description = "EPL (Event Processing Language) query for the rule", example = "select * from SensorEvent(temperature > 100)", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "EPL query is required")
    private String eplQuery;

    @Schema(description = "Human-readable description of the rule", example = "Alert when temperature exceeds 100 degrees")
    private String description;

    @Schema(description = "Whether the rule is active", example = "true", defaultValue = "true")
    private Boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEplQuery() {
        return eplQuery;
    }

    public void setEplQuery(String eplQuery) {
        this.eplQuery = eplQuery;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
