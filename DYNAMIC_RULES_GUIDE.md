# Dynamic Rule Management for Esper CEP - Quick Start Guide

This guide shows you how to use the dynamic rule service to add and manage CEP rules at runtime.

## What You Get

A service that lets you:
- ✅ Add new EPL rules while the engine is running
- ✅ Remove rules dynamically
- ✅ Support different event types (alert, error, info, warning, critical, etc.)
- ✅ Manage rules via CLI or REST API
- ✅ Integrate with Kafka for real-time event processing

## Quick Start Options

### Option 1: Standalone Demo (No Kafka Required)

Perfect for testing and learning. Includes automatic event generation.

```bash
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleDemo"
```

**What you can do:**
- Type `examples` to load sample rules
- Type `add` to create your own rules interactively
- Type `list` to see all active rules
- Type `remove <rule-name>` to delete a rule
- Watch events being generated and matched in real-time

### Option 2: Kafka Integration

Consume events from Kafka and manage rules via CLI.

**Prerequisites:**
```bash
# Start Kafka
docker-compose up -d

# Verify topic exists
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Run the service:**
```bash
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleKafkaDemo"
```

**Send test events (in another terminal):**
```bash
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"
```

### Option 3: REST API (Recommended for Production)

Manage rules remotely via HTTP API while consuming from Kafka.

**Start the service:**
```bash
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleAPIDemo"
```

**Manage rules via API:**

```bash
# List all rules
curl http://localhost:8080/rules

# Add a rule to detect high-value alerts
curl -X POST http://localhost:8080/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-alerts",
    "epl": "select * from Event(type=\"alert\" and value > 100)"
  }'

# Add a pattern rule (consecutive alerts)
curl -X POST http://localhost:8080/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "consecutive-alerts",
    "epl": "select a.id as first, b.id as second from pattern [every a=Event(type=\"alert\") -> b=Event(type=\"alert\")]"
  }'

# Add aggregation rule (count by type)
curl -X POST http://localhost:8080/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "event-counts",
    "epl": "select type, count(*) as cnt from Event#time(10 sec) group by type"
  }'

# Remove a rule
curl -X DELETE http://localhost:8080/rules/high-value-alerts

# Check system health
curl http://localhost:8080/health
```

## EPL Rule Examples

### 1. Simple Filters

```sql
-- All error events
select * from Event(type='error')

-- High value events
select * from Event(value > 150)

-- Multiple event types
select * from Event(type in ('error', 'critical', 'alert'))

-- Combined conditions
select * from Event(type='alert' and value > 100 and value < 200)
```

### 2. Pattern Detection

```sql
-- Two consecutive alerts
select a.id as first, b.id as second 
from pattern [every a=Event(type='alert') -> b=Event(type='alert')]

-- Alert followed by error within 5 seconds
select * 
from pattern [every a=Event(type='alert') -> b=Event(type='error') where timer:within(5 sec)]

-- Three high-value events in sequence
select * 
from pattern [every a=Event(value > 100) -> b=Event(value > 100) -> c=Event(value > 100)]
```

### 3. Time Windows & Aggregation

```sql
-- Count events by type in last 10 seconds
select type, count(*) as cnt 
from Event#time(10 sec) 
group by type

-- Average value by type
select type, avg(value) as avgVal, max(value) as maxVal 
from Event#time(30 sec) 
group by type

-- Events with value above average
select * 
from Event#time(10 sec) 
having value > avg(value)
```

### 4. Advanced Patterns

```sql
-- Spike detection: 3 high values within 10 seconds
select * 
from pattern [every (a=Event(value > 100) -> b=Event(value > 100) -> c=Event(value > 100)) where timer:within(10 sec)]

-- No events received (heartbeat monitoring)
select * 
from pattern [every timer:interval(30 sec) and not Event]

