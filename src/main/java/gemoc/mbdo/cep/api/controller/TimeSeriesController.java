package gemoc.mbdo.cep.api.controller;

import gemoc.mbdo.cep.api.dto.TimeSeriesResponse;
import gemoc.mbdo.cep.api.dto.TimePoint;
import gemoc.mbdo.cep.api.service.TimeSeriesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

/**
 * REST controller for time-series data endpoints
 * Provides aggregated incident data with adaptive resolution
 */
@RestController
@RequestMapping("/api/timeseries")
@Tag(name = "Time Series", description = "APIs for retrieving aggregated time-series incident data")
public class TimeSeriesController {

        @Autowired
        private TimeSeriesService timeSeriesService;

        @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Get time-series incident data", description = "Retrieve aggregated incident counts over time with specified resolution. "
                        +
                        "Data is automatically aggregated based on the resolution parameter. " +
                        "Results are cached for 5 minutes for optimal performance.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully retrieved time-series data", content = @Content(schema = @Schema(implementation = TimeSeriesResponse.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid parameters (missing required fields or invalid resolution)")
        })
        public ResponseEntity<TimeSeriesResponse> getTimeSeriesData(
                        @Parameter(description = "Start timestamp in milliseconds (Unix epoch)", example = "1708099200000", required = true) @RequestParam Long start,

                        @Parameter(description = "End timestamp in milliseconds (Unix epoch)", example = "1708185600000", required = true) @RequestParam Long end,

                        @Parameter(description = "Aggregation resolution interval. Determines the time bucket size for aggregation.", example = "1m", required = true, schema = @Schema(allowableValues = {
                                        "1m", "5m", "15m", "1h", "6h", "1d",
                                        "1w" }, type = "string")) @RequestParam String resolution) {
                System.out.println("=== Time-Series Request ===");
                System.out.println("Start: " + start + " (" + new java.util.Date(start) + ")");
                System.out.println("End: " + end + " (" + new java.util.Date(end) + ")");
                System.out.println("Resolution: " + resolution);

                // Validate parameters
                if (start == null || end == null || resolution == null) {
                        System.err.println("ERROR: Missing required parameters");
                        return ResponseEntity.badRequest().build();
                }

                if (start >= end) {
                        System.err.println("ERROR: Invalid time range - start >= end");
                        return ResponseEntity.badRequest().build();
                }

                if (!timeSeriesService.isValidResolution(resolution)) {
                        System.err.println("ERROR: Invalid resolution: " + resolution);
                        return ResponseEntity.badRequest().build();
                }

                try {
                        // Get time-series data
                        TimeSeriesResponse response = timeSeriesService.getTimeSeriesData(start, end, resolution);

                        System.out.println("SUCCESS: Returning " + response.getPoints().size() + " data points");
                        System.out.println("===========================");

                        return ResponseEntity.ok()
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(response);
                } catch (Exception e) {
                        System.err.println("ERROR: Exception processing request");
                        e.printStackTrace();
                        return ResponseEntity.internalServerError().build();
                }
        }

        @GetMapping(value = "/resolutions", produces = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Get available resolutions", description = "Returns a list of all supported resolution values for time-series aggregation")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully retrieved available resolutions")
        })
        public ResponseEntity<String[]> getAvailableResolutions() {
                return ResponseEntity.ok(new String[] { "1m", "5m", "15m", "1h", "6h", "1d", "1w" });
        }

        @GetMapping(value = "/test", produces = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Test endpoint", description = "Returns a simple test response to verify API is working")
        public ResponseEntity<TimeSeriesResponse> testEndpoint() {
                long now = System.currentTimeMillis();
                TimeSeriesResponse testResponse = new TimeSeriesResponse(
                                Arrays.asList(
                                                new TimePoint(now - 3600000, 5.0),
                                                new TimePoint(now - 1800000, 3.0),
                                                new TimePoint(now, 7.0)),
                                "1m",
                                now - 3600000,
                                now);
                return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(testResponse);
        }
}
