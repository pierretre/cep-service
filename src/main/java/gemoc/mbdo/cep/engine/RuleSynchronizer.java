package gemoc.mbdo.cep.engine;

import gemoc.mbdo.cep.shared.model.Rule;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Synchronizes rules from the database to the CEP engine
 * Polls the database periodically for rule changes
 */
public class RuleSynchronizer {

    private final String jdbcUrl;
    private final String username;
    private final String password;
    private final EsperCepEngineImpl cepEngine;
    private LocalDateTime lastSync;
    private final int pollIntervalMs;

    public RuleSynchronizer(String jdbcUrl, String username, String password,
                            EsperCepEngineImpl cepEngine, int pollIntervalMs) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
        this.cepEngine = cepEngine;
        this.pollIntervalMs = pollIntervalMs;
        this.lastSync = LocalDateTime.now().minusYears(1); // Start with old date to load all rules
    }

    /**
     * Start synchronization loop
     */
    public void start() {
        Thread syncThread = new Thread(() -> {
            System.out.println("Rule Synchronizer started (polling every " + pollIntervalMs + "ms)");

            while (!Thread.currentThread().isInterrupted()) {
                try {
                    synchronizeRules();
                    Thread.sleep(pollIntervalMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    System.err.println("Error synchronizing rules: " + e.getMessage());
                    e.printStackTrace();
                }
            }
        });

        syncThread.setDaemon(false);
        syncThread.start();
    }

    /**
     * Synchronize rules from database
     */
    private void synchronizeRules() throws Exception {
        List<Rule> activeRules = getActiveRulesFromDb();
        List<Rule> allRules = getAllRulesFromDb();

        // Deploy new/updated active rules
        for (Rule rule : activeRules) {
            if (!cepEngine.isRuleDeployed(rule.getName())) {
                try {
                    cepEngine.deployRule(rule);
                } catch (Exception e) {
                    System.err.println("Failed to deploy rule '" + rule.getName() + "': " + e.getMessage());
                }
            }
        }

        // Undeploy inactive rules
        for (Rule rule : allRules) {
            if (!rule.getActive() && cepEngine.isRuleDeployed(rule.getName())) {
                try {
                    cepEngine.undeployRule(rule.getName());
                } catch (Exception e) {
                    System.err.println("Failed to undeploy rule '" + rule.getName() + "': " + e.getMessage());
                }
            }
        }

        lastSync = LocalDateTime.now();
    }

    private List<Rule> getActiveRulesFromDb() throws SQLException {
        List<Rule> rules = new ArrayList<>();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement stmt = conn.prepareStatement(
                     "SELECT id, name, epl_query, description, active, created_at, updated_at, deployment_id " +
                             "FROM rules WHERE active = true")) {

            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                Rule rule = mapResultSetToRule(rs);
                rules.add(rule);
            }
        }

        return rules;
    }

    private List<Rule> getAllRulesFromDb() throws SQLException {
        List<Rule> rules = new ArrayList<>();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement stmt = conn.prepareStatement(
                     "SELECT id, name, epl_query, description, active, created_at, updated_at, deployment_id " +
                             "FROM rules")) {

            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                Rule rule = mapResultSetToRule(rs);
                rules.add(rule);
            }
        }

        return rules;
    }

    private Rule mapResultSetToRule(ResultSet rs) throws SQLException {
        Rule rule = new Rule();
        rule.setId(rs.getLong("id"));
        rule.setName(rs.getString("name"));
        rule.setEplQuery(rs.getString("epl_query"));
        rule.setDescription(rs.getString("description"));
        rule.setActive(rs.getBoolean("active"));

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            rule.setCreatedAt(createdAt.toLocalDateTime());
        }

        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) {
            rule.setUpdatedAt(updatedAt.toLocalDateTime());
        }

        rule.setDeploymentId(rs.getString("deployment_id"));

        return rule;
    }
}
