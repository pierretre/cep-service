# Flink CEP vs Esper CEP Comparison

A minimal Maven project comparing Apache Flink CEP and Esper CEP implementations with identical event patterns and SQL-like queries.

## Features

Both implementations demonstrate:
- **CEP Pattern Matching**: Detects two consecutive "alert" events with value > 100
- **SQL/Aggregation Queries**: Groups events by type and calculates count and average value
- **Simple Event Stream**: Uses identical sample events for fair comparison

## Requirements

- Java 11 or higher
- Maven 3.x

## Build

```bash
mvn clean package -DskipTests
```

## Run

### Run Both Implementations (Comparison)
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar com.example.ComparisonRunner
```

### Run Flink CEP Only
```bash
java -jar target/flink-cep-demo-1.0-SNAPSHOT.jar
```

### Run Esper CEP Only
```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar com.example.EsperCepDemo
```

## Project Structure

- `pom.xml` - Maven configuration with Flink 1.18.0 and Esper 8.9.0
- `src/main/java/com/example/Event.java` - POJO for events (with getters/setters for Esper)
- `src/main/java/com/example/FlinkCepDemo.java` - Flink CEP implementation
- `src/main/java/com/example/EsperCepDemo.java` - Esper CEP implementation
- `src/main/java/com/example/ComparisonRunner.java` - Runs both for comparison

## Implementation Comparison

### Flink CEP
- **Pattern Syntax**: Java API with fluent pattern builder
- **SQL**: Flink Table API with SQL queries
- **Execution**: Streaming dataflow with watermarks
- **Output**: Changelog stream format

### Esper EPL
- **Pattern Syntax**: EPL (Event Processing Language) - SQL-like syntax
- **SQL**: Native EPL SELECT statements
- **Execution**: Event-driven with listeners
- **Output**: Direct event callbacks

## Sample Output

Both implementations process the same 5 events:
1. Event(id='1', type='alert', value=150.0)
2. Event(id='2', type='alert', value=120.0) ← Pattern match!
3. Event(id='3', type='info', value=50.0)
4. Event(id='4', type='alert', value=80.0)
5. Event(id='5', type='info', value=30.0)

**Pattern Detection**: Both detect events 1 & 2 as consecutive high-value alerts

**Aggregations**: Both calculate counts and averages grouped by event type
