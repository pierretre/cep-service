# Deployment Infrastructure

This folder contains the docker-compose configuration for infrastructure services (Kafka and AKHQ).

## Services

- **Kafka**: Message broker accessible at localhost:9092
- **AKHQ**: Kafka management UI accessible at http://localhost:8080

## Usage

### Start infrastructure services

```bash
cd deployment
docker-compose up -d
```

### Stop infrastructure services

```bash
cd deployment
docker-compose down
```

### View logs

```bash
cd deployment
docker-compose logs -f
```

## Network Configuration

All services use host networking mode, which means:
- Services communicate via `localhost`
- No explicit Docker networks needed
- Services from different compose files can access each other seamlessly

## Starting the Full Stack

1. Start infrastructure first:
   ```bash
   cd deployment
   docker-compose up -d
   ```

2. Wait for Kafka to be healthy (check with `docker ps`)

3. Then start the application services from the project root:
   ```bash
   cd ..
   docker-compose up -d
   ```

## Accessing Services

- Kafka: `localhost:9092`
- AKHQ UI: http://localhost:8080
- API: http://localhost:8081 (when started from root compose)
