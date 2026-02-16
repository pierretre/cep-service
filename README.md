# CEP Rule Management System

A production-ready Complex Event Processing (CEP) system with separated API and Engine architecture using Esper CEP, Spring Boot, and Kafka.

## Architecture

The system is a Spring Boot application that combines:

1. **Rule Management API** (REST endpoints)
   - CRUD operations for CEP rules
   - PostgreSQL/H2 database for rule persistence
   - OpenAPI/Swagger documentation

2. **CEP Engine** (Esper integration)
   - Real-time event processing
   - Consumes events from Kafka
   - Processes events against active rules
   - Generates incidents on rule matches

```
┌─────────────────────────────────────────────┐
│         Spring Boot Application             │
│                                             │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │  REST API      │───▶│   PostgreSQL    │ │
│  │  Controllers   │    │   (Rules DB)    │ │
│  └────────────────┘    └─────────────────┘ │
│          │                      │           │
│          │                      ▼           │
│          │              ┌─────────────────┐ │
│          │              │  Rule Service   │ │
│          │              └─────────────────┘ │
│          │                      │           │
│          ▼                      ▼           │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │  Incident      │◀───│   CEP Engine    │ │
│  │  Service       │    │   (Esper)       │ │
│  └────────────────┘    └─────────────────┘ │
│          │                      ▲           │
│          │                      │           │
└──────────┼──────────────────────┼───────────┘
           │                      │
           ▼                      │
    ┌─────────────┐      ┌───────────────┐
    │  Incidents  │      │     Kafka     │
    │  (SSE/REST) │      │   (Events)    │
    └─────────────┘      └───────────────┘
```

## Features

- **Dynamic Rule Management**: Add, update, activate/deactivate rules via REST API
- **Real-time Event Processing**: Process Kafka events with Esper CEP engine
- **Incident Detection**: Automatic incident generation on rule matches
- **Real-time Notifications**: Server-Sent Events (SSE) for live incident updates
- **High-Performance Caching**: Caffeine-based caching for optimized incident retrieval
- **Cache Monitoring**: Real-time cache statistics and management endpoints
- **OpenAPI Documentation**: Interactive Swagger UI for API exploration
- **Database Flexibility**: Support for PostgreSQL (production) and H2 (development)
- **Production Ready**: Integrated architecture with proper separation of concerns

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

- API: <http://localhost:8081/api/rules>
- Swagger UI: <http://localhost:8081/swagger-ui.html>
- H2 Console: <http://localhost:8081/h2-console>

### 4. Start the CEP Engine

```bash
./run.sh engine
```

### 5. Create a Rule

```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HighTemperatureAlert",
    "eplQuery": "select * from Event(temperature > 100)",
    "description": "Alert on high temperature",
    "active": true
  }'
```

### 6. Send Test Events

Send events to the Kafka topic to test the system.

## Project Structure

```
src/main/java/gemoc/mbdo/cep/
├── api/                              # Spring Boot Application
│   ├── RuleManagementApplication.java  # Main application class
│   ├── config/
│   │   ├── KafkaConsumerConfig.java    # Kafka configuration
│   │   ├── OpenApiConfig.java          # Swagger/OpenAPI config
│   │   └── WebConfig.java              # CORS and web config
│   ├── controller/
│   │   ├── RuleController.java         # Rule management endpoints
│   │   └── IncidentController.java     # Incident endpoints
│   ├── dto/
│   │   ├── RuleRequest.java
│   │   ├── RuleResponse.java
│   │   └── IncidentResponse.java
│   ├── esper/
│   │   └── EsperCepEngineImpl.java     # Esper CEP engine
│   ├── kafka/
│   │   └── KafkaEventConsumer.java     # Kafka event consumer
│   ├── model/
│   │   ├── Rule.java                   # Rule entity
│   │   ├── Event.java                  # Event model
│   │   └── Incident.java               # Incident entity
│   ├── repository/
│   │   ├── RuleRepository.java
│   │   └── IncidentRepository.java
│   └── service/
│       ├── RuleServiceImpl.java
│       ├── IncidentServiceImpl.java
│       └── IncidentSseService.java     # SSE for real-time updates
└── interfaces/                       # Service interfaces
    ├── CepEngine.java
    ├── RuleService.java
    └── IncidentService.java
```

## API Endpoints

All endpoints are documented in Swagger UI at <http://localhost:8081/swagger-ui.html>

### Rule Management

