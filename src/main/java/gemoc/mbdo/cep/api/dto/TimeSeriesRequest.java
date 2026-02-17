package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for time-series data queries
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Time-series data request parameters")
public class TimeSeriesRequest {

    @Schema(description = "Start timestamp in milliseconds", example = "1708099200000", required = true)
    private Long start;

    @Schema(description = "End timestamp in milliseconds", example = "1708185600000", required = true)
    private Long end;

    @Schema(description = "Resolution/aggregation interval", example = "1m", allowableValues = { "1m", "5m", "15m",
            "1h", "6h", "1d", "1w" }, required = true)
    private String resolution;
}
