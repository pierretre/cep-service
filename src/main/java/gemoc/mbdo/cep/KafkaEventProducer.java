package gemoc.mbdo.cep;

import gemoc.mbdo.cep.engine.model.Event;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class KafkaEventProducer {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String KAFKA_TOPIC = "events";

    public static void main(String[] args) throws InterruptedException {
        System.out.println("\n=== KAFKA EVENT PRODUCER ===\n");

        KafkaProducer<String, Event> producer = createKafkaProducer();

        try {
            long timestamp = System.currentTimeMillis();

            System.out.println("Sending events to Kafka topic: " + KAFKA_TOPIC + "\n");

            // Send sample events (same as in demos)
            sendEvent(producer, new Event("1", "alert", 150.0, timestamp));
            Thread.sleep(100);

            sendEvent(producer, new Event("2", "alert", 120.0, timestamp + 100));
            Thread.sleep(100);

            sendEvent(producer, new Event("3", "info", 50.0, timestamp + 200));
            Thread.sleep(100);

            sendEvent(producer, new Event("4", "alert", 80.0, timestamp + 300));
            Thread.sleep(100);

            sendEvent(producer, new Event("5", "info", 30.0, timestamp + 400));
            Thread.sleep(100);

            System.out.println("\nAll events sent successfully!");
            System.out.println("Both Flink and Esper consumers should process these events.\n");

        } finally {
            producer.close();
        }
    }

    private static KafkaProducer<String, Event> createKafkaProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, EventSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 0);

        return new KafkaProducer<>(props);
    }

    private static void sendEvent(KafkaProducer<String, Event> producer, Event event) {
        ProducerRecord<String, Event> record = new ProducerRecord<>(KAFKA_TOPIC, event.getId(), event);
        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                System.err.println("Error sending event: " + exception.getMessage());
            } else {
                System.out.println("Sent: " + event + " to partition " + metadata.partition());
            }
        });
    }
}
