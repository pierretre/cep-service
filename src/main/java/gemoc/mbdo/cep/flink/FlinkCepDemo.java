package gemoc.mbdo.cep.flink;

import gemoc.mbdo.cep.model.Event;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.cep.CEP;
import org.apache.flink.cep.PatternStream;
import org.apache.flink.cep.pattern.Pattern;
import org.apache.flink.cep.pattern.conditions.SimpleCondition;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.apache.flink.table.api.Expressions.$;

public class FlinkCepDemo {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);

        // Create sample event stream
        DataStream<Event> eventStream = env.addSource(new EventSource())
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<Event>forBoundedOutOfOrderness(Duration.ofSeconds(1))
                                .withTimestampAssigner((event, timestamp) -> event.timestamp));

        // CEP Pattern Query
        runCepPatternQuery(eventStream);

        // SQL Query
        runSqlQuery(env, eventStream);

        env.execute("Flink CEP Demo");
    }

    private static void runCepPatternQuery(DataStream<Event> eventStream) {
        // Define CEP pattern: detect two consecutive events of type "alert" with value
        // > 100

        int maxValue = 100;
        Pattern<Event, ?> pattern = Pattern.<Event>begin("first")
                .where(new SimpleCondition<Event>() {
                    @Override
                    public boolean filter(Event event) {
                        return event.type.equals("alert") && event.value > 100;
                    }
                })
                .next("second")
                .where(new SimpleCondition<Event>() {
                    @Override
                    public boolean filter(Event event) {
                        return event.type.equals("alert") && event.value > maxValue;
                    }
                });

        PatternStream<Event> patternStream = CEP.pattern(eventStream, pattern);

        DataStream<String> alerts = patternStream.select((Map<String, List<Event>> p) -> {
            Event first = p.get("first").get(0);
            Event second = p.get("second").get(0);
            return "ALERT: Two consecutive high-value alerts detected! " +
                    "First: " + first + ", Second: " + second;
        });

        alerts.print();
    }

    private static void runSqlQuery(StreamExecutionEnvironment env, DataStream<Event> eventStream) {
        StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

        // Register stream as table
        tableEnv.createTemporaryView("events", eventStream, $("id"), $("type"), $("value"), $("timestamp"));

        // Execute SQL query
        Table result = tableEnv.sqlQuery(
                "SELECT type, COUNT(*) as event_count, AVG(`value`) as avg_value " +
                        "FROM events " +
                        "GROUP BY type");

        // Convert back to stream and print
        tableEnv.toChangelogStream(result).print();
    }

    // Simple event source for testing
    static class EventSource implements SourceFunction<Event> {
        private volatile boolean running = true;

        @Override
        public void run(SourceContext<Event> ctx) throws Exception {
            long timestamp = System.currentTimeMillis();

            // Generate sample events
            ctx.collect(new Event("1", "alert", 150.0, timestamp));
            Thread.sleep(100);
            ctx.collect(new Event("2", "alert", 120.0, timestamp + 100));
            Thread.sleep(100);
            ctx.collect(new Event("3", "info", 50.0, timestamp + 200));
            Thread.sleep(100);
            ctx.collect(new Event("4", "alert", 80.0, timestamp + 300));
            Thread.sleep(100);
            ctx.collect(new Event("5", "info", 30.0, timestamp + 400));

            Thread.sleep(2000); // Keep running briefly
        }

        @Override
        public void cancel() {
            running = false;
        }
    }
}
