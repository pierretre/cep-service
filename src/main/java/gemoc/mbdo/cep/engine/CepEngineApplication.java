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

        String jdbcUrl = config.getProperty("cep.database.url", "jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE");
        String dbUsername = config.getProperty("cep.database.username", "sa");
        String dbPassword = config.getProperty("cep.database.password", "");
        String kafkaBootstrapServers = config.getProperty("cep.kafka.bootstrap-servers", "localhost:9092");
        String kafkaTopic = config.getProperty("cep.kafka.topic", "events");
        String kafkaGroupId = config.getProperty("cep.kafka.group-id", "cep-engine-consumer");
        int ruleSyncInterval = Integer.parseInt(config.getProperty("cep.rule-sync-interval-ms", "5000"));

        // Initialize CEP Engine
        EsperCepEngineImpl cepEngine = new EsperCepEngineImpl();

        // Start Rule Synchronizer
        RuleSynchronizer ruleSynchronizer = new RuleSynchronizer(
                jdbcUrl, dbUsername, dbPassword, cepEngine, ruleSyncInterval);
        ruleSynchronizer.start();

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
        System.out.println("║  Rule Sync: Every " + (ruleSyncInterval / 1000) + "s");
        System.out.println("╚════════════════════════════════════════╝\n");

        // Shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nShutting down CEP Engine...");
            kafkaConsumer.stop();
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

        // Try to load from application.yml (convert YAML to properties format)
        try (InputStream input = new FileInputStream("src/main/resources/application.yml")) {
            // Simple YAML parser for our specific format
            java.util.Scanner scanner = new java.util.Scanner(input);
            String currentPrefix = "";

            while (scanner.hasNextLine()) {
                String line = scanner.nextLine().trim();

                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                if (line.startsWith("cep:")) {
                    currentPrefix = "cep";
                } else if (line.startsWith("database:") && currentPrefix.equals("cep")) {
                    currentPrefix = "cep.database";
                } else if (line.startsWith("kafka:") && currentPrefix.equals("cep")) {
                    currentPrefix = "cep.kafka";
                } else if (line.contains(":") && !line.endsWith(":")) {
                    String[] parts = line.split(":", 2);
                    String key = parts[0].trim();
                    String value = parts[1].trim();
                    props.setProperty(currentPrefix + "." + key, value);
                }
            }
            scanner.close();

            System.out.println("Configuration loaded from application.yml");
        } catch (Exception e) {
            System.out.println("Could not load application.yml, using defaults: " + e.getMessage());
        }

        return props;
    }
}
