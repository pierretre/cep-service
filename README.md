# Flink CEP vs Esper CEP Comparison

A minimal Maven project comparing Apache Flink CEP and Esper CEP implementations with identical event patterns and SQL-like queries. Includes both standalone and Kafka-integrated versions.

## Features

Both implementations demonstrate:
- **CEP Pattern Matching**: Detects two consecutive "alert" events with value > 100
- **SQL/Aggregation Queries**: Groups events by type and calculates count and average value
- **Simple Event Stream**: Uses identical sample events for fair comparison
- **Kafka Integration**: Both engines can consume events from Kafka in parallel

## Requirements

- Java 11 or higher
- Maven 3.x
- Docker & Docker Compose (for Kafka integration)

## Build

```bash
mvn clean package -DskipTests
```

## Run Options

### Option 1: Standalone Comparison (No Kafka)

Run both implementations with embedded event sources:

```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.ComparisonRunner
```

Or run individually:
- **Flink CEP**: `java -jar target/flink-cep-demo-1.0-SNAPSHOT.jar`
- **Esper CEP**: `java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.esper.EsperCepDemo`

### Option 2: Kafka Integration

See [KAFKA_SETUP.md](KAFKA_SETUP.md) for detailed instructions.

**Quick Start:**

1. Start Kafka:
```bash
docker-compose up -d
```

2. Run consumers (in separate terminals):
```bash
# Terminal 1 - Flink
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.flink.FlinkKafkaCepDemo

# Terminal 2 - Esper
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.esper.EsperKafkaCepDemo
```

3. Send events:
```bash
# Terminal 3 - Producer
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.KafkaEventProducer
```

## Project Structure

### Core Classes
- `Event.java` - POJO for events (with getters/setters)
- `FlinkCepDemo.java` - Flink CEP standalone implementation
- `EsperCepDemo.java` - Esper CEP standalone implementation
- `ComparisonRunner.java` - Runs both for comparison

### Kafka Integration
- `FlinkKafkaCepDemo.java` - Flink CEP with Kafka consumer
- `EsperKafkaCepDemo.java` - Esper CEP with Kafka consumer
- `KafkaEventProducer.java` - Sends events to Kafka
- `EventSerializer.java` / `EventDeserializer.java` - JSON serialization

### Configuration
- `pom.xml` - Maven dependencies (Flink 1.18.0, Esper 8.9.0, Kafka 3.6.0)
- `docker-compose.yml` - Kafka & Zookeeper setup

### Documentation
- `README.md` - This file
- `COMPARISON.md` - Detailed comparison of Flink vs Esper
- `KAFKA_SETUP.md` - Kafka integration guide

## Implementation Comparison

### Flink CEP
- **Pattern Syntax**: Java API with fluent pattern builder
- **SQL**: Flink Table API with SQL queries
- **Execution**: Streaming dataflow with watermarks
- **Output**: Changelog stream format
- **Kafka**: Native Flink Kafka connector

### Esper EPL
- **Pattern Syntax**: EPL (Event Processing Language) - SQL-like syntax
- **SQL**: Native EPL SELECT statements
- **Execution**: Event-driven with listeners
- **Output**: Direct event callbacks
- **Kafka**: Standard Kafka Consumer API

## Sample Output

Both implementations process the same 5 events:
1. Event(id='1', type='alert', value=150.0)
2. Event(id='2', type='alert', value=120.0) ← Pattern match!
3. Event(id='3', type='info', value=50.0)
4. Event(id='4', type='alert', value=80.0)
5. Event(id='5', type='info', value=30.0)

**Pattern Detection**: Both detect events 1 & 2 as consecutive high-value alerts

**Aggregations**: Both calculate counts and averages grouped by event type

## Architecture

### Standalone Mode
```
Event Source → Flink CEP → Console Output
Event Source → Esper CEP → Console Output
```

### Kafka Mode
```
Kafka Producer → Kafka Topic (events)
                      ↓
                 ┌────┴────┐
                 ↓         ↓
            Flink CEP   Esper CEP
                 ↓         ↓
            Console    Console
```

Both CEP engines consume from the same Kafka topic using different consumer groups, ensuring independent processing of all events.

## Key Differences

| Aspect | Flink CEP | Esper CEP |
|--------|-----------|-----------|
| **Deployment** | Distributed cluster | Single JVM |
| **Scalability** | Horizontal | Vertical |
| **Latency** | 10-100ms | 1-10ms |
| **Throughput** | Millions/sec | 100K-1M/sec |
| **Syntax** | Java API | SQL-like EPL |
| **State** | Distributed | In-memory |

See [COMPARISON.md](COMPARISON.md) for detailed analysis.

## Next Steps

1. Modify event patterns and queries
2. Add custom event types
3. Scale Kafka with multiple partitions
4. Implement windowing strategies
5. Add monitoring and metrics
6. Deploy to production cluster (Flink)

