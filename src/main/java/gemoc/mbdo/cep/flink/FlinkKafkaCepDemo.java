package gemoc.mbdo.cep.flink;

import gemoc.mbdo.cep.model.Event;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.cep.CEP;
import org.apache.flink.cep.PatternStream;
import org.apache.flink.cep.pattern.Pattern;
import org.apache.flink.cep.pattern.conditions.SimpleCondition;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.apache.flink.table.api.Expressions.$;

public class FlinkKafkaCepDemo {

    private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String KAFKA_TOPIC = "events";
    private static final String KAFKA_GROUP_ID = "flink-cep-consumer";

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== FLINK CEP WITH KAFKA ===\n");

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);

        // Create Kafka source
        KafkaSource<Event> source = KafkaSource.<Event>builder()
                .setBootstrapServers(KAFKA_BOOTSTRAP_SERVERS)
                .setTopics(KAFKA_TOPIC)
                .setGroupId(KAFKA_GROUP_ID)
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new EventDeserializationSchema())
                .build();

        // Create event stream from Kafka
        DataStream<Event> eventStream = env.fromSource(
                source,
                WatermarkStrategy.<Event>forBoundedOutOfOrderness(Duration.ofSeconds(1))
                        .withTimestampAssigner((event, timestamp) -> event.getTimestamp()),
                "Kafka Source");

        // CEP Pattern Query
        runCepPatternQuery(eventStream);

        // SQL Query
        runSqlQuery(env, eventStream);

        System.out.println("Flink CEP is listening to Kafka topic: " + KAFKA_TOPIC);
        System.out.println("Waiting for events...\n");

        env.execute("Flink CEP with Kafka");
    }

    private static void runCepPatternQuery(DataStream<Event> eventStream) {
        Pattern<Event, ?> pattern = Pattern.<Event>begin("first")
                .where(new SimpleCondition<Event>() {
                    @Override
                    public boolean filter(Event event) {
                        return event.getType().equals("alert") && event.getValue() > 100;
                    }
                })
                .next("second")
                .where(new SimpleCondition<Event>() {
                    @Override
                    public boolean filter(Event event) {
                        return event.getType().equals("alert") && event.getValue() > 100;
                    }
                });

        PatternStream<Event> patternStream = CEP.pattern(eventStream, pattern);

        DataStream<String> alerts = patternStream.select((Map<String, List<Event>> p) -> {
            Event first = p.get("first").get(0);
            Event second = p.get("second").get(0);
            return "[FLINK] ALERT: Two consecutive high-value alerts detected! " +
                    "First: " + first + ", Second: " + second;
        });

        alerts.print();
    }

    private static void runSqlQuery(StreamExecutionEnvironment env, DataStream<Event> eventStream) {
        StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

        tableEnv.createTemporaryView("events", eventStream,
                $("id"), $("type"), $("value"), $("timestamp"));

        Table result = tableEnv.sqlQuery(
                "SELECT type, COUNT(*) as event_count, AVG(`value`) as avg_value " +
                        "FROM events " +
                        "GROUP BY type");

        tableEnv.toChangelogStream(result).print();
    }

    // Custom deserialization schema for Kafka
    static class EventDeserializationSchema implements DeserializationSchema<Event> {
        private final ObjectMapper objectMapper = new ObjectMapper();

        @Override
        public Event deserialize(byte[] message) throws IOException {
            return objectMapper.readValue(message, Event.class);
        }

        @Override
        public boolean isEndOfStream(Event nextElement) {
            return false;
        }

        @Override
        public TypeInformation<Event> getProducedType() {
            return TypeInformation.of(Event.class);
        }
    }
}
