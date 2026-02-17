package gemoc.mbdo.cep.api.controller;

import gemoc.mbdo.cep.api.dto.IncidentResponse;
import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.service.IncidentSseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import gemoc.mbdo.cep.interfaces.IncidentService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/incidents")
@Tag(name = "Incidents", description = "APIs for retrieving rule violations/incidents")
public class IncidentController {

    @Autowired
    private IncidentService incidentService;

    @Autowired
    private IncidentSseService incidentSseService;

    @GetMapping
    @Operation(summary = "Get all incidents", description = "Retrieve all incidents from the system")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved incidents", content = @Content(array = @ArraySchema(schema = @Schema(implementation = IncidentResponse.class))))
    })
    public ResponseEntity<List<IncidentResponse>> getAllIncidents() {
        List<Incident> incidents = incidentService.getIncidents();
        List<IncidentResponse> responses = incidents.stream()
                .map(IncidentResponse::fromIncident)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/paginated")
    @Operation(summary = "Get incidents with pagination", description = "Retrieve incidents with pagination support for better performance")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved paginated incidents")
    })
    public ResponseEntity<Map<String, Object>> getIncidentsPaginated(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (asc/desc)") @RequestParam(defaultValue = "desc") String sortDir,
            @Parameter(description = "Start time in milliseconds (optional)") @RequestParam(required = false) Long startTime,
            @Parameter(description = "End time in milliseconds (optional)") @RequestParam(required = false) Long endTime) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Incident> incidentPage;
        if (startTime != null && endTime != null) {
            incidentPage = incidentService.getIncidentsByTimeRange(startTime, endTime, pageable);
        } else {
            incidentPage = incidentService.getIncidentsPaginated(pageable);
        }

        List<IncidentResponse> incidents = incidentPage.getContent().stream()
                .map(IncidentResponse::fromIncident)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("incidents", incidents);
        response.put("currentPage", incidentPage.getNumber());
        response.put("totalItems", incidentPage.getTotalElements());
        response.put("totalPages", incidentPage.getTotalPages());
        response.put("pageSize", incidentPage.getSize());
        response.put("hasNext", incidentPage.hasNext());
        response.put("hasPrevious", incidentPage.hasPrevious());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get incident by ID", description = "Retrieve a specific incident by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Incident found", content = @Content(schema = @Schema(implementation = IncidentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Incident not found")
    })
    public ResponseEntity<IncidentResponse> getIncidentById(
            @Parameter(description = "ID of the incident to retrieve") @PathVariable Long id) {
        try {
            Incident incident = incidentService.getIncidentById(id);
            return ResponseEntity.ok(IncidentResponse.fromIncident(incident));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream incidents via SSE", description = "Subscribe to real-time incident updates using Server-Sent Events")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "SSE stream established")
    })
    public SseEmitter streamIncidents() {
        return incidentSseService.registerClient();
    }

    @GetMapping(value = "/stream-time-range", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream raw incidents in time range via SSE", description = "Stream all incidents within a specified time range for client-side aggregation and filtering")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "SSE stream established"),
            @ApiResponse(responseCode = "400", description = "Invalid time range parameters")
    })
    public SseEmitter streamIncidentsInTimeRange(
            @Parameter(description = "Start time in milliseconds") @RequestParam Long start,
            @Parameter(description = "End time in milliseconds") @RequestParam Long end) {

        if (start == null || end == null || start >= end) {
            throw new IllegalArgumentException("Invalid time range: start must be before end");
        }

        SseEmitter emitter = new SseEmitter(300000L); // 5 minute timeout

        new Thread(() -> {
            try {
                // Convert timestamps to LocalDateTime
                java.time.LocalDateTime startDt = java.time.LocalDateTime.ofInstant(
                        java.time.Instant.ofEpochMilli(start), java.time.ZoneId.systemDefault());
                java.time.LocalDateTime endDt = java.time.LocalDateTime.ofInstant(
                        java.time.Instant.ofEpochMilli(end), java.time.ZoneId.systemDefault());

                System.out.println("=== SSE Time-Range Stream Started ===");
                System.out.println("Start: " + startDt + ", End: " + endDt);

                // Fetch initial batch of incidents in the time range
                List<Incident> incidents = incidentService.getIncidentsInTimeRange(startDt, endDt);

                // Send initial data batch
                java.util.List<IncidentResponse> responses = incidents.stream()
                        .map(IncidentResponse::fromIncident)
                        .collect(Collectors.toList());

                emitter.send(SseEmitter.event()
                        .id(System.nanoTime() + "")
                        .name("data")
                        .data(responses)
                        .build());

                System.out.println("Sent " + responses.size() + " initial incidents");

                // Keep stream open and poll for new incidents every 2 seconds
                long lastCheck = System.currentTimeMillis();
                while (true) {
                    Thread.sleep(2000);

                    // Check for new incidents since last check
                    java.time.LocalDateTime lastCheckDt = java.time.LocalDateTime.ofInstant(
                            java.time.Instant.ofEpochMilli(lastCheck), java.time.ZoneId.systemDefault());
                    List<Incident> newIncidents = incidentService.getIncidentsInTimeRange(
                            lastCheckDt, endDt);

                    if (!newIncidents.isEmpty()) {
                        // Send each new incident as an update
                        for (Incident incident : newIncidents) {
                            emitter.send(SseEmitter.event()
                                    .id(System.nanoTime() + "")
                                    .name("update")
                                    .data(IncidentResponse.fromIncident(incident))
                                    .build());
                        }
                        System.out.println("Sent " + newIncidents.size() + " new incidents");
                    }

                    lastCheck = System.currentTimeMillis();
                }

            } catch (InterruptedException e) {
                System.out.println("SSE time-range stream interrupted");
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                }
            } catch (java.io.IOException e) {
                System.err.println("Error in SSE time-range stream: " + e.getMessage());
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                }
            }
        }).start();

        return emitter;
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete incident by ID", description = "Delete a specific incident by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Incident deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Incident not found")
    })
    public ResponseEntity<Void> deleteIncident(
            @Parameter(description = "ID of the incident to delete") @PathVariable Long id) {
        try {
            incidentService.deleteIncident(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
