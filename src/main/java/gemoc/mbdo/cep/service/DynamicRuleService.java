package gemoc.mbdo.cep.service;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.runtime.client.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Service for dynamically managing EPL rules in Esper CEP engine at runtime.
 * Allows adding, removing, and listing rules while the engine is running.
 */
public class DynamicRuleService {

    private final EPRuntime runtime;
    private final EPCompiler compiler;
    private final Configuration configuration;
    final Map<String, RuleMetadata> activeRules;

    public DynamicRuleService(EPRuntime runtime, EPCompiler compiler, Configuration configuration) {
        this.runtime = runtime;
        this.compiler = compiler;
        this.configuration = configuration;
        this.activeRules = new ConcurrentHashMap<>();
    }

    /**
     * Add a new EPL rule dynamically
     * 
     * @param ruleName Unique name for the rule
     * @param epl      EPL query string
     * @param listener Listener to handle matched events
     * @return true if rule was added successfully, false otherwise
     */
    public boolean addRule(String ruleName, String epl, UpdateListener listener) {
        if (activeRules.containsKey(ruleName)) {
            System.err.println("Rule '" + ruleName + "' already exists. Remove it first or use a different name.");
            return false;
        }

        try {
            // Compile the EPL
            String namedEpl = "@name('" + ruleName + "') " + epl;
            EPCompiled compiled = compile(namedEpl);

            // Deploy the rule
            EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);

            // Get the statement and attach listener
            EPStatement statement = runtime.getDeploymentService()
                    .getStatement(deployment.getDeploymentId(), ruleName);

            if (listener != null) {
                statement.addListener(listener);
            }

            // Store metadata
            activeRules.put(ruleName, new RuleMetadata(ruleName, epl, deployment.getDeploymentId(), listener));

            System.out.println("✓ Rule '" + ruleName + "' added successfully");
            return true;

        } catch (Exception e) {
            System.err.println("✗ Failed to add rule '" + ruleName + "': " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Add a rule with a simple event consumer
     */
    public boolean addRule(String ruleName, String epl,
            Consumer<com.espertech.esper.common.client.EventBean[]> eventConsumer) {
        UpdateListener listener = (newEvents, oldEvents, stmt, rt) -> {
            if (newEvents != null && eventConsumer != null) {
                eventConsumer.accept(newEvents);
            }
        };
        return addRule(ruleName, epl, listener);
    }

    /**
     * Remove an existing rule
     */
    public boolean removeRule(String ruleName) {
        RuleMetadata metadata = activeRules.get(ruleName);
        if (metadata == null) {
            System.err.println("Rule '" + ruleName + "' not found");
            return false;
        }

        try {
            runtime.getDeploymentService().undeploy(metadata.deploymentId);
            activeRules.remove(ruleName);
            System.out.println("✓ Rule '" + ruleName + "' removed successfully");
            return true;
        } catch (Exception e) {
            System.err.println("✗ Failed to remove rule '" + ruleName + "': " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * List all active rules
     */
    public void listRules() {
        if (activeRules.isEmpty()) {
            System.out.println("No active rules");
            return;
        }

        System.out.println("\n=== Active Rules ===");
        activeRules.forEach((name, metadata) -> {
            System.out.println("Rule: " + name);
            System.out.println("  EPL: " + metadata.epl);
            System.out.println("  Deployment ID: " + metadata.deploymentId);
            System.out.println();
        });
    }

    /**
     * Get rule metadata
     */
    public RuleMetadata getRuleMetadata(String ruleName) {
        return activeRules.get(ruleName);
    }

    /**
     * Check if a rule exists
     */
    public boolean hasRule(String ruleName) {
        return activeRules.containsKey(ruleName);
    }

    /**
     * Get count of active rules
     */
    public int getRuleCount() {
        return activeRules.size();
    }

    /**
     * Remove all rules
     */
    public void removeAllRules() {
        activeRules.keySet().forEach(this::removeRule);
    }

    private EPCompiled compile(String epl) throws EPCompileException {
        CompilerArguments args = new CompilerArguments(configuration);
        return compiler.compile(epl, args);
    }

    /**
     * Metadata for tracking deployed rules
     */
    public static class RuleMetadata {
        public final String ruleName;
        public final String epl;
        public final String deploymentId;
        public final UpdateListener listener;

        public RuleMetadata(String ruleName, String epl, String deploymentId, UpdateListener listener) {
            this.ruleName = ruleName;
            this.epl = epl;
            this.deploymentId = deploymentId;
            this.listener = listener;
        }
    }
}
