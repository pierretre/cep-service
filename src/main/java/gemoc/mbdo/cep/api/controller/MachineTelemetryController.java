package gemoc.mbdo.cep.api.controller;

import gemoc.mbdo.cep.api.service.MachineTelemetrySseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/machines")
@Tag(name = "Machine Telemetry", description = "APIs for streaming live machine movement and sensor updates")
public class MachineTelemetryController {

    @Autowired
    private MachineTelemetrySseService machineTelemetrySseService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream machine telemetry via SSE", description = "Subscribe to live machine movement and sensor updates")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "SSE stream established")
    })
    public SseEmitter streamMachineTelemetry() {
        return machineTelemetrySseService.registerClient();
    }
}
