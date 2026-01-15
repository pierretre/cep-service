package gemoc.mbdo.cep.esper;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.*;
import gemoc.mbdo.cep.model.Event;

public class EsperCepDemo {

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== ESPER CEP DEMO ===\n");

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

        // Send events
        sendEvents(runtime);

        // Give time for processing
        Thread.sleep(2000);

        runtime.destroy();
        System.out.println("\n=== ESPER DEMO COMPLETE ===\n");
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
                System.out.println("ESPER PATTERN ALERT: Two consecutive high-value alerts detected! " +
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
                System.out.println("ESPER AGGREGATION: [" +
                        event.get("type") + ", " +
                        event.get("event_count") + ", " +
                        event.get("avg_value") + "]");
            }
        });
    }

    private static void sendEvents(EPRuntime runtime) throws InterruptedException {
        long timestamp = System.currentTimeMillis();

        System.out.println("Sending events...\n");

        // Same events as Flink demo
        runtime.getEventService().sendEventBean(new Event("1", "alert", 150.0, timestamp), "Event");
        Thread.sleep(100);

        runtime.getEventService().sendEventBean(new Event("2", "alert", 120.0, timestamp + 100), "Event");
        Thread.sleep(100);

        runtime.getEventService().sendEventBean(new Event("3", "info", 50.0, timestamp + 200), "Event");
        Thread.sleep(100);

        runtime.getEventService().sendEventBean(new Event("4", "alert", 80.0, timestamp + 300), "Event");
        Thread.sleep(100);

        runtime.getEventService().sendEventBean(new Event("5", "info", 30.0, timestamp + 400), "Event");
        Thread.sleep(100);

        System.out.println("\nAll events sent.\n");
    }

    private static EPCompiled compile(EPCompiler compiler, String epl, Configuration configuration)
            throws EPCompileException {
        CompilerArguments args = new CompilerArguments(configuration);
        return compiler.compile(epl, args);
    }
}
