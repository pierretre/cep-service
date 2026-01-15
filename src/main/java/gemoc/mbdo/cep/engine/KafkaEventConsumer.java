package gemoc.mbdo.cep.engine;

import gemoc.mbdo.cep.EventDeserializer;
import gemoc.mbdo.cep.engine.model.Event;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

/**
 * Kafka consumer that feeds events to the CEP engine
 */
public class KafkaEventConsumer {

    private final String bootstrapServers;
    private final String topic;
    private final String groupId;
    private final EsperCepEngineImpl cepEngine;
    private KafkaConsumer<String, Event> consumer;
    private volatile boolean running = false;

    public KafkaEventConsumer(String bootstrapServers, String topic, String groupId, EsperCepEngineImpl cepEngine) {
        this.bootstrapServers = bootstrapServers;
        this.topic = topic;
        this.groupId = groupId;
        this.cepEngine = cepEngine;
    }

    /**
     * Start consuming events from Kafka
     */
    public void start() {
        consumer = createKafkaConsumer();
        running = true;

        Thread consumerThread = new Thread(() -> {
            System.out.println("Kafka Event Consumer started");
            System.out.println("  Bootstrap Servers: " + bootstrapServers);
            System.out.println("  Topic: " + topic);
            System.out.println("  Group ID: " + groupId);
            System.out.println();

            try {
                while (running && !Thread.currentThread().isInterrupted()) {
                    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(100));

                    for (ConsumerRecord<String, Event> record : records) {
                        Event event = record.value();
                        System.out.println("[KAFKA] Received: " + event);

                        // Send event to CEP engine
                        cepEngine.sendEvent(event);
                    }
                }
            } catch (Exception e) {
                if (running) {
                    System.err.println("Error in Kafka consumer: " + e.getMessage());
                    e.printStackTrace();
                }
            } finally {
                if (consumer != null) {
                    consumer.close();
                }
            }
        });

        consumerThread.setDaemon(false);
        consumerThread.start();
    }

    /**
     * Stop consuming events
     */
    public void stop() {
        running = false;
        if (consumer != null) {
            consumer.wakeup();
        }
        System.out.println("Kafka Event Consumer stopped");
    }

    private KafkaConsumer<String, Event> createKafkaConsumer() {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, EventDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        KafkaConsumer<String, Event> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));
        return consumer;
    }
}
