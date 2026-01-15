# Docker Compose Setup for CEP System

## Quick Start

Start all services with a single command:

```bash
./docker-start.sh
```

Stop all services:

```bash
./docker-stop.sh
```

## Services

The Docker Compose setup includes:

1. **Kafka** - Message broker (port 9092)
2. **API** - Rule Management API (port 8081)
3. **Engine** - CEP Engine (Esper)
4. **Producer** - Kafka Event Producer

## Manual Commands

### Start all services
```bash
docker-compose up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f engine
docker-compose logs -f producer
```

### Stop services
```bash
docker-compose down
```

### Rebuild and restart
```bash
docker-compose up --build -d
```

### Restart a specific service
```bash
docker-compose restart api
```

## Access Points

- **API Swagger UI**: http://localhost:8081/swagger-ui.html
- **API Health Check**: http://localhost:8081/actuator/health
- **Kafka**: localhost:9092

## Troubleshooting

### Check service status
```bash
docker-compose ps
```

### View specific service logs
```bash
docker-compose logs api
docker-compose logs engine
docker-compose logs producer
docker-compose logs kafka
```

### Restart a failing service
```bash
docker-compose restart [service-name]
```

### Clean everything (including volumes)
```bash
docker-compose down -v
```

## Architecture

```
┌─────────────┐
│   Producer  │ ──┐
└─────────────┘   │
                  ▼
              ┌────────┐
              │ Kafka  │
              └────────┘
                  │
                  ▼
              ┌────────┐      ┌─────┐
              │ Engine │ ◄──► │ API │
              └────────┘      └─────┘
```

- Producer sends events to Kafka
- Engine consumes events and applies CEP rules
- API manages rules and provides REST interface