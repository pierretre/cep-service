# PostgreSQL LISTEN/NOTIFY Setup Guide

This guide explains how to set up and use PostgreSQL's LISTEN/NOTIFY feature for real-time rule synchronization.

## Overview

Instead of polling the database every 5 seconds, the CEP Engine now uses PostgreSQL's LISTEN/NOTIFY mechanism for instant rule updates:

- **Instant Updates**: Rules are deployed/undeployed immediately when changed via API
- **No Polling Overhead**: No unnecessary database queries
- **Database-Native**: Uses PostgreSQL's built-in pub/sub feature
- **Reliable**: Automatic reconnection on connection loss

## Architecture

```
┌─────────────────┐
│  Rule Mgmt API  │
└────────┬────────┘
         │ INSERT/UPDATE/DELETE
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Database)    │
└────────┬────────┘
         │ NOTIFY via Trigger
         ▼
┌─────────────────┐
│   CEP Engine    │
│   (LISTEN)      │
└─────────────────┘
```

## How It Works

1. **Database Trigger**: When a rule is inserted, updated, or deleted, a PostgreSQL trigger fires
2. **NOTIFY**: The trigger sends a notification on the `rule_changes` channel
3. **LISTEN**: The CEP Engine listens on this channel and receives notifications instantly
4. **Deploy/Undeploy**: The engine immediately deploys or undeploys the rule

## Setup Options

### Option 1: Docker Compose (Recommended)

The easiest way to get started:

```bash
# Start all services (PostgreSQL, Kafka, API, Engine)
docker-compose up -d

# View logs
docker-compose logs -f engine
```

PostgreSQL is automatically configured with:
- Database: `cep_rules`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

### Option 2: Local PostgreSQL

If you have PostgreSQL installed locally:

#### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE cep_rules;

