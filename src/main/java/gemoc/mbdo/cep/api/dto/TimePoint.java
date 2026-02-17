package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single point in time-series data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "A single time-series data point")
public class TimePoint {

    @Schema(description = "Timestamp in milliseconds", example = "1708099200000")
    private Long timestamp;

    @Schema(description = "Aggregated value (incident count)", example = "42.0")
    private Double value;
}
