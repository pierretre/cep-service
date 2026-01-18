# Quick Start Guide - Separated Architecture

## Overview

This system consists of two separate applications:
1. **Spring Boot API** - Manages rules via REST API
2. **CEP Engine** - Processes events from Kafka against rules

## Prerequisites

- Java 11+
- Maven
- Docker (for Kafka)

## Step-by-Step Setup

### 1. Start Kafka

```bash
docker-compose up -d
```

Verify Kafka is running:
```bash
docker ps | grep kafka
```

### 2. Compile the Project

```bash
mvn clean compile
```

### 3. Start Spring Boot API (Terminal 1)

```bash
mvn spring-boot:run -Dspring-boot.run.mainClass=gemoc.mbdo.cep.api.RuleManagementApplication
```

You should see:
```
=== Rule Management API Started ===
API available at: http://localhost:8081
H2 Console: http://localhost:8081/h2-console
```

### 4. Start CEP Engine (Terminal 2)

```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

You should see:
```
╔════════════════════════════════════════╗
║     CEP ENGINE READY                   ║
╠════════════════════════════════════════╣
║  Database: jdbc:h2:./data/cep-rules
║  Kafka: localhost:9092
║  Topic: events
║  Rule Sync: Every 5s
╚════════════════════════════════════════╝
```

### 5. Create a Rule via API (Terminal 3)

```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-alerts",
    "eplQuery": "select * from Event(type=\"alert\" and value > 100)",
    "description": "Detect high-value alert events",
    "active": true
  }'
```

**What happens:**
- API saves rule to database
- Within 5 seconds, CEP Engine polls database
- CEP Engine deploys rule to Esper
- You'll see in Terminal 2: `✓ Deployed rule: high-value-alerts`

### 6. Send Test Events (Terminal 4)

Send events to the Kafka topic.

**What happens:**
- Events are sent to Kafka
- CEP Engine consumes events
- Events are evaluated against rules
- Matches are printed in Terminal 2

### 7. View All Rules

```bash
curl http://localhost:8081/api/rules
```

### 8. Deactivate a Rule

```bash
curl -X PATCH http://localhost:8081/api/rules/1/deactivate
```

**What happens:**
- API marks rule as inactive in database
- Within 5 seconds, CEP Engine polls database
- CEP Engine undeploys rule from Esper
- You'll see in Terminal 2: `✓ Undeployed rule: high-value-alerts`

## Complete Example Workflow

### Create Multiple Rules

```bash
# Rule 1: High-value alerts
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-alerts",
    "eplQuery": "select * from Event(type=\"alert\" and value > 100)",
    "description": "Detect high-value alert events"
  }'

# Rule 2: Error events
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "error-events",
    "eplQuery": "select * from Event(type=\"error\")",
    "description": "Detect all error events"
  }'

# Rule 3: Consecutive alerts pattern
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "consecutive-alerts",
    "eplQuery": "select a.id as first, b.id as second from pattern [every a=Event(type=\"alert\") -> b=Event(type=\"alert\")]",
    "description": "Detect two consecutive alerts"
  }'

# Rule 4: Aggregation by type
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "event-count-by-type",
    "eplQuery": "select type, count(*) as cnt from Event#time(10 sec) group by type",
    "description": "Count events by type in 10-second window"
  }'
```

### List Active Rules

```bash
curl http://localhost:8081/api/rules/active
```

### Update a Rule

```bash
curl -X PUT http://localhost:8081/api/rules/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-alerts",
    "eplQuery": "select * from Event(type=\"alert\" and value > 150)",
    "description": "Updated threshold to 150"
  }'
```

### Get Specific Rule

```bash
curl http://localhost:8081/api/rules/1
```

### Delete a Rule

```bash
curl -X DELETE http://localhost:8081/api/rules/1
```

## Testing the System

### Test 1: Simple Filter

1. Create rule:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-filter",
    "eplQuery": "select * from Event(value > 50)"
  }'
```

2. Wait 5 seconds for rule to deploy

3. Send events to the Kafka topic

4. Watch Terminal 2 for matches

### Test 2: Pattern Detection

1. Create pattern rule:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "alert-error-pattern",
    "eplQuery": "select * from pattern [every a=Event(type=\"alert\") -> b=Event(type=\"error\")]"
  }'
```

2. Send events and watch for pattern matches

### Test 3: Deactivate and Reactivate

1. Deactivate rule:
```bash
curl -X PATCH http://localhost:8081/api/rules/1/deactivate
```

2. Send events - no matches should occur

3. Reactivate rule:
```bash
curl -X PATCH http://localhost:8081/api/rules/1/activate
```

4. Send events - matches should occur again

## Monitoring

### View Database

1. Open browser: http://localhost:8081/h2-console
2. JDBC URL: `jdbc:h2:./data/cep-rules`
3. Username: `sa`
4. Password: (leave empty)
5. Click "Connect"

### Query Rules

```sql
SELECT * FROM rules;
SELECT * FROM rules WHERE active = true;
```

## Architecture Summary

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP REST
       ▼
┌─────────────────┐
│  Spring Boot    │
│      API        │
│   (Port 8081)   │
└──────┬──────────┘
       │ JDBC
       ▼
┌─────────────────┐
│   H2 Database   │
│  (File-based)   │
└──────┬──────────┘
       │ JDBC Polling (5s)
       ▼
┌─────────────────┐      ┌──────────┐
│   CEP Engine    │◄─────┤  Kafka   │
│   (Esper)       │      │  Events  │
└─────────────────┘      └──────────┘
```

## Key Points

1. **Two Separate Processes**: API and Engine run independently
2. **Database Communication**: Engine polls database every 5 seconds
3. **5-Second Delay**: Rules take up to 5 seconds to deploy/undeploy
4. **Kafka Integration**: Engine consumes events from Kafka
5. **Rule Management**: All CRUD operations via REST API

## Troubleshooting

### API won't start
- Check port 8081 is available: `lsof -i :8081`
- Check Java version: `java -version` (need 11+)

### CEP Engine won't start
- Ensure API started first (creates database)
- Check Kafka is running: `docker ps | grep kafka`

### Rules not deploying
- Check CEP Engine logs for errors
- Verify rule syntax is valid EPL
- Check database: http://localhost:8081/h2-console

### Events not matching
- Verify rule is active: `curl http://localhost:8081/api/rules/active`
- Check event format matches EPL query
- Verify Kafka consumer is running (check Terminal 2)

### Database locked
- Stop both applications
- Delete `./data/cep-rules.mv.db`
- Restart API first, then Engine

## Next Steps

1. Explore EPL patterns in `ARCHITECTURE.md`
2. Create custom event types
3. Add custom actions on pattern matches
4. Integrate with monitoring systems
5. Deploy to production with PostgreSQL

## Stopping the System

1. Stop CEP Engine (Ctrl+C in Terminal 2)
2. Stop Spring Boot API (Ctrl+C in Terminal 1)
3. Stop Kafka: `docker-compose down`