-- Correlation: alert followed by multiple errors
select a.id as alertId, count(b.id) as errorCount 
from pattern [every a=Event(type='alert') -> b=Event(type='error') where timer:within(10 sec)]
```

## Working with Different Event Types

The system supports any event structure. The default Event class has:

```java
{
  "id": "123",
  "type": "alert",      // Can be: alert, error, info, warning, critical, etc.
  "value": 150.0,
  "timestamp": 1234567890
}
```

### Adding Custom Event Types

```java
// Define your custom event
public class CustomEvent {
    public String id;
    public String category;
    public Map<String, Object> metadata;
    // ... other fields
}

// Register with Esper
configuration.getCommon().addEventType(CustomEvent.class);

// Use in EPL
ruleService.addRule("custom-rule", 
    "select * from CustomEvent(category='important')",
    listener);
```

## Real-World Use Cases

### 1. System Monitoring
```bash
# Detect high CPU usage
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "high-cpu",
  "epl": "select * from Event(type=\"cpu\" and value > 80)"
}'

# Detect memory spikes
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "memory-spike",
  "epl": "select * from pattern [every a=Event(type=\"memory\" and value > 90) -> b=Event(type=\"memory\" and value > 90)]"
}'
```

### 2. Business Metrics
```bash
# High-value transactions
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "large-transactions",
  "epl": "select * from Event(type=\"transaction\" and value > 10000)"
}'

# Transaction rate monitoring
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "transaction-rate",
  "epl": "select count(*) as rate from Event(type=\"transaction\")#time(1 min) output last every 10 seconds"
}'
```

### 3. Security Monitoring
```bash
# Failed login attempts
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "failed-logins",
  "epl": "select userId, count(*) as attempts from Event(type=\"login_failed\")#time(5 min) group by userId having count(*) > 3"
}'

# Suspicious activity pattern
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "suspicious-pattern",
  "epl": "select * from pattern [every a=Event(type=\"access_denied\") -> b=Event(type=\"privilege_escalation\") where timer:within(1 min)]"
}'
```

## Testing Your Rules

### 1. Using the Standalone Demo
```bash
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleDemo"

# In the CLI:
> examples          # Load example rules
> list              # See active rules
> add               # Add your own rule
  Rule name: test-rule
  EPL query: select * from Event(value > 50)
```

### 2. Using Kafka + API
```bash
# Terminal 1: Start the API service
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleAPIDemo"

# Terminal 2: Add a rule
curl -X POST http://localhost:8080/rules -H "Content-Type: application/json" -d '{
  "name": "test-rule",
  "epl": "select * from Event(value > 50)"
}'

# Terminal 3: Send test events
mvn compile exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"

# Watch Terminal 1 for matched events
```

## Troubleshooting

### Rule Not Matching Events
- Check EPL syntax: `select * from Event(type='alert')` (use single quotes)
- Verify event type name matches exactly (case-sensitive)
- Use `list` command to see if rule was added successfully

### Kafka Connection Issues
```bash
# Check if Kafka is running
docker ps | grep kafka

# Check if topic exists
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092

# Create topic if missing
docker exec -it kafka kafka-topics --create --topic events --bootstrap-server localhost:9092
```

### API Not Responding
- Check if port 8080 is available: `lsof -i :8080`
- Verify service is running: `curl http://localhost:8080/health`

## Next Steps

1. **Explore the code**: Check `src/main/java/gemoc/mbdo/cep/service/` for implementation details
2. **Read the full documentation**: See `src/main/java/gemoc/mbdo/cep/service/README.md`
3. **Customize event types**: Add your own event classes and register them
4. **Build integrations**: Use the REST API to integrate with your monitoring systems
5. **Scale up**: Deploy multiple instances with load balancing

## Additional Resources

- [Esper EPL Reference](http://esper.espertech.com/release-8.9.0/reference-esper/html/index.html)
- [Pattern Matching Guide](http://esper.espertech.com/release-8.9.0/reference-esper/html/event_patterns.html)
- [Time Windows Documentation](http://esper.espertech.com/release-8.9.0/reference-esper/html/epl_clauses.html#epl-views)
