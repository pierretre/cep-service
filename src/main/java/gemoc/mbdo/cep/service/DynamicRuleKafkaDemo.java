package gemoc.mbdo.cep.service;

import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.EPRuntime;
import com.espertech.esper.runtime.client.EPRuntimeProvider;
import gemoc.mbdo.cep.engine.model.Event;
import gemoc.mbdo.cep.EventDeserializer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;
import java.util.Scanner;

/**
 * Kafka-integrated demo with dynamic rule management
 */
public class DynamicRuleKafkaDemo {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String KAFKA_TOPIC = "events";
    private static final String KAFKA_GROUP_ID = "esper-dynamic-rule-consumer";

    private static volatile boolean running = true;

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== DYNAMIC RULE SERVICE WITH KAFKA ===\n");

        // Configure Esper
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Event.class);

        // Create runtime and service
        EPRuntime runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        DynamicRuleService ruleService = new DynamicRuleService(
                runtime,
                EPCompilerProvider.getCompiler(),
                configuration);

        // Create Kafka consumer
        KafkaConsumer<String, Event> consumer = createKafkaConsumer();

        // Start Kafka consumer thread
        Thread kafkaThread = startKafkaConsumer(consumer, runtime);

        // Load some default rules
        loadDefaultRules(ruleService);

        // Interactive CLI
        runInteractiveCLI(ruleService);

        // Cleanup
        running = false;
        kafkaThread.interrupt();
        consumer.close();
        runtime.destroy();
        System.out.println("\n=== DEMO COMPLETE ===\n");
    }

    private static KafkaConsumer<String, Event> createKafkaConsumer() {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, KAFKA_GROUP_ID);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, EventDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        KafkaConsumer<String, Event> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(KAFKA_TOPIC));
        return consumer;
    }

    private static Thread startKafkaConsumer(KafkaConsumer<String, Event> consumer, EPRuntime runtime) {
        Thread thread = new Thread(() -> {
            System.out.println("Kafka consumer started, listening to topic: " + KAFKA_TOPIC + "\n");

            try {
                while (running && !Thread.currentThread().isInterrupted()) {
                    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(100));
                    for (ConsumerRecord<String, Event> record : records) {
                        Event event = record.value();
                        System.out.println("[KAFKA] Received: " + event);
                        runtime.getEventService().sendEventBean(event, "Event");
                    }
                }
            } catch (Exception e) {
                if (running) {
                    e.printStackTrace();
                }
            }
        });

        thread.setDaemon(true);
        thread.start();
        return thread;
    }

    private static void loadDefaultRules(DynamicRuleService ruleService) {
        System.out.println("Loading default rules...\n");

        // High value alerts
        ruleService.addRule(
                "high-value-alert",
                "select * from Event(type='alert' and value > 100)",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[HIGH-VALUE] " + event.getUnderlying());
                    }
                });

        // Pattern detection
        ruleService.addRule(
                "alert-pattern",
                "select a.id as first, b.id as second from pattern [every a=Event(type='alert' and value > 100) -> b=Event(type='alert' and value > 100)]",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[PATTERN] Consecutive high alerts: " +
                                event.get("first") + " -> " + event.get("second"));
                    }
                });

        System.out.println();
    }

    private static void runInteractiveCLI(DynamicRuleService ruleService) {
        Scanner scanner = new Scanner(System.in);

        printHelp();

        while (running) {
            System.out.print("\n> ");
            String input = scanner.nextLine().trim();

            if (input.isEmpty()) {
                continue;
            }

            String[] parts = input.split("\\s+", 2);
            String command = parts[0].toLowerCase();

            switch (command) {
                case "add":
                    handleAddRule(ruleService, scanner);
                    break;

                case "remove":
                    if (parts.length < 2) {
                        System.out.println("Usage: remove <rule-name>");
                    } else {
                        ruleService.removeRule(parts[1]);
                    }
                    break;

                case "list":
                    ruleService.listRules();
                    break;

                case "quick":
                    handleQuickAdd(ruleService, parts);
                    break;

                case "templates":
                    showTemplates();
                    break;

                case "help":
                    printHelp();
                    break;

                case "exit":
                case "quit":
                    running = false;
                    break;

                default:
                    System.out.println("Unknown command. Type 'help' for available commands.");
            }
        }

        scanner.close();
    }

    private static void handleAddRule(DynamicRuleService ruleService, Scanner scanner) {
        System.out.print("Rule name: ");
        String ruleName = scanner.nextLine().trim();

        if (ruleName.isEmpty()) {
            System.out.println("Rule name cannot be empty");
            return;
        }

        System.out.print("EPL query: ");
        String epl = scanner.nextLine().trim();

        if (epl.isEmpty()) {
            System.out.println("EPL query cannot be empty");
            return;
        }

        ruleService.addRule(ruleName, epl, events -> {
            for (com.espertech.esper.common.client.EventBean event : events) {
                System.out.println("[" + ruleName + "] " + formatEventBean(event));
            }
        });
    }

    private static void handleQuickAdd(DynamicRuleService ruleService, String[] parts) {
        if (parts.length < 2) {
            System.out.println("Usage: quick <template-number>");
            return;
        }

        try {
            int templateNum = Integer.parseInt(parts[1]);
            String ruleName = "quick-rule-" + System.currentTimeMillis();

            switch (templateNum) {
                case 1:
                    ruleService.addRule(ruleName,
                            "select * from Event(type='error')",
                            events -> System.out.println("[ERROR-FILTER] " + events[0].getUnderlying()));
                    break;
                case 2:
                    ruleService.addRule(ruleName,
                            "select * from Event(value > 150)",
                            events -> System.out.println("[HIGH-VALUE] " + events[0].getUnderlying()));
                    break;
                case 3:
                    ruleService.addRule(ruleName,
                            "select type, count(*) as cnt from Event#time(10 sec) group by type",
                            events -> System.out.println("[COUNT] " + formatEventBean(events[0])));
                    break;
                default:
                    System.out.println("Invalid template number. Use 1-3.");
            }
        } catch (NumberFormatException e) {
            System.out.println("Invalid template number");
        }
    }

    private static String formatEventBean(com.espertech.esper.common.client.EventBean eventBean) {
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

    private static void showTemplates() {
        System.out.println("\n=== Quick Rule Templates ===");
        System.out.println("1. Filter error events");
        System.out.println("2. High value filter (>150)");
        System.out.println("3. Count by type (10 sec window)");
        System.out.println("\nUsage: quick <number>");
    }

    private static void printHelp() {
        System.out.println("\n=== Available Commands ===");
        System.out.println("  add        - Add a new rule (interactive)");
        System.out.println("  remove     - Remove a rule by name");
        System.out.println("  list       - List all active rules");
        System.out.println("  quick      - Add a quick template rule");
        System.out.println("  templates  - Show available templates");
        System.out.println("  help       - Show this help message");
        System.out.println("  exit/quit  - Exit the application");
        System.out.println("\nNote: Events are consumed from Kafka topic '" + KAFKA_TOPIC + "'");
        System.out.println("Use KafkaEventProducer to send test events.");
    }
}
