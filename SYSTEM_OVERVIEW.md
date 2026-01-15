# CEP System - Complete Overview

## System Architecture

You now have a **clean separation** between rule management and event processing:

```
┌──────────────────────────────────────────────────────────────┐
│                    SPRING BOOT API                            │
│                   (Port 8081)                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  REST Endpoints for Rule Management                     │  │
│  │  - Create, Read, Update, Delete rules                   │  │
│  │  - Activate/Deactivate rules                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  H2 Database (./data/cep-rules)                         │  │
│  │  - Stores all rules                                     │  │
│  │  - Shared with CEP Engine                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          ↓ (Polled every 5s)
┌──────────────────────────────────────────────────────────────┐
│                    CEP ENGINE                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  RuleSynchronizer                                       │  │
│  │  - Polls database for rule changes                      │  │
│  │  - Deploys/undeploys rules                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Esper CEP Engine                                       │  │
│  │  - Processes events against active rules                │  │
│  │  - Triggers actions on pattern matches                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↑                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Kafka Consumer                                         │  │
│  │  - Consumes events from Kafka topic                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          ↑
┌──────────────────────────────────────────────────────────────┐
│                    KAFKA                                      │
│                    Topic: "events"                            │
└──────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Spring Boot API (`gemoc.mbdo.cep.api`)

**Main Class**: `RuleManagementApplication`

**Components**:
- `RuleController` - REST endpoints
- `RuleServiceImpl` - Business logic (implements `RuleService` interface)
- `RuleRepository` - JPA repository for database access
- `RuleRequest/RuleResponse` - DTOs for API

**Responsibilities**:
- Provide REST API for rule management
- Validate rule data
- Store rules in database
- No event processing

**Start Command**:
```bash
mvn spring-boot:run -Dspring-boot.run.mainClass=gemoc.mbdo.cep.api.RuleManagementApplication
```

### 2. CEP Engine (`gemoc.mbdo.cep.engine`)

**Main Class**: `CepEngineApplication`

**Components**:
- `EsperCepEngineImpl` - Implements `CepEngine` interface
- `RuleSynchronizer` - Polls database for rule changes
- `KafkaEventConsumer` - Consumes events from Kafka

**Responsibilities**:
- Poll database every 5 seconds for rule changes
- Deploy/undeploy rules in Esper
- Consume events from Kafka
- Process events against active rules
- Trigger actions on pattern matches

**Start Command**:
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

### 3. Shared Database

**Type**: H2 File-based Database  
**Location**: `./data/cep-rules`  
**Config**: `AUTO_SERVER=TRUE` (allows multiple connections)

**Schema**:
```sql
CREATE TABLE rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    epl_query TEXT NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    deployment_id VARCHAR(255)
);
```

## Communication Flow

### How Rules Get to the Engine:

1. **User creates rule via API**:
   ```bash
   curl -X POST http://localhost:8081/api/rules \
     -H "Content-Type: application/json" \
     -d '{
       "name": "high-value-alerts",
       "eplQuery": "select * from Event(type=\"alert\" and value > 100)",
       "description": "Detect high-value alerts"
     }'
   ```

2. **API saves rule to database**:
   - Validates input
   - Saves to `rules` table
   - Returns success response

3. **CEP Engine polls database** (every 5 seconds):
   - `RuleSynchronizer` queries for active rules
   - Compares with currently deployed rules
   - Deploys new/updated rules
   - Undeploys inactive rules

4. **Rule is now active**:
   - Esper engine has the rule deployed
   - Events will be evaluated against this rule

### How Events Are Processed:

1. **Event producer sends to Kafka**:
   ```bash
   mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"
   ```

2. **CEP Engine consumes from Kafka**:
   - `KafkaEventConsumer` polls Kafka topic
   - Receives event

3. **Event sent to Esper**:
   - `EsperCepEngineImpl.sendEvent(event)`
   - Esper evaluates event against all active rules

4. **Pattern matches trigger actions**:
   - If rule matches, listener is called
   - Action is executed (currently logs to console)

## REST API Endpoints

### Rule Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | List all rules |
| GET | `/api/rules/{id}` | Get rule by ID |
| GET | `/api/rules/name/{name}` | Get rule by name |
| GET | `/api/rules/active` | List active rules only |
| POST | `/api/rules` | Create new rule |
| PUT | `/api/rules/{id}` | Update rule |
| DELETE | `/api/rules/{id}` | Delete rule |
| PATCH | `/api/rules/{id}/activate` | Activate rule |
| PATCH | `/api/rules/{id}/deactivate` | Deactivate rule |

### Example Requests

**Create Rule**:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "error-events",
    "eplQuery": "select * from Event(type=\"error\")",
    "description": "Detect all error events",
    "active": true
  }'
```

