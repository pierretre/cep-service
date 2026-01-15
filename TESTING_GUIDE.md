# Testing Guide - Separated Architecture

## Complete Test Scenarios

### Scenario 1: Basic Rule Creation and Event Processing

**Goal**: Create a simple rule and verify it processes events

**Steps**:

1. **Start all services**:
```bash
# Terminal 1: Kafka
docker-compose up -d

# Terminal 2: API
mvn spring-boot:run -Dspring-boot.run.mainClass=gemoc.mbdo.cep.api.RuleManagementApplication

# Terminal 3: Engine
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

2. **Create a rule** (Terminal 4):
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-high-value",
    "eplQuery": "select * from Event(value > 100)",
    "description": "Test rule for high values"
  }'
```

Expected response:
```json
{
  "id": 1,
  "name": "test-high-value",
  "eplQuery": "select * from Event(value > 100)",
  "description": "Test rule for high values",
  "active": true,
  "createdAt": "2026-01-15T10:30:00"
}
```

3. **Wait 5 seconds** and check Terminal 3 for:
```
✓ Deployed rule: test-high-value
```

4. **Send test events** (Terminal 5):
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer"
```

5. **Verify matches** in Terminal 3:
```
[KAFKA] Received: Event{id='1', type='alert', value=150.0, ...}
[test-high-value] MATCH: {id=1, type=alert, value=150.0, ...}
```

**Success Criteria**:
- ✅ Rule created via API
- ✅ Rule deployed to engine within 5 seconds
- ✅ Events with value > 100 trigger the rule
- ✅ Events with value ≤ 100 do not trigger the rule

---

### Scenario 2: Rule Deactivation

**Goal**: Verify that deactivating a rule stops event processing

**Steps**:

1. **List active rules**:
```bash
curl http://localhost:8081/api/rules/active
```

2. **Deactivate rule**:
```bash
curl -X PATCH http://localhost:8081/api/rules/1/deactivate
```

3. **Wait 5 seconds** and check Terminal 3 for:
```
✓ Undeployed rule: test-high-value
```

4. **Send events** and verify NO matches appear in Terminal 3

5. **Reactivate rule**:
```bash
curl -X PATCH http://localhost:8081/api/rules/1/activate
```

6. **Wait 5 seconds** and verify rule is redeployed

7. **Send events** and verify matches appear again

**Success Criteria**:
- ✅ Deactivated rule stops processing events
- ✅ Reactivated rule resumes processing events
- ✅ Changes take effect within 5 seconds

---

### Scenario 3: Multiple Rules

**Goal**: Test multiple rules processing the same events

**Steps**:

1. **Create multiple rules**:

```bash
# Rule 1: High values
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-values",
    "eplQuery": "select * from Event(value > 100)"
  }'

# Rule 2: Alert type
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "alert-type",
    "eplQuery": "select * from Event(type=\"alert\")"
  }'

# Rule 3: Combined
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "high-alerts",
    "eplQuery": "select * from Event(type=\"alert\" and value > 100)"
  }'
```

2. **Wait 5 seconds** for all rules to deploy

3. **Send an event** that matches all rules:
```bash
# This will be done by KafkaEventProducer
# Event: {type='alert', value=150}
```

4. **Verify** Terminal 3 shows matches for all three rules:
```
[high-values] MATCH: ...
[alert-type] MATCH: ...
[high-alerts] MATCH: ...
```

**Success Criteria**:
- ✅ All rules deployed successfully
- ✅ Single event can match multiple rules
- ✅ Each rule triggers independently

---

### Scenario 4: Pattern Detection

**Goal**: Test complex pattern matching

**Steps**:

1. **Create pattern rule**:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "consecutive-alerts",
    "eplQuery": "select a.id as first, b.id as second from pattern [every a=Event(type=\"alert\") -> b=Event(type=\"alert\")]",
    "description": "Detect two consecutive alerts"
  }'
```

2. **Wait 5 seconds**

3. **Send events** ensuring at least two consecutive alerts

