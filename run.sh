#!/bin/bash

# CEP System Runner Script

JAR_FILE="target/flink-cep-demo-1.0-SNAPSHOT.jar"

# Check if JAR exists
if [ ! -f "$JAR_FILE" ]; then
    echo "Error: JAR file not found. Please run 'mvn clean package' first."
    exit 1
fi

# Function to display usage
usage() {
    echo "Usage: ./run.sh [api|engine|producer]"
    echo ""
    echo "Commands:"
    echo "  api       - Start the Rule Management API (Spring Boot)"
    echo "  engine    - Start the CEP Engine (Esper)"
    echo "  producer  - Start the Kafka Event Producer (test tool)"
    echo ""
    echo "Examples:"
    echo "  ./run.sh api       # Start API on port 8080"
    echo "  ./run.sh engine    # Start CEP Engine"
    echo "  ./run.sh producer  # Send test events to Kafka"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    api)
        echo "Starting Rule Management API..."
        java -cp "$JAR_FILE" gemoc.mbdo.cep.api.RuleManagementApplication
        ;;
    engine)
        echo "Starting CEP Engine..."
        java -cp "$JAR_FILE" gemoc.mbdo.cep.engine.CepEngineApplication
        ;;
    producer)
        echo "Starting Kafka Event Producer..."
        java -cp "$JAR_FILE" gemoc.mbdo.cep.KafkaEventProducer
        ;;
    *)
        echo "Error: Unknown command '$1'"
        echo ""
        usage
        ;;
esac