# Connect to the database
\c cep_rules
```

#### 2. Create Trigger Function

```sql
-- Create function to notify on rule changes
CREATE OR REPLACE FUNCTION notify_rule_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify('rule_changes', 'INSERT:' || NEW.id || ':' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM pg_notify('rule_changes', 'UPDATE:' || NEW.id || ':' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('rule_changes', 'DELETE:' || OLD.id || ':' || OLD.name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Create Trigger

```sql
-- Create trigger on rules table (will be created by Hibernate)
-- Run this AFTER starting the API for the first time
CREATE TRIGGER rule_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON rules
FOR EACH ROW
EXECUTE FUNCTION notify_rule_change();
```

#### 4. Update Configuration

Edit `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/cep_rules
    driver-class-name: org.postgresql.Driver
    username: postgres
    password: your_password

cep:
  database:
    url: jdbc:postgresql://localhost:5432/cep_rules
    username: postgres
    password: your_password
    use-postgres-notify: true
```

#### 5. Start Services

```bash
# Terminal 1: Start Kafka
docker-compose up -d kafka

# Terminal 2: Start API
mvn spring-boot:run -Dspring-boot.run.mainClass=gemoc.mbdo.cep.api.RuleManagementApplication

# Terminal 3: Start Engine
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

## Testing the Setup

### 1. Verify LISTEN/NOTIFY is Active

When you start the CEP Engine, you should see:

```
Starting PostgreSQL LISTEN/NOTIFY rule synchronizer...
✓ Listening on channel: rule_changes
✓ Loaded 0 active rules
✓ PostgreSQL notification listener started

╔════════════════════════════════════════╗
║     CEP ENGINE READY                   ║
╠════════════════════════════════════════╣
║  Database: jdbc:postgresql://localhost:5432/cep_rules
║  DB User: postgres
║  Kafka: localhost:9092
║  Topic: events
║  Rule Sync: PostgreSQL LISTEN/NOTIFY (real-time)
╚════════════════════════════════════════╝
```

### 2. Create a Rule

```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-rule",
    "eplQuery": "select * from Event(value > 100)",
    "description": "Test rule"
  }'
```

### 3. Check Engine Logs

You should see **immediately** (no 5-second delay):

```
[NOTIFY] Channel: rule_changes, Payload: INSERT:1:test-rule
✓ Deployed rule: test-rule
```

### 4. Update the Rule

```bash
curl -X PUT http://localhost:8081/api/rules/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-rule",
    "eplQuery": "select * from Event(value > 150)",
    "description": "Updated threshold",
    "active": true
  }'
```

Engine logs:

```
[NOTIFY] Channel: rule_changes, Payload: UPDATE:1:test-rule
Redeploying updated rule: test-rule
✓ Undeployed rule: test-rule
✓ Deployed rule: test-rule
```

### 5. Deactivate the Rule

```bash
curl -X PATCH http://localhost:8081/api/rules/1/deactivate
```

Engine logs:

```
[NOTIFY] Channel: rule_changes, Payload: UPDATE:1:test-rule
✓ Undeployed rule: test-rule
```

## Manual Testing with psql

You can manually test LISTEN/NOTIFY:

### Terminal 1: Listen for notifications

```bash
psql -U postgres -d cep_rules

LISTEN rule_changes;
```

### Terminal 2: Send notification

```bash
psql -U postgres -d cep_rules

NOTIFY rule_changes, 'INSERT:1:test-rule';
```

Terminal 1 should show:

```
Asynchronous notification "rule_changes" with payload "INSERT:1:test-rule" received from server process with PID 12345.
```

## Configuration Options

### Enable/Disable LISTEN/NOTIFY

In `application.yml`:

```yaml
cep:
  database:
    use-postgres-notify: true  # Use LISTEN/NOTIFY
    # use-postgres-notify: false  # Use polling instead
```

### Fallback to Polling

If PostgreSQL LISTEN/NOTIFY fails to start, the engine automatically falls back to polling mode:

```
Failed to start PostgreSQL notification listener: ...
Falling back to polling mode...
✓ Using polling mode for rule synchronization
```

## Advantages Over Polling

| Feature | Polling | LISTEN/NOTIFY |
|---------|---------|---------------|
| Update Latency | 5 seconds | Instant |
| Database Load | Constant queries | Minimal |
| Scalability | Limited | Better |
| Complexity | Simple | Moderate |
| Database Support | Any | PostgreSQL only |

## Troubleshooting

### Connection Timeout

The listener sends a keep-alive query every 30 seconds to prevent connection timeout.

### Connection Lost

The listener automatically attempts to reconnect every 5 seconds if the connection is lost.

### Trigger Not Working

Check if the trigger exists:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'rule_change_trigger';
```

If not, create it manually (see setup steps above).

### No Notifications Received

1. Check if the engine is listening:
   ```
   ✓ Listening on channel: rule_changes
   ```

2. Verify the trigger is firing:
   ```sql
   -- In psql
   LISTEN rule_changes;
   
   -- In another terminal, insert a rule via API
   -- You should see the notification in psql
   ```

3. Check PostgreSQL logs for errors

### Using H2 Instead

If you want to use H2 (for development), update `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE
    driver-class-name: org.h2.Driver
    username: sa
    password: 

cep:
  database:
    url: jdbc:h2:./data/cep-rules;AUTO_SERVER=TRUE
    username: sa
    password: 
    use-postgres-notify: false  # H2 doesn't support LISTEN/NOTIFY
  rule-sync-interval-ms: 5000  # Use polling instead
```

## Production Considerations

1. **Connection Pooling**: The LISTEN connection is separate from the API's connection pool
2. **Firewall**: Ensure PostgreSQL port (5432) is accessible from the engine
3. **SSL**: Use SSL for production databases
4. **Monitoring**: Monitor the listener thread for health
5. **Backup**: The trigger function should be included in database backups

## Summary

PostgreSQL LISTEN/NOTIFY provides:
- ✅ **Instant rule updates** (no 5-second delay)
- ✅ **Reduced database load** (no polling queries)
- ✅ **Automatic reconnection** on connection loss
- ✅ **Simple setup** with Docker Compose
- ✅ **Fallback to polling** if needed

The system is production-ready and provides real-time rule synchronization!
