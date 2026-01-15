# Quick Start Guide

## 1. Standalone Demo (No Kafka Required)

Run both Flink and Esper CEP with embedded event sources:

```bash
# Build
mvn clean package -DskipTests

# Run comparison
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.ComparisonRunner
```

**Expected Output:**
- Flink CEP processes events and shows changelog stream
- Esper CEP processes same events and shows direct output
- Both detect the pattern: two consecutive high-value alerts

---

## 2. Kafka Integration Demo

### Prerequisites
- Docker and Docker Compose installed

### Steps

**Step 1: Start Kafka**
```bash
docker-compose up -d
```

Wait ~30 seconds for Kafka to be ready.

**Step 2: Start Flink Consumer (Terminal 1)**
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.flink.FlinkKafkaCepDemo
```

You'll see: `Flink CEP is listening to Kafka topic: events`

**Step 3: Start Esper Consumer (Terminal 2)**
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.esper.EsperKafkaCepDemo
```

You'll see: `Esper CEP is listening to Kafka topic: events`

**Step 4: Send Events (Terminal 3)**
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.KafkaEventProducer
```

**Result:**
- Producer sends 5 events to Kafka
- Both Flink and Esper consumers process them independently
- Both detect the same pattern and aggregations

**Step 5: Stop Kafka**
```bash
docker-compose down
```

---

## What Gets Detected?

### Events Sent:
1. `Event(id='1', type='alert', value=150.0)` ✓
2. `Event(id='2', type='alert', value=120.0)` ✓ → **PATTERN MATCH!**
3. `Event(id='3', type='info', value=50.0)`
4. `Event(id='4', type='alert', value=80.0)` (value < 100, no match)
5. `Event(id='5', type='info', value=30.0)`

### Pattern Detection:
Both engines detect events #1 and #2 as two consecutive alerts with value > 100.

### Aggregations:
- **alert**: count=3, avg≈116.67
- **info**: count=2, avg=40.0

---

## Troubleshooting

### "Connection refused" when running Kafka demos
```bash
# Check if Kafka is running
docker-compose ps

# View Kafka logs
docker-compose logs kafka

# Restart Kafka
docker-compose restart
```

### "No events received"
```bash
# Check if topic exists
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092

# View messages in topic
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic events \
  --from-beginning
```

### Build fails
```bash
# Clean and rebuild
mvn clean install -DskipTests

# Check Java version (needs 11+)
java -version
```

---

## File Structure

```
.
├── src/main/java/com/example/
│   ├── Event.java                    # Event POJO
│   ├── FlinkCepDemo.java            # Flink standalone
│   ├── EsperCepDemo.java            # Esper standalone
│   ├── ComparisonRunner.java        # Run both
│   ├── FlinkKafkaCepDemo.java       # Flink + Kafka
│   ├── EsperKafkaCepDemo.java       # Esper + Kafka
│   ├── KafkaEventProducer.java      # Send events to Kafka
│   ├── EventSerializer.java         # JSON serialization
│   └── EventDeserializer.java       # JSON deserialization
├── docker-compose.yml               # Kafka setup
├── pom.xml                          # Maven dependencies
├── README.md                        # Main documentation
├── COMPARISON.md                    # Detailed comparison
├── KAFKA_SETUP.md                   # Kafka guide
└── QUICK_START.md                   # This file
```

---

## Next Steps

1. **Modify Patterns**: Edit the CEP pattern conditions in the Java files
2. **Add Events**: Modify `KafkaEventProducer` to send different events
3. **Scale**: Add more Kafka partitions and Flink parallelism
4. **Monitor**: Add logging and metrics
5. **Deploy**: Run Flink on a cluster for production use

---

## Commands Cheat Sheet

```bash
# Build
mvn clean package -DskipTests

# Standalone comparison
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.ComparisonRunner

# Kafka: Start
docker-compose up -d

# Kafka: Flink consumer
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.flink.FlinkKafkaCepDemo

# Kafka: Esper consumer
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.esper.EsperKafkaCepDemo

# Kafka: Producer
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.KafkaEventProducer

# Kafka: Stop
docker-compose down
```
