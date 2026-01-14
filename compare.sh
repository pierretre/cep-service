#!/bin/bash
# Run both Flink CEP and Esper CEP implementations for comparison

echo "Building project..."
mvn clean package -DskipTests -q

if [ $? -eq 0 ]; then
    echo ""
    echo "Running CEP Comparison..."
    echo ""
    java -cp target/flink-cep-demo-1.0-SNAPSHOT.jar com.example.ComparisonRunner
else
    echo "Build failed!"
    exit 1
fi
