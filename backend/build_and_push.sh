#!/bin/bash
set -e

REGISTRY="uck729"
APP_NAME="web3blackjack"
TAG="latest"

echo "Using registry: $REGISTRY"
echo "Building Backend Image (Linux/AMD64)..."

# Build from current directory (backend/)
docker build --platform linux/amd64 -t $REGISTRY/$APP_NAME-backend:$TAG .

echo "Pushing Backend Image..."
docker push $REGISTRY/$APP_NAME-backend:$TAG

echo "✅ Backend Done!"