4. **Verify** pattern match in Terminal 3:
```
[consecutive-alerts] MATCH: {first=1, second=2}
```

**Success Criteria**:
- ✅ Pattern rule deployed
- ✅ Pattern detected when sequence occurs
- ✅ Pattern not detected for non-matching sequences

---

### Scenario 5: Aggregation

**Goal**: Test time-window aggregation

**Steps**:

1. **Create aggregation rule**:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "event-count",
    "eplQuery": "select type, count(*) as cnt from Event#time(10 sec) group by type output last every 3 seconds",
    "description": "Count events by type"
  }'
```

2. **Wait 5 seconds**

3. **Send multiple events** of different types

4. **Verify** aggregation output every 3 seconds in Terminal 3:
```
[event-count] MATCH: {type=alert, cnt=5}
[event-count] MATCH: {type=info, cnt=3}
```

**Success Criteria**:
- ✅ Aggregation rule deployed
- ✅ Counts updated correctly
- ✅ Output produced at specified intervals

---

### Scenario 6: Rule Update

**Goal**: Test updating an existing rule

**Steps**:

1. **Create initial rule**:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "threshold-test",
    "eplQuery": "select * from Event(value > 100)",
    "description": "Initial threshold"
  }'
```

2. **Wait 5 seconds** and verify deployment

3. **Send event** with value=110, verify match

4. **Update rule** with new threshold:
```bash
curl -X PUT http://localhost:8081/api/rules/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "threshold-test",
    "eplQuery": "select * from Event(value > 150)",
    "description": "Updated threshold",
    "active": true
  }'
```

5. **Wait 5 seconds** for redeployment

6. **Send event** with value=110, verify NO match

7. **Send event** with value=160, verify match

**Success Criteria**:
- ✅ Rule updated in database
- ✅ Old rule undeployed
- ✅ New rule deployed
- ✅ New threshold applied correctly

---

### Scenario 7: Error Handling

**Goal**: Test system behavior with invalid rules

**Steps**:

1. **Try to create rule with invalid EPL**:
```bash
curl -X POST http://localhost:8081/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invalid-rule",
    "eplQuery": "select * from InvalidEvent",
    "description": "This should fail"
  }'
```

