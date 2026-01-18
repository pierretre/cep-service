package gemoc.mbdo.cep.engine;

import gemoc.mbdo.cep.shared.model.Rule;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;

import java.sql.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Listens to PostgreSQL NOTIFY events for real-time rule synchronization
 * Uses PostgreSQL's LISTEN/NOTIFY mechanism for instant updates
 */
public class PostgresRuleNotificationListener {

    private final String jdbcUrl;
    private final String username;
    private final String password;
    private final EsperCepEngineImpl cepEngine;
    private Connection connection;
    private PGConnection pgConnection;
    private volatile boolean running = false;
    private Thread listenerThread;
    private final ScheduledExecutorService keepAliveExecutor;

    public PostgresRuleNotificationListener(String jdbcUrl, String username, String password,
            EsperCepEngineImpl cepEngine) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
        this.cepEngine = cepEngine;
        this.keepAliveExecutor = Executors.newSingleThreadScheduledExecutor();
    }

    /**
     * Start listening for notifications
     */
    public void start() throws SQLException {
        System.out.println("Starting PostgreSQL LISTEN/NOTIFY rule synchronizer...");

        // Establish connection
        connection = DriverManager.getConnection(jdbcUrl, username, password);
        pgConnection = connection.unwrap(PGConnection.class);

        // Create LISTEN statement
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("LISTEN rule_changes");
        }

        System.out.println("✓ Listening on channel: rule_changes");

        // Load initial rules
        loadAllRules();

        // Start notification listener thread
        running = true;
        listenerThread = new Thread(this::listenForNotifications);
        listenerThread.setDaemon(false);
        listenerThread.start();

        // Keep-alive to prevent connection timeout
        keepAliveExecutor.scheduleAtFixedRate(this::sendKeepAlive, 30, 30, TimeUnit.SECONDS);

        System.out.println("✓ PostgreSQL notification listener started");
    }

    /**
     * Stop listening
     */
    public void stop() {
        running = false;
        keepAliveExecutor.shutdown();

        if (listenerThread != null) {
            listenerThread.interrupt();
        }

        try {
            if (connection != null && !connection.isClosed()) {
                try (Statement stmt = connection.createStatement()) {
                    stmt.execute("UNLISTEN rule_changes");
                }
                connection.close();
            }
        } catch (SQLException e) {
            System.err.println("Error closing connection: " + e.getMessage());
        }

        System.out.println("PostgreSQL notification listener stopped");
    }

    /**
     * Listen for notifications in a loop
     */
    private void listenForNotifications() {
        System.out.println("Notification listener thread started");

        while (running) {
            try {
                // Check for notifications (non-blocking with timeout)
                PGNotification[] notifications = pgConnection.getNotifications(1000);

                if (notifications != null && notifications.length > 0) {
                    for (PGNotification notification : notifications) {
                        handleNotification(notification);
                    }
                }

            } catch (SQLException e) {
                if (running) {
                    System.err.println("Error receiving notifications: " + e.getMessage());
                    // Try to reconnect
                    try {
                        Thread.sleep(5000);
                        reconnect();
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    } catch (SQLException se) {
                        System.err.println("Failed to reconnect: " + se.getMessage());
                    }
                }
            }
        }

        System.out.println("Notification listener thread stopped");
    }

    /**
     * Handle a notification
     */
    private void handleNotification(PGNotification notification) {
        String channel = notification.getName();
        String payload = notification.getParameter();

        System.out.println("[NOTIFY] Channel: " + channel + ", Payload: " + payload);

        try {
            // Payload format: "operation:rule_id:rule_name"
            // Examples: "INSERT:1:high-temp", "UPDATE:1:high-temp", "DELETE:1:high-temp"
            String[] parts = payload.split(":", 3);
            String operation = parts[0];
            Long ruleId = Long.parseLong(parts[1]);
            String ruleName = parts.length > 2 ? parts[2] : null;

            switch (operation) {
                case "INSERT":
                case "UPDATE":
                    handleRuleUpsert(ruleId);
                    break;
                case "DELETE":
                    handleRuleDelete(ruleName);
                    break;
                default:
                    System.err.println("Unknown operation: " + operation);
            }

        } catch (Exception e) {
            System.err.println("Error handling notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Handle rule insert or update
     */
    private void handleRuleUpsert(Long ruleId) throws Exception {
        Rule rule = getRuleById(ruleId);

        if (rule == null) {
            System.err.println("Rule not found: " + ruleId);
            return;
        }

        if (rule.getActive()) {
            // Deploy or redeploy the rule
            if (cepEngine.isRuleDeployed(rule.getName())) {
                System.out.println("Redeploying updated rule: " + rule.getName());
                cepEngine.undeployRule(rule.getName());
            }
            cepEngine.deployRule(rule);
        } else {
            // Undeploy if inactive
            if (cepEngine.isRuleDeployed(rule.getName())) {
                cepEngine.undeployRule(rule.getName());
            }
        }
    }

    /**
     * Handle rule deletion
     */
    private void handleRuleDelete(String ruleName) {
        try {
            if (ruleName != null && cepEngine.isRuleDeployed(ruleName)) {
                cepEngine.undeployRule(ruleName);
            }
        } catch (Exception e) {
            System.err.println("Error undeploying deleted rule: " + e.getMessage());
        }
    }

    /**
     * Load all active rules on startup
     */
    private void loadAllRules() {
        System.out.println("Loading initial rules from database...");

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
                PreparedStatement stmt = conn.prepareStatement(
                        "SELECT id, name, epl_query, description, active, created_at, updated_at, deployment_id " +
                                "FROM rules WHERE active = true")) {

            ResultSet rs = stmt.executeQuery();
            int count = 0;

            while (rs.next()) {
                Rule rule = mapResultSetToRule(rs);
                try {
                    cepEngine.deployRule(rule);
                    count++;
                } catch (Exception e) {
                    System.err.println("Failed to deploy rule '" + rule.getName() + "': " + e.getMessage());
                }
            }

            System.out.println("✓ Loaded " + count + " active rules");

        } catch (SQLException e) {
            System.err.println("Error loading initial rules: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Get rule by ID
     */
    private Rule getRuleById(Long id) throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
                PreparedStatement stmt = conn.prepareStatement(
                        "SELECT id, name, epl_query, description, active, created_at, updated_at, deployment_id " +
                                "FROM rules WHERE id = ?")) {

            stmt.setLong(1, id);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return mapResultSetToRule(rs);
            }
        }

        return null;
    }

    /**
     * Map ResultSet to Rule object
     */
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

    /**
     * Send keep-alive query to prevent connection timeout
     */
    private void sendKeepAlive() {
        try {
            if (connection != null && !connection.isClosed()) {
                try (Statement stmt = connection.createStatement()) {
                    stmt.execute("SELECT 1");
                }
            }
        } catch (SQLException e) {
            System.err.println("Keep-alive failed: " + e.getMessage());
        }
    }

    /**
     * Reconnect to database
     */
    private void reconnect() throws SQLException {
        System.out.println("Attempting to reconnect...");

        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException e) {
                // Ignore
            }
        }

        connection = DriverManager.getConnection(jdbcUrl, username, password);
        pgConnection = connection.unwrap(PGConnection.class);

        try (Statement stmt = connection.createStatement()) {
            stmt.execute("LISTEN rule_changes");
        }

        System.out.println("✓ Reconnected successfully");
    }
}