- `GET /api/rules` - Get all rules
- `GET /api/rules/{id}` - Get rule by ID
- `GET /api/rules/name/{name}` - Get rule by name
- `GET /api/rules/active` - Get active rules
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/{id}` - Update a rule
- `DELETE /api/rules/{id}` - Delete a rule
- `PATCH /api/rules/{id}/activate` - Activate a rule
- `PATCH /api/rules/{id}/deactivate` - Deactivate a rule

### Incident Management

- `GET /api/incidents` - Get all incidents (cached)
- `GET /api/incidents/paginated` - Get incidents with pagination (recommended)
  - Query params: `page`, `size`, `sortBy`, `sortDir`
- `GET /api/incidents/{id}` - Get incident by ID (cached)
- `GET /api/incidents/stream` - SSE stream for real-time incidents
- `DELETE /api/incidents/{id}` - Delete an incident

### Cache Management

- `GET /api/cache/stats` - Get cache statistics and performance metrics
- `DELETE /api/cache/evict` - Evict all caches
- `DELETE /api/cache/evict/{cacheName}` - Evict specific cache

## Configuration

The application uses PostgreSQL by default. Configuration is in `src/main/resources/application.yml`:

```yaml
# Database (PostgreSQL)
spring.datasource.url: jdbc:postgresql://localhost:5432/cep_rules
spring.datasource.username: postgres
spring.datasource.password: postgres

# Kafka
spring.kafka.bootstrap-servers: localhost:9092

# Server
server.port: 8081
```

### Using H2 Database (Development)

To use H2 instead of PostgreSQL, update `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE
    driver-class-name: org.h2.Driver
    username: sa
    password: 
  
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
  
  h2:
    console:
      enabled: true
      path: /h2-console
```

Then access H2 Console at: <http://localhost:8081/h2-console>

## Documentation

- **[CACHING.md](CACHING.md)** - Caching implementation and performance optimization
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - System architecture and design
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing scenarios and examples
- **[KAFKA_SETUP.md](KAFKA_SETUP.md)** - Kafka setup and configuration
- **[SWAGGER_GUIDE.md](SWAGGER_GUIDE.md)** - OpenAPI/Swagger documentation guide

## Example: Temperature Monitoring

1. Create a rule to detect high temperatures:

```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HighTemp",
    "eplQuery": "select * from Event(temperature > 100)",
    "description": "High temperature alert",
    "active": true
  }'
```

1. The CEP engine will immediately start monitoring for matching events

2. Send events to Kafka topic `events` - the engine will match and create incidents

3. View incidents via REST API or subscribe to real-time updates:

```bash
# Get all incidents
curl http://localhost:8081/api/incidents

# Stream real-time incidents (SSE)
curl -N http://localhost:8081/api/incidents/stream
```

## Performance Optimization

### Caching

The application uses Caffeine cache to optimize incident retrieval:

- **Cache Duration**: 30 seconds
- **Cache Size**: Up to 1000 entries
- **Hit Rate**: Typically 80-90% for frequently accessed data
- **Performance Gain**: ~90% reduction in database queries

Monitor cache performance:

```bash
curl http://localhost:8081/api/cache/stats
```

See [CACHING.md](CACHING.md) for detailed caching documentation.

## Technology Stack

- **Java 21** - Programming language
- **Spring Boot 4.0.1** - Application framework
- **Esper CEP 9.0.0** - Complex Event Processing engine
- **Apache Kafka 3.6.0** - Event streaming
- **PostgreSQL** - Primary database (production)
- **H2 Database** - Alternative database (development)
- **Caffeine Cache** - High-performance caching library
- **SpringDoc OpenAPI 2.8.4** - API documentation
- **Maven** - Build tool

## Development

### Run in Development Mode

```bash
# Start infrastructure
docker-compose up -d

# Run the application with Maven
mvn spring-boot:run

# Or with hot reload
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true"
```

### Run Tests

```bash
mvn test
```

### Stop Infrastructure

```bash
docker-compose down
```

## Production Deployment

1. Build the JAR:

```bash
mvn clean package
```

1. Run the application:

```bash
java -jar target/cep-dynamic-1.0-SNAPSHOT.jar
```

1. Configure external database and Kafka cluster in `application.yml` or via environment variables:

```bash
# Using environment variables
export SPRING_DATASOURCE_URL=jdbc:postgresql://prod-db:5432/cep_rules
export SPRING_DATASOURCE_USERNAME=prod_user
export SPRING_DATASOURCE_PASSWORD=prod_password
export SPRING_KAFKA_BOOTSTRAP_SERVERS=prod-kafka:9092

java -jar target/cep-dynamic-1.0-SNAPSHOT.jar
```

### Docker Deployment

Build and run with Docker:

```bash
# Build Docker image
docker build -f Dockerfile.api -t cep-rule-management .

# Run container
docker run -p 8081:8081 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/cep_rules \
  -e SPRING_KAFKA_BOOTSTRAP_SERVERS=host.docker.internal:9092 \
  cep-rule-management
```

## License

MIT License
