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

## Quick Start

### 1. Build the Project

```bash
mvn clean package -DskipTests
```

### 2. Start postgres container

```bash
docker-compose up postgres -d
```

### 3. Start the API

```bash
mvn spring-boot:run
```

Access points:

- API: <http://localhost:8081/api/rules>
- Swagger UI: <http://localhost:8081/swagger-ui.html>
- H2 Console: <http://localhost:8081/h2-console>

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

## License

MIT License
