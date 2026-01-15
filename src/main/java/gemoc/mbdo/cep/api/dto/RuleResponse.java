package gemoc.mbdo.cep.api.dto;

import gemoc.mbdo.cep.shared.model.Rule;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

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

    @Schema(description = "Deployment ID from the CEP engine", example = "deployment-123")
    private String deploymentId;

    public static RuleResponse fromRule(Rule rule) {
        RuleResponse response = new RuleResponse();
        response.setId(rule.getId());
        response.setName(rule.getName());
        response.setEplQuery(rule.getEplQuery());
        response.setDescription(rule.getDescription());
        response.setActive(rule.getActive());
        response.setCreatedAt(rule.getCreatedAt());
        response.setUpdatedAt(rule.getUpdatedAt());
        response.setDeploymentId(rule.getDeploymentId());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getDeploymentId() {
        return deploymentId;
    }

    public void setDeploymentId(String deploymentId) {
        this.deploymentId = deploymentId;
    }
}
