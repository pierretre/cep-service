#!/bin/bash
# Build and run the Flink CEP Demo

echo "Building project..."
mvn clean package -DskipTests

if [ $? -eq 0 ]; then
    echo ""
    echo "Running Flink CEP Demo..."
    echo "========================="
    java -jar target/flink-cep-demo-1.0-SNAPSHOT.jar
else
    echo "Build failed!"
    exit 1
fi
