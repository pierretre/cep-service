# Dynamic Rule Service for Esper CEP

This service allows you to dynamically add, remove, and manage EPL (Event Processing Language) rules while the Esper CEP engine is running, supporting events of different natures.

## Components

### 1. DynamicRuleService
Core service for managing rules at runtime.

**Features:**
- Add new EPL rules dynamically
- Remove existing rules
- List all active rules
- Support for multiple event types
- Thread-safe rule management

**Usage:**
```java
DynamicRuleService ruleService = new DynamicRuleService(runtime, compiler, configuration);

// Add a rule
ruleService.addRule("my-rule", 
    "select * from Event(type='alert' and value > 100)",
    events -> {
        // Handle matched events
        System.out.println("Alert detected: " + events[0].getUnderlying());
    }
);

// Remove a rule
ruleService.removeRule("my-rule");

// List all rules
ruleService.listRules();
```

### 2. DynamicRuleDemo
Interactive CLI demo with automatic event generation.

**Run:**
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleDemo"
```

**Commands:**
- `add` - Add a new rule interactively
- `remove <name>` - Remove a rule
- `list` - List all active rules
- `examples` - Load example rules
- `help` - Show help
- `exit` - Exit application

### 3. DynamicRuleKafkaDemo
Kafka-integrated version with CLI for managing rules.

**Prerequisites:**
- Kafka running on localhost:9092
- Topic "events" created

**Run:**
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleKafkaDemo"
```

**Features:**
- Consumes events from Kafka
- Interactive rule management
- Quick rule templates
- Default rules loaded on startup

### 4. DynamicRuleAPIDemo + RuleManagementAPI
REST API for remote rule management with Kafka integration.

**Run:**
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleAPIDemo"
```

**API Endpoints:**

#### List all rules
```bash
curl http://localhost:8080/rules
```

#### Add a new rule
```bash
curl -X POST http://localhost:8080/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-filter",
    "epl": "select * from Event(type=\"alert\" and value > 100)"
  }'
```

#### Get specific rule
```bash
curl http://localhost:8080/rules/high-value-filter
```

#### Remove a rule
```bash
curl -X DELETE http://localhost:8080/rules/high-value-filter
```

#### Health check
```bash
curl http://localhost:8080/health
```

## EPL Pattern Examples

### Simple Filters
```sql
-- Filter by event type
select * from Event(type='alert')

-- Filter by value
select * from Event(value > 100)

-- Multiple conditions
select * from Event(type='alert' and value > 100)

-- Multiple event types
select * from Event(type in ('error', 'critical', 'alert'))
```

### Pattern Matching
```sql
-- Two consecutive alerts
select a.id as first, b.id as second 
from pattern [every a=Event(type='alert') -> b=Event(type='alert')]

-- Alert followed by error
select * 
from pattern [every a=Event(type='alert') -> b=Event(type='error')]

-- Three events in sequence
select * 
from pattern [every a=Event(type='alert') -> b=Event -> c=Event(type='info')]
```

### Time Windows & Aggregation
```sql
-- Count events in 10 second window
select type, count(*) as cnt 
from Event#time(10 sec) 
group by type

-- Average value by type
select type, avg(value) as avgVal 
from Event#time(30 sec) 
group by type

-- Last 100 events
select * from Event#length(100)

-- Events in last 5 seconds with high values
select * from Event#time(5 sec) where value > 150
```

### Complex Patterns
```sql
-- Detect spike: 3 high-value events within 10 seconds
select * 
from pattern [every (
  a=Event(value > 100) -> 
  b=Event(value > 100) -> 
  c=Event(value > 100)
) where timer:within(10 sec)]

-- Alert if no events received in 30 seconds
select * 
from pattern [every timer:interval(30 sec) and not Event]

-- Correlation across event types
select a.id, b.id 
from pattern [every a=Event(type='alert') -> b=Event(type='error') where timer:within(5 sec)]
```

## Event Types

The system supports any event type that extends or matches the Event structure:

```java
public class Event {
    public String id;
    public String type;      // e.g., "alert", "error", "info", "warning", "critical"
    public double value;
    public long timestamp;
}
```

You can add custom event types to the Esper configuration:

```java
configuration.getCommon().addEventType(CustomEvent.class);
```

## Use Cases

1. **Real-time Monitoring**: Detect anomalies in streaming data
2. **Alert Management**: Dynamic alert rules based on business conditions
3. **Pattern Detection**: Identify complex event sequences
4. **Aggregation**: Real-time statistics and metrics
5. **Correlation**: Link related events across different types
6. **Compliance**: Add/remove rules based on regulatory requirements

## Testing

### With Kafka
1. Start Kafka and create topic:
```bash
docker-compose up -d
```

2. Run the API demo:
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleAPIDemo"
```

3. Send test events:
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"
```

4. Add rules via API:
```bash
curl -X POST http://localhost:8080/rules \
  -H "Content-Type: application/json" \
  -d '{"name":"test-rule","epl":"select * from Event(value > 50)"}'
```

### Without Kafka
Run the standalone demo with built-in event generator:
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.service.DynamicRuleDemo"
```

## Architecture

```
┌─────────────────┐
│  Event Sources  │
│  (Kafka, etc.)  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Esper Runtime  │
│                 │
│  ┌───────────┐  │
│  │  Rule 1   │  │
│  ├───────────┤  │
│  │  Rule 2   │  │
│  ├───────────┤  │
│  │  Rule 3   │  │
│  └───────────┘  │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│  DynamicRuleService     │
│  - Add/Remove Rules     │
│  - List Rules           │
│  - Manage Listeners     │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Management Interface   │
│  - CLI                  │
│  - REST API             │
└─────────────────────────┘
```

## Notes

- Rules are compiled and deployed at runtime without restarting the engine
- Each rule has a unique name and can be independently managed
- Listeners are attached to rules for custom event handling
- Thread-safe for concurrent rule management
- Supports all Esper EPL features including patterns, windows, and aggregations
