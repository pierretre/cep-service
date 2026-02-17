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

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

        private final ExecutorService executorService = Executors.newCachedThreadPool();
        private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

        @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        @Operation(summary = "Stream time-series data via SSE", description = "Establishes a Server-Sent Events connection to stream time-series data in real-time. "
                        + "Initial data is sent immediately, followed by incremental updates.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "SSE stream established"),
                        @ApiResponse(responseCode = "400", description = "Invalid parameters")
        })
        public SseEmitter streamTimeSeries(
                        @Parameter(description = "Start timestamp in milliseconds", example = "1708099200000", required = true) @RequestParam Long start,
                        @Parameter(description = "End timestamp in milliseconds", example = "1708185600000", required = true) @RequestParam Long end,
                        @Parameter(description = "Aggregation resolution", example = "1m", required = true) @RequestParam String resolution,
                        @Parameter(description = "Filter by severity levels") @RequestParam(required = false) String severities) {

                SseEmitter emitter = new SseEmitter(300000L); // 5 minute timeout
                String emitterId = System.nanoTime() + "-" + System.currentTimeMillis();
                emitters.put(emitterId, emitter);

                executorService.execute(() -> {
                        try {
                                // Validate parameters
                                if (start == null || end == null || resolution == null || start >= end) {
                                        emitter.send(SseEmitter.event()
                                                        .id(emitterId)
                                                        .name("error")
                                                        .data("Invalid parameters: missing required fields or invalid time range")
                                                        .build());
                                        emitter.complete();
                                        emitters.remove(emitterId);
                                        return;
                                }

                                if (!timeSeriesService.isValidResolution(resolution)) {
                                        emitter.send(SseEmitter.event()
                                                        .id(emitterId)
                                                        .name("error")
                                                        .data("Invalid resolution: " + resolution)
                                                        .build());
                                        emitter.complete();
                                        emitters.remove(emitterId);
                                        return;
                                }

                                System.out.println("=== SSE Stream Started ===");
                                System.out.println("Start: " + start + " (" + new java.util.Date(start) + ")");
                                System.out.println("End: " + end + " (" + new java.util.Date(end) + ")");
                                System.out.println("Resolution: " + resolution);

                                // Get initial batch of data
                                TimeSeriesResponse response = timeSeriesService.getTimeSeriesData(
                                                start, end, resolution, severities);

                                // Send initial data
                                emitter.send(SseEmitter.event()
                                                .id(emitterId)
                                                .name("data")
                                                .data(convertToJson(response.getPoints()))
                                                .build());

                                System.out.println("Sent " + response.getPoints().size() + " initial data points");

                                // Stream live updates every 2 seconds
                                while (true) {
                                        // Check for new data every 2 seconds
                                        Thread.sleep(2000);

                                        // Get fresh data to detect changes
                                        TimeSeriesResponse freshResponse = timeSeriesService.getTimeSeriesData(
                                                        start, end, resolution, severities);

                                        // If we have new or updated data points, send them
                                        if (freshResponse.getPoints().size() > response.getPoints().size()) {
                                                // Send full updated dataset
                                                emitter.send(SseEmitter.event()
                                                                .id(emitterId)
                                                                .name("update")
                                                                .data(convertToJson(freshResponse.getPoints()))
                                                                .build());

                                                System.out.println("Sent " + freshResponse.getPoints().size()
                                                                + " total data points");
                                                response = freshResponse;
                                        }
                                }

                        } catch (InterruptedException e) {
                                // Stream was interrupted or closed - this is normal
                                System.out.println("SSE stream interrupted");
                                try {
                                        emitter.send(SseEmitter.event()
                                                        .id(emitterId)
                                                        .name("complete")
                                                        .data("Stream closed")
                                                        .build());
                                        emitter.complete();
                                } catch (IOException ignored) {
                                }
                        } catch (IOException e) {
                                System.err.println("ERROR: SSE emission failed");
                                e.printStackTrace();
                                try {
                                        emitter.completeWithError(e);
                                } catch (Exception ignored) {
                                }
                        } finally {
                                emitters.remove(emitterId);
                                System.out.println("=========================");
                        }
                });

                return emitter;
        }

        private String convertToJson(java.util.List<TimePoint> points) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < points.size(); i++) {
                        TimePoint p = points.get(i);
                        sb.append("{\"timestamp\":").append(p.getTimestamp())
                                        .append(",\"value\":").append(p.getValue()).append("}");
                        if (i < points.size() - 1) {
                                sb.append(",");
                        }
                }
                sb.append("]");
                return sb.toString();
        }

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
                                        "1w" }, type = "string")) @RequestParam String resolution,

                        @Parameter(description = "Filter by incident status", example = "active") @RequestParam(required = false) String status,

                        @Parameter(description = "Filter by data source", example = "sensor-1") @RequestParam(required = false) String dataSource,

                        @Parameter(description = "Filter by severity levels (comma-separated)", example = "critical,high") @RequestParam(required = false) String severities) {
                System.out.println("=== Time-Series Request ===");
                System.out.println("Start: " + start + " (" + new java.util.Date(start) + ")");
                System.out.println("End: " + end + " (" + new java.util.Date(end) + ")");
                System.out.println("Resolution: " + resolution);
                System.out.println("Status: " + status);
                System.out.println("Data Source: " + dataSource);
                System.out.println("Severities: " + severities);

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
                        // Get time-series data with filters
                        TimeSeriesResponse response = timeSeriesService.getTimeSeriesData(
                                        start, end, resolution, severities);

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
}
