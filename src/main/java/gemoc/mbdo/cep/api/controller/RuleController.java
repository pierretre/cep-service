package gemoc.mbdo.cep.api.controller;

import gemoc.mbdo.cep.api.dto.RuleRequest;
import gemoc.mbdo.cep.api.dto.RuleResponse;
import gemoc.mbdo.cep.api.service.RuleServiceImpl;
import gemoc.mbdo.cep.api.model.Rule;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rules")
@Tag(name = "Rule Management", description = "APIs for managing CEP rules")
public class RuleController {

    @Autowired
    private RuleServiceImpl ruleService;

    @GetMapping
    @Operation(summary = "Get all rules", description = "Retrieve a list of all CEP rules")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of rules", content = @Content(schema = @Schema(implementation = RuleResponse.class)))
    })
    public ResponseEntity<List<RuleResponse>> getAllRules() {
        List<RuleResponse> rules = ruleService.getRules().stream()
                .map(RuleResponse::fromRule)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rules);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get rule by ID", description = "Retrieve a specific rule by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule found", content = @Content(schema = @Schema(implementation = RuleResponse.class))),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<RuleResponse> getRuleById(
            @Parameter(description = "ID of the rule to retrieve") @PathVariable Long id) {
        try {
            Rule rule = ruleService.getRuleById(id);
            return ResponseEntity.ok(RuleResponse.fromRule(rule));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/name/{name}")
    @Operation(summary = "Get rule by name", description = "Retrieve a specific rule by its name")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule found", content = @Content(schema = @Schema(implementation = RuleResponse.class))),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<RuleResponse> getRuleByName(
            @Parameter(description = "Name of the rule to retrieve") @PathVariable String name) {
        try {
            Rule rule = ruleService.getRuleByName(name);
            return ResponseEntity.ok(RuleResponse.fromRule(rule));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/active")
    @Operation(summary = "Get active rules", description = "Retrieve all active CEP rules")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved active rules", content = @Content(schema = @Schema(implementation = RuleResponse.class)))
    })
    public ResponseEntity<List<RuleResponse>> getActiveRules() {
        List<RuleResponse> rules = ruleService.getActiveRules().stream()
                .map(RuleResponse::fromRule)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rules);
    }

    @PostMapping
    @Operation(summary = "Create a new rule", description = "Create a new CEP rule with EPL query")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Rule created successfully", content = @Content(schema = @Schema(implementation = RuleResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or rule already exists")
    })
    public ResponseEntity<?> createRule(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Rule to create", required = true, content = @Content(schema = @Schema(implementation = RuleRequest.class))) @RequestBody RuleRequest request) {
        try {
            Rule rule = new Rule(request.getName(), request.getEplQuery(), request.getDescription());
            rule.setActive(request.getActive());
            ruleService.addRule(rule);
            return ResponseEntity.status(HttpStatus.CREATED).body(RuleResponse.fromRule(rule));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a rule", description = "Update an existing CEP rule")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule updated successfully", content = @Content(schema = @Schema(implementation = RuleResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<?> updateRule(
            @Parameter(description = "ID of the rule to update") @PathVariable Long id,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Updated rule data", required = true, content = @Content(schema = @Schema(implementation = RuleRequest.class))) @RequestBody RuleRequest request) {
        try {
            Rule updatedRule = new Rule(request.getName(), request.getEplQuery(), request.getDescription());
            updatedRule.setActive(request.getActive());
            Rule result = ruleService.updateRule(id, updatedRule);
            return ResponseEntity.ok(RuleResponse.fromRule(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a rule", description = "Delete a CEP rule by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Error deleting rule"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<?> deleteRule(
            @Parameter(description = "ID of the rule to delete") @PathVariable Long id) {
        try {
            Rule rule = ruleService.getRuleById(id);
            ruleService.removeRule(rule);
            return ResponseEntity.ok().body("Rule deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate a rule", description = "Activate a CEP rule to start processing events")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule activated successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<?> activateRule(
            @Parameter(description = "ID of the rule to activate") @PathVariable Long id) {
        try {
            ruleService.activateRule(id);
            return ResponseEntity.ok().body("Rule activated successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate a rule", description = "Deactivate a CEP rule to stop processing events")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rule deactivated successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    public ResponseEntity<?> deactivateRule(
            @Parameter(description = "ID of the rule to deactivate") @PathVariable Long id) {
        try {
            ruleService.deactivateRule(id);
            return ResponseEntity.ok().body("Rule deactivated successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
