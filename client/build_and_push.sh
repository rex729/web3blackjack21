#!/bin/bash
set -e

REGISTRY="uck729"
APP_NAME="web3blackjack"
TAG="latest"

echo "Using registry: $REGISTRY"
echo "Building Client Image..."

# Build from current directory (client/)
docker build --platform linux/amd64 -t $REGISTRY/$APP_NAME-client:$TAG .

echo "Pushing Client Image..."
docker push $REGISTRY/$APP_NAME-client:$TAG

echo "✅ Client Done!"
