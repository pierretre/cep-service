package gemoc.mbdo.cep.service;

import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.EPRuntime;
import com.espertech.esper.runtime.client.EPRuntimeProvider;
import gemoc.mbdo.cep.model.Event;

import java.util.Scanner;

/**
 * Demo application showing dynamic rule management with Esper CEP
 */
public class DynamicRuleDemo {

    public static void main(String[] args) throws Exception {
        System.out.println("\n=== DYNAMIC RULE SERVICE DEMO ===\n");

        // Configure Esper
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Event.class);

        // Create runtime and service
        EPRuntime runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        DynamicRuleService ruleService = new DynamicRuleService(
                runtime,
                EPCompilerProvider.getCompiler(),
                configuration);

        // Start event producer thread
        Thread producerThread = startEventProducer(runtime);

        // Interactive CLI
        runInteractiveCLI(ruleService);

        // Cleanup
        producerThread.interrupt();
        runtime.destroy();
        System.out.println("\n=== DEMO COMPLETE ===\n");
    }

    private static void runInteractiveCLI(DynamicRuleService ruleService) {
        Scanner scanner = new Scanner(System.in);
        boolean running = true;

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

                case "examples":
                    showExamples(ruleService);
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
                System.out.println("[" + ruleName + "] MATCH: " + formatEventBean(event));
            }
        });
    }

    private static void showExamples(DynamicRuleService ruleService) {
        System.out.println("\n=== Adding Example Rules ===\n");

        // Example 1: High value alerts
        ruleService.addRule(
                "high-value-alert",
                "select * from Event(type='alert' and value > 100)",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[HIGH-VALUE] Alert detected: " + event.getUnderlying());
                    }
                });

        // Example 2: Pattern - two consecutive alerts
        ruleService.addRule(
                "consecutive-alerts",
                "select a.id as firstId, b.id as secondId from pattern [every a=Event(type='alert') -> b=Event(type='alert')]",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[PATTERN] Consecutive alerts: " +
                                event.get("firstId") + " -> " + event.get("secondId"));
                    }
                });

        // Example 3: Time window aggregation
        ruleService.addRule(
                "avg-by-type",
                "select type, count(*) as cnt, avg(value) as avgVal from Event#time(5 sec) group by type output last every 3 seconds",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[AGGREGATION] Type: " + event.get("type") +
                                ", Count: " + event.get("cnt") +
                                ", Avg: " + String.format("%.2f", event.get("avgVal")));
                    }
                });

        // Example 4: Critical events (multiple types)
        ruleService.addRule(
                "critical-events",
                "select * from Event(type in ('error', 'critical', 'alert') and value > 150)",
                events -> {
                    for (com.espertech.esper.common.client.EventBean event : events) {
                        System.out.println("[CRITICAL] " + event.getUnderlying());
                    }
                });

        System.out.println("\n✓ Example rules added. They will start matching events immediately.\n");
    }

    private static Thread startEventProducer(EPRuntime runtime) {
        Thread thread = new Thread(() -> {
            String[] types = { "alert", "info", "warning", "error", "critical" };
            int eventId = 1;

            try {
                while (!Thread.currentThread().isInterrupted()) {
                    String type = types[(int) (Math.random() * types.length)];
                    double value = Math.random() * 200;
                    long timestamp = System.currentTimeMillis();

                    Event event = new Event(String.valueOf(eventId++), type, value, timestamp);
                    runtime.getEventService().sendEventBean(event, "Event");

                    Thread.sleep(1000 + (long) (Math.random() * 2000)); // 1-3 seconds
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        thread.setDaemon(true);
        thread.start();
        System.out.println("Event producer started (generating events every 1-3 seconds)\n");

        return thread;
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

    private static void printHelp() {
        System.out.println("\n=== Available Commands ===");
        System.out.println("  add       - Add a new rule (interactive)");
        System.out.println("  remove    - Remove a rule by name");
        System.out.println("  list      - List all active rules");
        System.out.println("  examples  - Load example rules");
        System.out.println("  help      - Show this help message");
        System.out.println("  exit/quit - Exit the application");
        System.out.println("\n=== EPL Examples ===");
        System.out.println("  Simple filter:");
        System.out.println("    select * from Event(type='alert' and value > 100)");
        System.out.println("\n  Pattern matching:");
        System.out.println("    select * from pattern [every a=Event(type='alert') -> b=Event(type='error')]");
        System.out.println("\n  Time window aggregation:");
        System.out.println("    select type, avg(value) from Event#time(10 sec) group by type");
        System.out.println("\n  Multiple event types:");
        System.out.println("    select * from Event(type in ('error', 'critical'))");
        System.out.println();
    }
}
