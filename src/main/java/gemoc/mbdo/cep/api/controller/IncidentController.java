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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import gemoc.mbdo.cep.interfaces.IncidentService;

import java.util.List;
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
}
