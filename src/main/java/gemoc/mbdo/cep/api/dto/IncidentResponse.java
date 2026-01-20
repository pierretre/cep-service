package gemoc.mbdo.cep.api.dto;

import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.model.IncidentSeverity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
@Schema(description = "Response object containing Incident details")
public class IncidentResponse {

    @Schema(description = "Unique identifier of the incident", example = "1")
    private Long id;

    @Schema(description = "Error message when incident was triggered", example = "Temperature exceeded threshold")
    private String message;

    @Schema(description = "Rule that triggered this incident")
    private RuleResponse rule;

    @Schema(description = "Severity level of the incident", example = "HIGH")
    private IncidentSeverity severity;

    @Schema(description = "Start time of the incident (time of the event that triggered the incident)", example = "2026-01-15T10:30:00")
    private LocalDateTime startTime;

    @Schema(description = "Timestamp when the incident was created", example = "2026-01-15T10:30:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the incident was last updated", example = "2026-01-15T10:30:00")
    private LocalDateTime updatedAt;

    public static IncidentResponse fromIncident(Incident incident) {
        IncidentResponse response = new IncidentResponse();
        response.setId(incident.getId());
        response.setMessage(incident.getMessage());
        response.setRule(RuleResponse.fromRule(incident.getRule()));
        response.setSeverity(incident.getSeverity());
        response.setStartTime(incident.getStartTime());
        response.setCreatedAt(incident.getCreatedAt());
        response.setUpdatedAt(incident.getUpdatedAt());
        return response;
    }

}
