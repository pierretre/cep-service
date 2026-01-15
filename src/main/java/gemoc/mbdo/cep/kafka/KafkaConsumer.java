package gemoc.mbdo.cep.kafka;

import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.EPRuntime;
import com.espertech.esper.runtime.client.EPRuntimeProvider;
import gemoc.mbdo.cep.model.Event;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;

import java.time.Duration;

public class KafkaConsumer {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"; //TODO
    private static final String KAFKA_TOPIC = "events";
    private static final String KAFKA_GROUP_ID = "esper-cep-consumer";

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== ESPER CEP WITH KAFKA ===\n");

        // Configure Esper
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Event.class);

        // Create runtime
        EPRuntime runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        EPCompiler compiler = EPCompilerProvider.getCompiler();

        // Pattern Query: Detect two consecutive alerts with value > 100
        runPatternQuery(runtime, compiler, configuration);

        // SQL-like Query: Aggregate events by type
        runAggregationQuery(runtime, compiler, configuration);

        // Create Kafka consumer
        KafkaConsumer<String, Event> consumer = createKafkaConsumer();

        System.out.println("Esper CEP is listening to Kafka topic: " + KAFKA_TOPIC);
        System.out.println("Waiting for events...\n");

        // Consume events from Kafka and send to Esper
        try {
            while (true) {
                ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(100));
                for (ConsumerRecord<String, Event> record : records) {
                    Event event = record.value();
                    System.out.println("[ESPER] Received event: " + event);
                    runtime.getEventService().sendEventBean(event, "Event");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            consumer.close();
            runtime.destroy();
        }
    }
}
