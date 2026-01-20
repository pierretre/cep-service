package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Schema(description = "Response object for rule update operations")
public class RuleUpdateResponse {

    @Schema(description = "Updated rule details")
    private RuleResponse rule;

    @Schema(description = "Notification message about the update", example = "Rule updated successfully. 5 incidents were deleted due to EPL query change.")
    private String message;

    @Schema(description = "Number of incidents deleted due to EPL query change", example = "5")
    private Long deletedIncidentsCount;

    public RuleUpdateResponse(RuleResponse rule, String message, Long deletedIncidentsCount) {
        this.rule = rule;
        this.message = message;
        this.deletedIncidentsCount = deletedIncidentsCount;
    }
}
