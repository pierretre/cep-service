package gemoc.mbdo.cep.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for time-series data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Time-series data response with aggregated points")
public class TimeSeriesResponse {

    @Schema(description = "List of aggregated time-series data points")
    private List<TimePoint> points;

    @Schema(description = "Resolution used for aggregation", example = "1m")
    private String resolution;

    @Schema(description = "Start timestamp in milliseconds", example = "1708099200000")
    private Long startTime;

    @Schema(description = "End timestamp in milliseconds", example = "1708185600000")
    private Long endTime;
}