2. **Verify** rule is saved to database (API doesn't validate EPL)

3. **Wait 5 seconds** and check Terminal 3 for error:
```
✗ Failed to deploy rule 'invalid-rule': ...
```

4. **Verify** engine continues processing other rules

5. **Fix the rule**:
```bash
curl -X PUT http://localhost:8081/api/rules/X \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invalid-rule",
    "eplQuery": "select * from Event",
    "description": "Fixed rule",
    "active": true
  }'
```

6. **Wait 5 seconds** and verify successful deployment

**Success Criteria**:
- ✅ Invalid rules don't crash the engine
- ✅ Error logged clearly
- ✅ Other rules continue working
- ✅ Fixed rules deploy successfully

---

### Scenario 8: System Restart

**Goal**: Verify rules persist across restarts

**Steps**:

1. **Create several rules** via API

2. **Verify** all rules are processing events

3. **Stop CEP Engine** (Ctrl+C in Terminal 3)

4. **Restart CEP Engine**:
```bash
mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.engine.CepEngineApplication"
```

5. **Wait 5 seconds** for initial sync

6. **Verify** all rules are redeployed:
```
✓ Deployed rule: rule1
✓ Deployed rule: rule2
✓ Deployed rule: rule3
```

7. **Send events** and verify all rules still work

**Success Criteria**:
- ✅ Rules persist in database
- ✅ Engine reloads all active rules on startup
- ✅ No data loss
- ✅ All rules resume processing

---

## Quick Test Commands

### Create Test Rules
```bash
# Simple filter
curl -X POST http://localhost:8081/api/rules -H "Content-Type: application/json" \
  -d '{"name":"test1","eplQuery":"select * from Event(value > 50)"}'

# Type filter
curl -X POST http://localhost:8081/api/rules -H "Content-Type: application/json" \
  -d '{"name":"test2","eplQuery":"select * from Event(type=\"error\")"}'

# Pattern
curl -X POST http://localhost:8081/api/rules -H "Content-Type: application/json" \
  -d '{"name":"test3","eplQuery":"select * from pattern [every a=Event -> b=Event]"}'
```

### List Rules
```bash
# All rules
curl http://localhost:8081/api/rules

# Active only
curl http://localhost:8081/api/rules/active

# Specific rule
curl http://localhost:8081/api/rules/1
```

### Manage Rules
```bash
# Deactivate
curl -X PATCH http://localhost:8081/api/rules/1/deactivate

# Activate
curl -X PATCH http://localhost:8081/api/rules/1/activate

# Delete
curl -X DELETE http://localhost:8081/api/rules/1
```

## Automated Test Script

Save as `test-system.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8081/api/rules"

echo "=== Testing CEP System ==="

# Test 1: Create rule
echo "Test 1: Creating rule..."
RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"name":"auto-test","eplQuery":"select * from Event(value > 100)"}')
echo "Response: $RESPONSE"

# Test 2: List rules
echo "Test 2: Listing rules..."
curl -s $API_URL | jq '.'

# Test 3: Wait for deployment
echo "Test 3: Waiting 6 seconds for deployment..."
sleep 6

# Test 4: Deactivate rule
echo "Test 4: Deactivating rule..."
curl -s -X PATCH $API_URL/1/deactivate

# Test 5: Wait for undeployment
echo "Test 5: Waiting 6 seconds for undeployment..."
sleep 6

# Test 6: Delete rule
echo "Test 6: Deleting rule..."
curl -s -X DELETE $API_URL/1

echo "=== Tests Complete ==="
```

Run with:
```bash
chmod +x test-system.sh
./test-system.sh
```

## Performance Testing

### Load Test: Multiple Rules

```bash
# Create 100 rules
for i in {1..100}; do
  curl -X POST http://localhost:8081/api/rules \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"rule$i\",\"eplQuery\":\"select * from Event(value > $i)\"}"
done

# Wait for all to deploy
sleep 10

# Check engine logs for deployment time
```

### Load Test: High Event Rate

```bash
# Run multiple event producers in parallel
for i in {1..5}; do
  mvn exec:java -Dexec.mainClass="gemoc.mbdo.cep.KafkaEventProducer" &
done

# Monitor engine performance in Terminal 3
```

## Troubleshooting Tests

### Test: Database Connection

```bash
# Check if database is accessible
curl http://localhost:8081/h2-console

# Query rules directly
# JDBC URL: jdbc:h2:./data/cep-rules
# Username: sa
# Password: (empty)
# Query: SELECT * FROM rules;
```

### Test: Kafka Connection

```bash
# Check Kafka is running
docker ps | grep kafka

# List topics
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume events manually
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic events \
  --from-beginning
```

### Test: API Health

```bash
# Check API is responding
curl http://localhost:8081/api/rules

# Check H2 console
curl http://localhost:8081/h2-console
```

## Expected Outputs

### Successful Rule Creation
```json
{
  "id": 1,
  "name": "my-rule",
  "eplQuery": "select * from Event(value > 100)",
  "description": "Test rule",
  "active": true,
  "createdAt": "2026-01-15T10:30:00",
  "updatedAt": null,
  "deploymentId": null
}
```

### Successful Rule Deployment (Engine Log)
```
✓ Deployed rule: my-rule
```

### Successful Event Match (Engine Log)
```
[KAFKA] Received: Event{id='1', type='alert', value=150.0, timestamp=1705315800000}
[my-rule] MATCH: {id=1, type=alert, value=150.0, timestamp=1705315800000}
```

## Summary

Run these scenarios to verify:
- ✅ Rule creation and deployment
- ✅ Event processing
- ✅ Rule updates
- ✅ Rule deactivation
- ✅ Pattern matching
- ✅ Aggregation
- ✅ Error handling
- ✅ System restart
- ✅ Performance under load

All tests should pass for a fully functional system!
