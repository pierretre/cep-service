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

/**
 * Complete demo with REST API + Kafka + Dynamic Rules
 * <p>
 * Usage:
 * 1. Start this application
 * 2. Use KafkaEventProducer to send events
 * 3. Use curl or Postman to manage rules via REST API
 * <p>
 * Example API calls:
 * <p>
 * # List rules
 * curl http://localhost:8080/rules
 * <p>
 * # Add a rule
 * curl -X POST http://localhost:8080/rules \
 * -H "Content-Type: application/json" \
 * -d '{"name":"my-rule","epl":"select * from Event(type=\"alert\" and value >
 * 100)"}'
 * <p>
 * # Remove a rule
 * curl -X DELETE http://localhost:8080/rules/my-rule
 */
public class DynamicRuleAPIDemo {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String KAFKA_TOPIC = "events";
    private static final String KAFKA_GROUP_ID = "esper-api-consumer";
    private static final int API_PORT = 8080;

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== DYNAMIC RULE SERVICE WITH REST API & KAFKA ===\n");

        // Configure Esper
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Event.class);

        // Create runtime and service
        EPRuntime runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        DynamicRuleService ruleService = new DynamicRuleService(
                runtime,
                EPCompilerProvider.getCompiler(),
                configuration);

        // Start REST API
        RuleManagementAPI api = new RuleManagementAPI(ruleService, API_PORT);
        api.start();

        // Create and start Kafka consumer
        KafkaConsumer<String, Event> consumer = createKafkaConsumer();
        Thread kafkaThread = startKafkaConsumer(consumer, runtime);

        // Load initial rules
        loadInitialRules(ruleService);

        System.out.println("\n=== System Ready ===");
        System.out.println("Press Ctrl+C to stop\n");

        // Keep running
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nShutting down...");
            api.stop();
            kafkaThread.interrupt();
            consumer.close();
            runtime.destroy();
        }));

        Thread.currentThread().join();
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
            System.out.println("Kafka consumer listening on topic: " + KAFKA_TOPIC);

            try {
                while (!Thread.currentThread().isInterrupted()) {
                    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(100));
                    for (ConsumerRecord<String, Event> record : records) {
                        Event event = record.value();
                        System.out.println("[KAFKA] " + event);
                        runtime.getEventService().sendEventBean(event, "Event");
                    }
                }
            } catch (Exception e) {
                if (!Thread.currentThread().isInterrupted()) {
                    e.printStackTrace();
                }
            }
        });

        thread.setDaemon(true);
        thread.start();
        return thread;
    }

    private static void loadInitialRules(DynamicRuleService ruleService) {
        System.out.println("Loading initial rules...\n");

        ruleService.addRule(
                "high-value-alerts",
                "select * from Event(type='alert' and value > 100)",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[HIGH-VALUE-ALERT] " + event.getUnderlying());
                    }
                });

        ruleService.addRule(
                "error-events",
                "select * from Event(type='error')",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[ERROR] " + event.getUnderlying());
                    }
                });

        System.out.println();
    }
}