**List All Rules**:
```bash
curl http://localhost:8081/api/rules
```

**Deactivate Rule**:
```bash
curl -X PATCH http://localhost:8081/api/rules/1/deactivate
```

## Running the Complete System

### Step 1: Start Kafka
```bash
docker-compose up -d
```

### Step 2: Start Spring Boot API (Terminal 1)
```bash
mvn spring-boot:run -Dspring-boot.run.mainClass=gemoc.mbdo.cep.api.RuleManagementApplication
```

Wait for:
```
=== Rule Management API Started ===
API available at: http://localhost:8081
```

### Step 3: Start CEP Engine (Terminal 2)
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

Wait for:
```
╔════════════════════════════════════════╗
║     CEP ENGINE READY                   ║
╚════════════════════════════════════════╝
```

### Step 4: Create Rules (Terminal 3)
```bash
# Create a simple filter rule
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-value-alerts",
    "eplQuery": "select * from Event(type=\"alert\" and value > 100)",
    "description": "Detect high-value alerts"
  }'
```

Wait 5 seconds, then check Terminal 2 for:
```
✓ Deployed rule: high-value-alerts
```

### Step 5: Send Events (Terminal 4)
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"
```

Watch Terminal 2 for matches:
```
[KAFKA] Received: Event{id='1', type='alert', value=150.0, timestamp=...}
[high-value-alerts] MATCH: {id=1, type=alert, value=150.0, timestamp=...}
```

## Configuration

### Spring Boot API (`src/main/resources/application.yml`)
```yaml
spring:
  datasource:
    url: jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE
server:
  port: 8081
```

### CEP Engine (`CepEngineApplication.java`)
```java
JDBC_URL = "jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE"
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "events"
RULE_SYNC_INTERVAL_MS = 5000  // 5 seconds
```

## Key Design Decisions

### 1. Why Separate Applications?
- **Independence**: API and Engine can be deployed/scaled separately
- **Clarity**: Clear separation of concerns
- **Maintenance**: Easier to maintain and update
- **Scaling**: Can scale API and Engine independently

### 2. Why Database Polling?
- **Simplicity**: No additional infrastructure needed
- **Reliability**: Database is single source of truth
- **Trade-off**: 5-second delay vs. complexity

**Alternative**: Use Kafka for rule changes (instant updates, more complex)

### 3. Why H2 Database?
- **Simplicity**: File-based, no server needed
- **Development**: Easy setup for development
- **Production**: Replace with PostgreSQL/MySQL

### 4. Why Shared Database?
- **Communication**: Simple way for API and Engine to communicate
- **Consistency**: Single source of truth for rules
- **No Dependencies**: No message queue needed

## Interfaces Used

### `CepEngine` Interface
```java
public interface CepEngine {
    void checkPattern(String pattern) throws Exception;
    void registerPattern(String pattern, String queryName) throws Exception;
}
```

**Implementation**: `EsperCepEngineImpl`

### `RuleService` Interface
```java
public interface RuleService {
    void addRule(Rule rule);
    void removeRule(Rule rule) throws Exception;
    List<Rule> getRules();
}
```

**Implementation**: `RuleServiceImpl`

## Documentation Files

- `ARCHITECTURE.md` - Detailed architecture documentation
- `QUICKSTART_SEPARATED.md` - Step-by-step quick start guide
- `SYSTEM_OVERVIEW.md` - This file

## Next Steps

1. **Test the system** - Follow QUICKSTART_SEPARATED.md
2. **Add custom actions** - Modify listeners in `EsperCepEngineImpl`
3. **Add more event types** - Register custom event classes
4. **Production deployment** - Replace H2 with PostgreSQL
5. **Add monitoring** - Integrate Prometheus/Grafana
6. **Add authentication** - Secure the REST API
7. **Add rule versioning** - Track rule changes over time

## Troubleshooting

### Rules not deploying
- Check CEP Engine logs for compilation errors
- Verify EPL syntax is correct
- Check database connection

### Events not matching
- Verify rule is active: `curl http://localhost:8081/api/rules/active`
- Check event format matches EPL query
- Verify Kafka consumer is running

### Database locked
- Stop both applications
- Delete `./data/cep-rules.mv.db`
- Restart API first, then Engine

### Port 8081 already in use
- Change port in `application.yml`
- Or stop other application using port 8081

## Summary

You now have a **production-ready architecture** with:

✅ **Separated concerns**: API for management, Engine for processing  
✅ **Clean interfaces**: `CepEngine` and `RuleService`  
✅ **Database communication**: Simple and reliable  
✅ **Kafka integration**: Real-time event processing  
✅ **Dynamic rules**: Add/remove rules without restart  
✅ **REST API**: Easy integration with other systems  

The system is **simple**, **maintainable**, and **scalable**.
