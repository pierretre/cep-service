package gemoc.mbdo.cep.engine;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.*;
import gemoc.mbdo.cep.interfaces.CepEngine;
import gemoc.mbdo.cep.engine.model.Event;
import gemoc.mbdo.cep.shared.model.Rule;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Esper CEP Engine implementation that manages rule deployment and event
 * processing
 */
public class EsperCepEngineImpl implements CepEngine {

    private final EPCompiler compiler;
    private final EPRuntime runtime;
    private final Configuration configuration;
    private final Map<String, Rule> deployedRules;

    public EsperCepEngineImpl() {
        System.out.println("\n=== Initializing Esper CEP Engine ===\n");

        this.configuration = new Configuration();
        this.configuration.getCommon().addEventType(Event.class);

        this.runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        this.compiler = EPCompilerProvider.getCompiler();
        this.deployedRules = new ConcurrentHashMap<>();

        System.out.println("Esper CEP Engine initialized successfully\n");
    }

    @Override
    public void checkPattern(String pattern) throws Exception {
        compile(compiler, pattern, configuration);
    }

    @Override
    public void registerPattern(String pattern, String queryName) throws Exception {
        String epl = "@name('" + queryName + "') " + pattern;
        EPCompiled compiled = compile(compiler, epl, configuration);
        EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);

        EPStatement statement = runtime.getDeploymentService()
                .getStatement(deployment.getDeploymentId(), queryName);

        statement.addListener((newEvents, oldEvents, stmt, rt) -> {
            for (com.espertech.esper.common.client.EventBean event : newEvents) {
                System.out.println("[" + queryName + "] Pattern matched: " + formatEvent(event));
            }
        });

        deployedRules.put(queryName, new Rule(queryName, pattern, deployment.getDeploymentId()));
        System.out.println("✓ Registered pattern: " + queryName);
    }

    /**
     * Deploy a rule from the database
     */
    public void deployRule(Rule rule) throws Exception {
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
                System.out.println("[" + rule.getName() + "] MATCH: " + formatEvent(event));
            }
        });

        deployedRules.put(rule.getName(),
                new Rule(rule.getName(), rule.getEplQuery(), deployment.getDeploymentId()));
        System.out.println("✓ Deployed rule: " + rule.getName());
    }

    /**
     * Undeploy a rule
     */
    public void undeployRule(String ruleName) throws Exception {
        Rule deployed = deployedRules.get(ruleName);
        if (deployed == null) {
            System.out.println("Rule '" + ruleName + "' not deployed");
            return;
        }

        runtime.getDeploymentService().undeploy(deployed.getDeploymentId());
        deployedRules.remove(ruleName);
        System.out.println("✓ Undeployed rule: " + ruleName);
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
}
