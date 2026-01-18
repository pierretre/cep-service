package gemoc.mbdo.cep.engine;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

/**
 * CEP Engine Application
 * 
 * This is a standalone application that:
 * 1. Initializes the Esper CEP engine
 * 2. Polls the database for rule changes
 * 3. Consumes events from Kafka
 * 4. Processes events against active rules
 * 
 * Configuration is read from application.yml
 */
public class CepEngineApplication {

    public static void main(String[] args) {

        System.out.println("\n╔════════════════════════════════════════╗");
        System.out.println("║     CEP ENGINE APPLICATION             ║");
        System.out.println("╚════════════════════════════════════════╝\n");

        // Load configuration
        Properties config = loadConfiguration();

        String jdbcUrl = config.getProperty("cep.database.url", "jdbc:postgresql://localhost:5432/cep_rules");
        String dbUsername = config.getProperty("cep.database.username", "postgres");
        String dbPassword = config.getProperty("cep.database.password", "postgres");
        String kafkaBootstrapServers = config.getProperty("cep.kafka.bootstrap-servers", "localhost:9092");
        String kafkaTopic = config.getProperty("cep.kafka.topic", "events");
        String kafkaGroupId = config.getProperty("cep.kafka.group-id", "cep-engine-consumer");
        boolean usePostgresNotify = Boolean.parseBoolean(
                config.getProperty("cep.database.use-postgres-notify", "true"));
        int ruleSyncInterval = Integer.parseInt(config.getProperty("cep.rule-sync-interval-ms", "5000"));

        // Initialize CEP Engine
        EsperCepEngineImpl cepEngine = new EsperCepEngineImpl();

        // Start Rule Synchronizer (PostgreSQL LISTEN/NOTIFY or Polling)
        PostgresRuleNotificationListener notificationListener = null;
        RuleSynchronizer pollingSynchronizer = null;

        if (usePostgresNotify && jdbcUrl.contains("postgresql")) {
            // Use PostgreSQL LISTEN/NOTIFY for real-time updates
            try {
                notificationListener = new PostgresRuleNotificationListener(
                        jdbcUrl, dbUsername, dbPassword, cepEngine);
                notificationListener.start();
                System.out.println("✓ Using PostgreSQL LISTEN/NOTIFY for real-time rule updates");
            } catch (Exception e) {
                System.err.println("Failed to start PostgreSQL notification listener: " + e.getMessage());
                System.err.println("Falling back to polling mode...");
                pollingSynchronizer = new RuleSynchronizer(
                        jdbcUrl, dbUsername, dbPassword, cepEngine, ruleSyncInterval);
                pollingSynchronizer.start();
            }
        } else {
            // Use polling for H2 or when LISTEN/NOTIFY is disabled
            pollingSynchronizer = new RuleSynchronizer(
                    jdbcUrl, dbUsername, dbPassword, cepEngine, ruleSyncInterval);
            pollingSynchronizer.start();
            System.out.println("✓ Using polling mode for rule synchronization");
        }

        // Start Kafka Consumer
        KafkaEventConsumer kafkaConsumer = new KafkaEventConsumer(
                kafkaBootstrapServers,
                kafkaTopic,
                kafkaGroupId,
                cepEngine);
        kafkaConsumer.start();

        System.out.println("\n╔════════════════════════════════════════╗");
        System.out.println("║     CEP ENGINE READY                   ║");
        System.out.println("╠════════════════════════════════════════╣");
        System.out.println("║  Database: " + jdbcUrl);
        System.out.println("║  DB User: " + dbUsername);
        System.out.println("║  Kafka: " + kafkaBootstrapServers);
        System.out.println("║  Topic: " + kafkaTopic);
        if (usePostgresNotify && notificationListener != null) {
            System.out.println("║  Rule Sync: PostgreSQL LISTEN/NOTIFY (real-time)");
        } else {
            System.out.println("║  Rule Sync: Polling every " + (ruleSyncInterval / 1000) + "s");
        }
        System.out.println("╚════════════════════════════════════════╝\n");

        // Shutdown hook
        final PostgresRuleNotificationListener finalListener = notificationListener;
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nShutting down CEP Engine...");
            kafkaConsumer.stop();
            if (finalListener != null) {
                finalListener.stop();
            }
            cepEngine.shutdown();
            System.out.println("CEP Engine shut down successfully");
        }));

        // Keep application running
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static Properties loadConfiguration() {
        Properties props = new Properties();

        // Try to load from classpath (works in both IDE and Docker)
        try (InputStream input = CepEngineApplication.class.getClassLoader().getResourceAsStream("application.yml")) {
            if (input == null) {
                System.out.println("Could not find application.yml in classpath, using defaults");
            } else {
                // Simple YAML parser for our specific CEP configuration section
                java.util.Scanner scanner = new java.util.Scanner(input);
                boolean inCepSection = false;
                boolean inDatabaseSection = false;
                boolean inKafkaSection = false;

                while (scanner.hasNextLine()) {
                    String line = scanner.nextLine();
                    String trimmed = line.trim();

                    if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                        continue;
                    }

                    // Check for main sections
                    if (trimmed.equals("cep:")) {
                        inCepSection = true;
                        inDatabaseSection = false;
                        inKafkaSection = false;
                        continue;
                    } else if (!line.startsWith(" ") && !line.startsWith("\t")) {
                        // Reset all sections if we hit a top-level key
                        inCepSection = false;
                        inDatabaseSection = false;
                        inKafkaSection = false;
                        continue;
                    }

                    // Check for subsections within cep
                    if (inCepSection) {
                        if (trimmed.equals("database:")) {
                            inDatabaseSection = true;
                            inKafkaSection = false;
                            continue;
                        } else if (trimmed.equals("kafka:")) {
                            inKafkaSection = true;
                            inDatabaseSection = false;
                            continue;
                        }
                    }

                    // Parse key-value pairs
                    if (trimmed.contains(":") && !trimmed.endsWith(":")) {
                        String[] parts = trimmed.split(":", 2);
                        String key = parts[0].trim();
                        String value = parts[1].trim();

                        if (inDatabaseSection) {
                            props.setProperty("cep.database." + key, value);
                        } else if (inKafkaSection) {
                            props.setProperty("cep.kafka." + key, value);
                        } else if (inCepSection) {
                            props.setProperty("cep." + key, value);
                        }
                    }
                }
                scanner.close();

                System.out.println("Configuration loaded from application.yml");
            }
        } catch (Exception e) {
            System.out.println("Could not load application.yml, using defaults: " + e.getMessage());
        }

        // Override with environment variables (Docker-friendly)
        String envDbUrl = System.getenv("CEP_DATABASE_URL");
        if (envDbUrl != null && !envDbUrl.isEmpty()) {
            props.setProperty("cep.database.url", envDbUrl);
            System.out.println("Using database URL from environment: " + envDbUrl);
        }

        String envDbUsername = System.getenv("CEP_DATABASE_USERNAME");
        if (envDbUsername != null && !envDbUsername.isEmpty()) {
            props.setProperty("cep.database.username", envDbUsername);
        }

        String envDbPassword = System.getenv("CEP_DATABASE_PASSWORD");
        if (envDbPassword != null && !envDbPassword.isEmpty()) {
            props.setProperty("cep.database.password", envDbPassword);
        }

        String envUsePostgresNotify = System.getenv("CEP_DATABASE_USE_POSTGRES_NOTIFY");
        if (envUsePostgresNotify != null && !envUsePostgresNotify.isEmpty()) {
            props.setProperty("cep.database.use-postgres-notify", envUsePostgresNotify);
        }

        String envKafkaServers = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (envKafkaServers != null && !envKafkaServers.isEmpty()) {
            props.setProperty("cep.kafka.bootstrap-servers", envKafkaServers);
        }

        String envKafkaTopic = System.getenv("KAFKA_TOPIC");
        if (envKafkaTopic != null && !envKafkaTopic.isEmpty()) {
            props.setProperty("cep.kafka.topic", envKafkaTopic);
        }

        String envKafkaGroupId = System.getenv("KAFKA_GROUP_ID");
        if (envKafkaGroupId != null && !envKafkaGroupId.isEmpty()) {
            props.setProperty("cep.kafka.group-id", envKafkaGroupId);
        }

        return props;
    }

}
