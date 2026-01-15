package gemoc.mbdo.cep.esper;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.*;
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

public class EsperKafkaCepDemo {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
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

    private static KafkaConsumer<String, Event> createKafkaConsumer() {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, KAFKA_GROUP_ID);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, EventDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        KafkaConsumer<String, Event> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(KAFKA_TOPIC));
        return consumer;
    }

    private static void runPatternQuery(EPRuntime runtime, EPCompiler compiler, Configuration configuration)
            throws Exception {
        String epl = "@name('pattern-query') " +
                "select a.id as firstId, a.value as firstValue, " +
                "       b.id as secondId, b.value as secondValue " +
                "from pattern [" +
                "  every a=Event(type='alert' and value > 100) -> " +
                "  b=Event(type='alert' and value > 100)" +
                "]";

        EPCompiled compiled = compile(compiler, epl, configuration);
        EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);

        EPStatement statement = runtime.getDeploymentService().getStatement(deployment.getDeploymentId(),
                "pattern-query");
        statement.addListener((newEvents, oldEvents, stmt, rt) -> {
            for (com.espertech.esper.common.client.EventBean event : newEvents) {
                System.out.println("[ESPER] PATTERN ALERT: Two consecutive high-value alerts detected! " +
                        "First: Event{id='" + event.get("firstId") + "', value=" + event.get("firstValue") + "}, " +
                        "Second: Event{id='" + event.get("secondId") + "', value=" + event.get("secondValue") + "}");
            }
        });
    }

    private static void runAggregationQuery(EPRuntime runtime, EPCompiler compiler, Configuration configuration)
            throws Exception {
        String epl = "@name('aggregation-query') " +
                "select type, count(*) as event_count, avg(value) as avg_value " +
                "from Event#time(10 sec) " +
                "group by type " +
                "output last every 1 events";

        EPCompiled compiled = compile(compiler, epl, configuration);
        EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);

        EPStatement statement = runtime.getDeploymentService().getStatement(deployment.getDeploymentId(),
                "aggregation-query");
        statement.addListener((newEvents, oldEvents, stmt, rt) -> {
            for (com.espertech.esper.common.client.EventBean event : newEvents) {
                System.out.println("[ESPER] AGGREGATION: [" +
                        event.get("type") + ", " +
                        event.get("event_count") + ", " +
                        event.get("avg_value") + "]");
            }
        });
    }

    private static EPCompiled compile(EPCompiler compiler, String epl, Configuration configuration)
            throws EPCompileException {
        CompilerArguments args = new CompilerArguments(configuration);
        return compiler.compile(epl, args);
    }
}
