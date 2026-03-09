package gemoc.mbdo.cep.api.esper;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.*;
import gemoc.mbdo.cep.interfaces.CepEngine;
import gemoc.mbdo.cep.api.model.Rule;
import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.model.IncidentSeverity;
import gemoc.mbdo.cep.api.repository.IncidentRepository;
import gemoc.mbdo.cep.api.repository.RuleRepository;
import gemoc.mbdo.cep.api.model.Event;
import gemoc.mbdo.cep.api.dto.IncidentResponse;
import gemoc.mbdo.cep.api.service.IncidentSseService;
import gemoc.mbdo.cep.api.service.IncidentServiceImpl;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Esper CEP Engine implementation that manages rule deployment and event
 * processing
 */
@Slf4j
@Component
public class EsperCepEngineImpl implements CepEngine {

    private final EPCompiler compiler;
    private final EPRuntime runtime;
    private final Configuration configuration;
    private final Map<String, Rule> deployedRules;
    private final IncidentRepository incidentRepository;
    private final RuleRepository ruleRepository;
    private final IncidentSseService incidentSseService;
    private final IncidentServiceImpl incidentService;

    @Autowired
    public EsperCepEngineImpl(IncidentRepository incidentRepository, RuleRepository ruleRepository,
            IncidentSseService incidentSseService, IncidentServiceImpl incidentService) {
        System.out.println("\n=== Initializing Esper CEP Engine ===\n");

        this.incidentRepository = incidentRepository;
        this.ruleRepository = ruleRepository;
        this.incidentSseService = incidentSseService;
        this.incidentService = incidentService;
        this.configuration = new Configuration();
        this.configuration.getCommon().addEventType(Event.class);

        this.runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        this.compiler = EPCompilerProvider.getCompiler();
        this.deployedRules = new ConcurrentHashMap<>();

        System.out.println("Esper CEP Engine initialized successfully\n");
    }

    @Override
    public void checkRule(Rule rule) throws Exception {
        // Validate the EPL query by attempting to compile it
        String epl = "@name('" + rule.getName() + "') " + rule.getEplQuery();
        try {
            compile(compiler, epl, configuration);
            log.info("Rule validation successful: " + rule.getName());
        } catch (EPCompileException e) {
            log.error("Rule validation failed: " + rule.getName(), e);
            throw new Exception("EPL compilation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Deploy a rule from the database
     */
    @Override
    public void deployRule(Rule rule) throws Exception {
        log.info("Deploying rule ! " + rule);

        if (deployedRules.containsKey(rule.getName())) {
            System.out.println("Rule '" + rule.getName() + "' already deployed, skipping");
            return;
        }

        String epl = "@name('" + rule.getName() + "') " + rule.getEplQuery();
        EPCompiled compiled = compile(compiler, epl, configuration);
        EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);

        EPStatement statement = runtime.getDeploymentService()
                .getStatement(deployment.getDeploymentId(), rule.getName());

        statement.addListener((newEvents, oldEvents, stmt, rt) -> {
            for (com.espertech.esper.common.client.EventBean event : newEvents) {
                createIncident(rule, event);
            }
        });

        deployedRules.put(rule.getName(),
                new Rule(rule.getName(), rule.getEplQuery(), deployment.getDeploymentId()));
        System.out.println("✓ Deployed rule: " + rule.getName());
    }

    /**
     * Undeploy a rule
     */
    @Override
    public void undeployRule(String ruleName) throws Exception {
        Rule deployed = deployedRules.get(ruleName);
        if (deployed == null) {
            log.warn("Rule '{}' not found in deployed rules map, skipping undeploy", ruleName);
            return;
        }

        if (deployed.getDeploymentId() == null) {
            log.warn("Rule '{}' has no deployment ID, removing from map", ruleName);
            deployedRules.remove(ruleName);
            return;
        }

        try {
            runtime.getDeploymentService().undeploy(deployed.getDeploymentId());
            deployedRules.remove(ruleName);
            System.out.println("✓ Undeployed rule: " + ruleName);
        } catch (Exception e) {
            log.error("Failed to undeploy rule '{}' with deployment ID '{}'", ruleName, deployed.getDeploymentId(), e);
            // Remove from map even if undeploy fails to prevent future errors
            deployedRules.remove(ruleName);
            throw e;
        }
    }

    /**
     * Send an event to the CEP engine
     */
    public void sendEvent(Event event) {
        runtime.getEventService().sendEventBean(event, "Event");
    }

    /**
     * Check if a rule is deployed
     */
    public boolean isRuleDeployed(String ruleName) {
        return deployedRules.containsKey(ruleName);
    }

    /**
     * Get count of deployed rules
     */
    public int getDeployedRuleCount() {
        return deployedRules.size();
    }

    /**
     * Shutdown the engine
     */
    public void shutdown() {
        runtime.destroy();
        System.out.println("Esper CEP Engine shut down");
    }

    private EPCompiled compile(EPCompiler compiler, String epl, Configuration configuration)
            throws EPCompileException {
        CompilerArguments args = new CompilerArguments(configuration);
        log.info(epl);
        return compiler.compile(epl, args);
    }

    private String formatEvent(com.espertech.esper.common.client.EventBean eventBean) {
        StringBuilder sb = new StringBuilder("{");
        String[] propertyNames = eventBean.getEventType().getPropertyNames();
        for (int i = 0; i < propertyNames.length; i++) {
            if (i > 0)
                sb.append(", ");
            sb.append(propertyNames[i]).append("=").append(eventBean.get(propertyNames[i]));
        }
        sb.append("}");
        return sb.toString();
    }

    /**
     * Create and save an incident when a rule is triggered
     */
    private void createIncident(Rule deployedRule, com.espertech.esper.common.client.EventBean eventBean) {
        try {
            // Fetch the Rule entity from database to ensure it's managed
            Rule ruleEntity = ruleRepository.findByName(deployedRule.getName())
                    .orElseThrow(() -> new RuntimeException("Rule not found: " + deployedRule.getName()));

            // Create incident message with event details
            String message = String.format("Rule '%s' triggered: %s",
                    deployedRule.getName(),
                    formatEvent(eventBean));

            // Create new incident
            Incident incident = new Incident();
            incident.setMessage(message);
            incident.setRule(ruleEntity);
            incident.setSeverity(IncidentSeverity.Warning); // Default severity, can be customized
            incident.setStartTime(LocalDateTime.now());
            incident.setCreatedAt(LocalDateTime.now());

            // Save to database
            Incident savedIncident = incidentRepository.save(incident);

            // Evict cache since new incident was created
            incidentService.evictCache();

            // log.info("Incident created with ID: {} for rule: {}", savedIncident.getId(),
            // deployedRule.getName());

            // Broadcast incident via SSE
            IncidentResponse incidentResponse = IncidentResponse.fromIncident(savedIncident);
            incidentSseService.broadcastIncident(incidentResponse);
            // log.debug("Incident broadcasted to {} SSE clients",
            // incidentSseService.getActiveConnectionCount());

        } catch (Exception e) {
            log.error("Failed to create incident for rule: {}", deployedRule.getName(), e);
        }
    }
}
