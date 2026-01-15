package gemoc.mbdo.cep.service;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Simple HTTP REST API for managing CEP rules dynamically
 * 
 * Endpoints:
 * - GET /rules - List all rules
 * - POST /rules - Add a new rule
 * - DELETE /rules/{name} - Remove a rule
 * - GET /rules/{name} - Get rule details
 */
public class RuleManagementAPI {

    private final DynamicRuleService ruleService;
    private final HttpServer server;

    public RuleManagementAPI(DynamicRuleService ruleService, int port) throws IOException {
        this.ruleService = ruleService;
        this.server = HttpServer.create(new InetSocketAddress(port), 0);
        setupEndpoints();
    }

    private void setupEndpoints() {
        server.createContext("/rules", new RulesHandler());
        server.createContext("/health", new HealthHandler());
    }

    public void start() {
        server.setExecutor(null);
        server.start();
        System.out.println("Rule Management API started on port " + server.getAddress().getPort());
        System.out.println("Endpoints:");
        System.out.println("  GET    /rules          - List all rules");
        System.out.println("  POST   /rules          - Add new rule");
        System.out.println("  DELETE /rules/{name}   - Remove rule");
        System.out.println("  GET    /health         - Health check");
    }

    public void stop() {
        server.stop(0);
        System.out.println("Rule Management API stopped");
    }

    private class RulesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            try {
                switch (method) {
                    case "GET":
                        handleGet(exchange, path);
                        break;
                    case "POST":
                        handlePost(exchange);
                        break;
                    case "DELETE":
                        handleDelete(exchange, path);
                        break;
                    default:
                        sendResponse(exchange, 405, "{\"error\": \"Method not allowed\"}");
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\": \"" + e.getMessage() + "\"}");
            }
        }

        private void handleGet(HttpExchange exchange, String path) throws IOException {
            if (path.equals("/rules")) {
                // List all rules
                JSONArray rulesArray = new JSONArray();
                ruleService.activeRules.forEach((name, metadata) -> {
                    JSONObject ruleObj = new JSONObject();
                    ruleObj.put("name", name);
                    ruleObj.put("epl", metadata.epl);
                    ruleObj.put("deploymentId", metadata.deploymentId);
                    rulesArray.put(ruleObj);
                });

                JSONObject response = new JSONObject();
                response.put("count", rulesArray.length());
                response.put("rules", rulesArray);

                sendResponse(exchange, 200, response.toString());
            } else {
                // Get specific rule
                String ruleName = path.substring("/rules/".length());
                DynamicRuleService.RuleMetadata metadata = ruleService.getRuleMetadata(ruleName);

                if (metadata != null) {
                    JSONObject ruleObj = new JSONObject();
                    ruleObj.put("name", metadata.ruleName);
                    ruleObj.put("epl", metadata.epl);
                    ruleObj.put("deploymentId", metadata.deploymentId);
                    sendResponse(exchange, 200, ruleObj.toString());
                } else {
                    sendResponse(exchange, 404, "{\"error\": \"Rule not found\"}");
                }
            }
        }

        private void handlePost(HttpExchange exchange) throws IOException {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(body);

            String ruleName = json.getString("name");
            String epl = json.getString("epl");

            boolean success = ruleService.addRule(ruleName, epl, events -> {
                System.out.println("[" + ruleName + "] Matched " + events.length + " event(s)");
                for (com.espertech.esper.common.client.EventBean event : events) {
                    System.out.println("  " + event.getUnderlying());
                }
            });

            if (success) {
                JSONObject response = new JSONObject();
                response.put("message", "Rule added successfully");
                response.put("name", ruleName);
                sendResponse(exchange, 201, response.toString());
            } else {
                sendResponse(exchange, 400, "{\"error\": \"Failed to add rule\"}");
            }
        }

        private void handleDelete(HttpExchange exchange, String path) throws IOException {
            String ruleName = path.substring("/rules/".length());
            boolean success = ruleService.removeRule(ruleName);

            if (success) {
                JSONObject response = new JSONObject();
                response.put("message", "Rule removed successfully");
                response.put("name", ruleName);
                sendResponse(exchange, 200, response.toString());
            } else {
                sendResponse(exchange, 404, "{\"error\": \"Rule not found\"}");
            }
        }
    }

    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            JSONObject response = new JSONObject();
            response.put("status", "healthy");
            response.put("activeRules", ruleService.getRuleCount());
            sendResponse(exchange, 200, response.toString());
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
