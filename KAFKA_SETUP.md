# Kafka Integration Setup

This guide explains how to run Flink CEP and Esper CEP with Kafka as the event source.

## Architecture

```
Kafka Topic (events)
        |
        |--- Flink CEP Consumer (flink-cep-consumer group)
        |
        |--- Esper CEP Consumer (esper-cep-consumer group)
```

Both CEP engines consume the same events from Kafka independently and process them in parallel.

## Prerequisites

- Docker and Docker Compose (for Kafka)
- Java 11+
- Maven 3.x

## Quick Start

### 1. Start Kafka

```bash
docker-compose up -d
```

This starts:
- Zookeeper on port 2181
- Kafka broker on port 9092

Verify Kafka is running:
```bash
docker-compose ps
```

### 2. Build the Project

```bash
mvn clean package -DskipTests
```

### 3. Run the Consumers

Open **two separate terminals**:

**Terminal 1 - Flink CEP Consumer:**
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.flink.FlinkKafkaCepDemo
```

**Terminal 2 - Esper CEP Consumer:**
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.esper.EsperKafkaCepDemo
```

Both will start listening to the Kafka topic `events`.

### 4. Send Events

Open a **third terminal** and run the producer:

```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.KafkaEventProducer
```

This sends 5 sample events to Kafka. You should see both Flink and Esper consumers processing them.

## Components

### KafkaEventProducer
- Sends events to Kafka topic `events`
- Uses JSON serialization
- Sends the same 5 sample events as the standalone demos

### FlinkKafkaCepDemo
- Consumes events from Kafka using Flink Kafka Connector
- Applies CEP patterns and SQL queries
- Consumer group: `flink-cep-consumer`

### EsperKafkaCepDemo
- Consumes events from Kafka using Kafka Consumer API
- Applies EPL patterns and queries
- Consumer group: `esper-cep-consumer`

### EventSerializer/EventDeserializer
- JSON serialization/deserialization for Kafka messages
- Uses Jackson ObjectMapper

## Event Format

Events are serialized as JSON:

```json
{
  "id": "1",
  "type": "alert",
  "value": 150.0,
  "timestamp": 1768409165105
}
```

## Expected Output

### Producer Output:
```
Sent: Event{id='1', type='alert', value=150.0, timestamp=...} to partition 0
Sent: Event{id='2', type='alert', value=120.0, timestamp=...} to partition 0
...
```

### Flink Consumer Output:
```
[FLINK] ALERT: Two consecutive high-value alerts detected! First: Event{...}, Second: Event{...}
+I[alert, 1, 150.0]
+U[alert, 2, 135.0]
...
```

### Esper Consumer Output:
```
[ESPER] Received event: Event{id='1', type='alert', value=150.0, ...}
[ESPER] PATTERN ALERT: Two consecutive high-value alerts detected! ...
[ESPER] AGGREGATION: [alert, 1, 150.0]
...
```

## Kafka Topic Management

### Create topic manually (optional):
```bash
docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic events \
  --partitions 1 \
  --replication-factor 1
```

### List topics:
```bash
docker exec -it kafka kafka-topics --list \
  --bootstrap-server localhost:9092
```

### View messages:
```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic events \
  --from-beginning
```

### Delete topic:
```bash
docker exec -it kafka kafka-topics --delete \
  --bootstrap-server localhost:9092 \
  --topic events
```

## Stopping Kafka

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Configuration

### Kafka Connection
Both consumers connect to `localhost:9092` by default. To change:

Edit the constant in the respective Java files:
```java
private static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
```

### Topic Name
Default topic is `events`. To change:
```java
private static final String KAFKA_TOPIC = "events";
```

### Consumer Groups
- Flink: `flink-cep-consumer`
- Esper: `esper-cep-consumer`

Different consumer groups ensure both engines receive all events independently.

## Troubleshooting

### Connection refused
- Ensure Kafka is running: `docker-compose ps`
- Check Kafka logs: `docker-compose logs kafka`

### No events received
- Verify topic exists: `docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092`
- Check consumer group offsets
- Ensure producer ran successfully

### Out of memory
- Increase JVM heap: `java -Xmx2g -cp ...`

## Performance Tuning

### Producer
```java
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
props.put(ProducerConfig.LINGER_MS_CONFIG, 10);
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");
```

### Consumer
```java
props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);
props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
```

## Next Steps

1. Modify event patterns in the CEP engines
2. Add more complex EPL/Flink queries
3. Scale Kafka with multiple partitions
4. Add monitoring with Kafka metrics
5. Implement custom event types
