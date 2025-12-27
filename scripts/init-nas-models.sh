#!/bin/bash

echo "Checking if Ollama container is running with GPU support..."

# Check if container is up
if [ "$(docker ps -q -f name=ollama-service)" ]; then
    echo "Ollama container found."
else
    echo "Error: 'ollama-service' container is not running. Please run 'docker-compose up -d' first."
    exit 1
fi

echo "Pulling models inside the container..."
echo "1. Pulling moondream (Vision)..."
docker exec ollama-service ollama pull moondream

echo "2. Pulling llama3 (Text Logic)..."
docker exec ollama-service ollama pull llama3

echo "Done! Models are ready."
echo "You can now select 'moondream' in the KV-Graph settings."
