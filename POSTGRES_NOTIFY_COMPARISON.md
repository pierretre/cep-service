# Rule Synchronization: Polling vs PostgreSQL LISTEN/NOTIFY

## Comparison

### Polling Approach (Original)

```
Time: 0s ──────> 5s ──────> 10s ──────> 15s
      │          │           │           │
      │          │           │           │
API:  │ Create   │           │           │
      │ Rule     │           │           │
      └──────────┼───────────┼───────────┤
                 │           │           │
Engine:          │ Poll DB   │ Poll DB   │ Poll DB
                 │ Deploy!   │           │
                 └───────────┴───────────┘
                 
Latency: 0-5 seconds (average 2.5s)
```

### PostgreSQL LISTEN/NOTIFY (New)

```
Time: 0s ──────> 0.01s
      │          │
      │          │
API:  │ Create   │
      │ Rule     │
      │ NOTIFY ──┤
      │          │
Engine:          │ Receive
                 │ Deploy!
                 └──────────
                 
Latency: ~10ms (instant)
```

## Performance Comparison

| Metric | Polling | LISTEN/NOTIFY |
|--------|---------|---------------|
| **Update Latency** | 0-5 seconds | ~10ms |
| **Average Latency** | 2.5 seconds | ~10ms |
| **Database Queries/min** | 12 (every 5s) | 0 |
| **CPU Usage** | Constant | Event-driven |
| **Network Traffic** | Constant | Minimal |
| **Scalability** | Limited | Better |

## Real-World Example

### Scenario: Create 10 rules in quick succession

#### With Polling (5-second interval):

```
0.0s: Create rule 1 → Saved to DB
0.1s: Create rule 2 → Saved to DB
0.2s: Create rule 3 → Saved to DB
...
0.9s: Create rule 10 → Saved to DB

5.0s: Engine polls → Deploys all 10 rules at once

Total time: 5 seconds
```

#### With LISTEN/NOTIFY:

```
0.0s: Create rule 1 → Saved to DB → NOTIFY → Deploy (0.01s)
0.1s: Create rule 2 → Saved to DB → NOTIFY → Deploy (0.01s)
0.2s: Create rule 3 → Saved to DB → NOTIFY → Deploy (0.01s)
...
0.9s: Create rule 10 → Saved to DB → NOTIFY → Deploy (0.01s)

Total time: ~1 second (all rules deployed individually)
```

## Code Comparison

### Polling Implementation

```java
// RuleSynchronizer.java
public void start() {
    Thread syncThread = new Thread(() -> {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                synchronizeRules();  // Query database
                Thread.sleep(5000);   // Wait 5 seconds
            } catch (Exception e) {
                // Handle error
            }
        }
    });
    syncThread.start();
}
```

**Pros:**
- Simple implementation
- Works with any database (H2, PostgreSQL, MySQL)
- No persistent connection needed

**Cons:**
- Constant database queries (even when no changes)
- 0-5 second latency
- Wasted resources

### LISTEN/NOTIFY Implementation

```java
// PostgresRuleNotificationListener.java
public void start() throws SQLException {
    connection = DriverManager.getConnection(jdbcUrl, username, password);
    pgConnection = connection.unwrap(PGConnection.class);
    
    // Start listening
    try (Statement stmt = connection.createStatement()) {
        stmt.execute("LISTEN rule_changes");
    }
    
    // Wait for notifications
    Thread listenerThread = new Thread(() -> {
        while (running) {
            PGNotification[] notifications = pgConnection.getNotifications(1000);
            if (notifications != null) {
                for (PGNotification notification : notifications) {
                    handleNotification(notification);  // Deploy immediately
                }
            }
        }
    });
    listenerThread.start();
}
```

**Pros:**
- Instant updates (~10ms)
- No polling overhead
- Event-driven architecture
- Database-native feature

**Cons:**
- PostgreSQL only
- Requires persistent connection
- Slightly more complex

## Database Trigger

The magic happens with a PostgreSQL trigger:

```sql
CREATE OR REPLACE FUNCTION notify_rule_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify('rule_changes', 'INSERT:' || NEW.id || ':' || NEW.name);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM pg_notify('rule_changes', 'UPDATE:' || NEW.id || ':' || NEW.name);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('rule_changes', 'DELETE:' || OLD.id || ':' || OLD.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rule_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON rules
FOR EACH ROW
EXECUTE FUNCTION notify_rule_change();
```

This trigger automatically sends a notification whenever a rule is modified.

## When to Use Each Approach

### Use Polling When:
- Using H2 or other databases without LISTEN/NOTIFY
- Development/testing environment
- Simplicity is more important than latency
- Rule changes are infrequent
- You don't want to manage persistent connections

### Use LISTEN/NOTIFY When:
- Using PostgreSQL in production
- Need instant rule updates
- High-frequency rule changes
- Want to minimize database load
- Building a real-time system

## Migration Path

The system supports both approaches and can switch between them:

### 1. Start with Polling (H2)

```yaml
# application.yml
cep:
  database:
    url: jdbc:h2:./data/cep-rules
    use-postgres-notify: false
  rule-sync-interval-ms: 5000
```

### 2. Migrate to PostgreSQL + LISTEN/NOTIFY

```yaml
# application.yml
cep:
  database:
    url: jdbc:postgresql://localhost:5432/cep_rules
    use-postgres-notify: true
```

The engine automatically detects the configuration and uses the appropriate method.

## Monitoring

### Polling Mode

```
Rule Synchronizer started (polling every 5000ms)
✓ Using polling mode for rule synchronization
```

### LISTEN/NOTIFY Mode

```
Starting PostgreSQL LISTEN/NOTIFY rule synchronizer...
✓ Listening on channel: rule_changes
✓ PostgreSQL notification listener started
✓ Using PostgreSQL LISTEN/NOTIFY for real-time rule updates
```

## Conclusion

**For Development**: Use polling with H2 for simplicity

**For Production**: Use PostgreSQL LISTEN/NOTIFY for:
- ⚡ Instant updates (250x faster)
- 📉 Reduced database load (12 queries/min → 0)
- 🚀 Better scalability
- 💪 Production-grade architecture

The implementation supports both, so you can start simple and upgrade when needed!
