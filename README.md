# CEP Rule Management System

A production-ready Complex Event Processing (CEP) system with separated API and Engine architecture using Esper CEP, Spring Boot, and Kafka.

## Architecture

The system consists of two independent applications:

1. **Rule Management API** (Spring Boot)
   - REST API for managing CEP rules
   - H2 database for rule persistence
   - OpenAPI/Swagger documentation

2. **CEP Engine** (Esper)
   - Standalone CEP engine
   - Polls database for rule changes
   - Consumes events from Kafka
   - Processes events against active rules

```
┌─────────────────┐         ┌──────────────┐
│  Rule Mgmt API  │────────▶│  H2 Database │
│  (Spring Boot)  │         │    (Rules)   │
└─────────────────┘         └──────────────┘
                                    │
                                    │ Polls every 5s
                                    ▼
┌─────────────────┐         ┌──────────────┐
│  Kafka Producer │────────▶│    Kafka     │
│   (Test Tool)   │         │   (Events)   │
└─────────────────┘         └──────────────┘
                                    │
                                    │ Consumes
                                    ▼
                            ┌──────────────┐
                            │  CEP Engine  │
                            │   (Esper)    │
                            └──────────────┘
```

## Features

- **Dynamic Rule Management**: Add, update, activate/deactivate rules via REST API
- **Real-time Event Processing**: Process Kafka events with Esper CEP
- **Rule Synchronization**: Engine automatically picks up rule changes
- **OpenAPI Documentation**: Interactive Swagger UI for API exploration
- **Production Ready**: Separated concerns, scalable architecture

## Requirements

- Java 11 or higher
- Maven 3.x
- Docker & Docker Compose (for Kafka)

## Quick Start

### 1. Build the Project

```bash
mvn clean package -DskipTests
```

### 2. Start Kafka

```bash
docker-compose up -d
```

### 3. Start the Rule Management API

```bash
./run.sh api
```

Access points:
- API: http://localhost:8080/api/rules
- Swagger UI: http://localhost:8080/swagger-ui.html
- H2 Console: http://localhost:8080/h2-console

### 4. Start the CEP Engine

```bash
./run.sh engine
```

### 5. Create a Rule

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HighTemperatureAlert",
    "eplQuery": "select * from Event(temperature > 100)",
    "description": "Alert on high temperature",
    "active": true
  }'
```

### 6. Send Test Events

```bash
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.KafkaEventProducer
```

## Project Structure

```
src/main/java/gemoc/mbdo/cep/
├── api/                          # Rule Management API (Spring Boot)
│   ├── RuleManagementApplication.java
│   ├── config/
│   │   └── OpenApiConfig.java
│   ├── controller/
│   │   └── RuleController.java
│   ├── dto/
│   │   ├── RuleRequest.java
│   │   └── RuleResponse.java
│   ├── repository/
│   │   └── RuleRepository.java
│   └── service/
│       └── RuleServiceImpl.java
├── engine/                       # CEP Engine (Esper)
│   ├── CepEngineApplication.java
│   ├── EsperCepEngineImpl.java
│   ├── KafkaEventConsumer.java
│   ├── RuleSynchronizer.java
│   └── model/
│       └── Event.java
├── shared/                       # Shared models
│   └── model/
│       └── Rule.java
├── interfaces/                   # Interfaces
│   ├── CepEngine.java
│   └── RuleService.java
├── EventSerializer.java          # Kafka serialization
├── EventDeserializer.java
└── KafkaEventProducer.java      # Test utility
```

## API Endpoints

All endpoints are documented in Swagger UI at http://localhost:8080/swagger-ui.html

- `GET /api/rules` - Get all rules
- `GET /api/rules/{id}` - Get rule by ID
- `GET /api/rules/name/{name}` - Get rule by name
- `GET /api/rules/active` - Get active rules
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/{id}` - Update a rule
- `DELETE /api/rules/{id}` - Delete a rule
- `PATCH /api/rules/{id}/activate` - Activate a rule
- `PATCH /api/rules/{id}/deactivate` - Deactivate a rule

## Configuration

Configuration is in `src/main/resources/application.yml`:

```yaml
# Database
spring.datasource.url: jdbc:h2:./data/cep-rules

# Kafka
cep.kafka.bootstrap-servers: localhost:9092
cep.kafka.topic: events

# Rule Synchronization
cep.rule-sync-interval-ms: 5000
```

## Documentation

- **[QUICKSTART_SEPARATED.md](QUICKSTART_SEPARATED.md)** - Detailed quick start guide
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - System architecture and design
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing scenarios and examples
- **[KAFKA_SETUP.md](KAFKA_SETUP.md)** - Kafka setup and configuration
- **[SWAGGER_GUIDE.md](SWAGGER_GUIDE.md)** - OpenAPI/Swagger documentation guide

## Example: Temperature Monitoring

1. Create a rule to detect high temperatures:

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HighTemp",
    "eplQuery": "select * from Event(temperature > 100)",
    "description": "High temperature alert",
    "active": true
  }'
```

2. The CEP engine will automatically pick up the rule within 5 seconds

3. Send events with temperature data - the engine will match and log alerts

## Technology Stack

- **Esper CEP 8.9.0** - Complex Event Processing engine
- **Spring Boot 2.7.18** - REST API framework
- **Apache Kafka 3.6.0** - Event streaming
- **H2 Database** - Rule persistence
- **SpringDoc OpenAPI 1.7.0** - API documentation

## Development

### Run in Development Mode

```bash
# Terminal 1 - API
mvn spring-boot:run -Dspring-boot.run.main-class=gemoc.mbdo.cep.api.RuleManagementApplication

# Terminal 2 - Engine
mvn exec:java -Dexec.mainClass=gemoc.mbdo.cep.engine.CepEngineApplication
```

### Run Tests

```bash
mvn test
```

## Production Deployment

1. Build the JAR:
```bash
mvn clean package
```

2. Run as separate services:
```bash
# API Service
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.api.RuleManagementApplication

# Engine Service
java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar gemoc.mbdo.cep.engine.CepEngineApplication
```

3. Configure external database and Kafka cluster in `application.yml`

## License

MIT License
