#!/bin/bash
set -e

REGISTRY="uck729"
APP_NAME="web3blackjack"
TAG="latest"

echo "Using registry: $REGISTRY"
echo "Building Backend Image..."

# [安全機制] 暫時隱藏本地資料庫，以免被打包進 Docker Image
if [ -f "prisma/dev.db" ]; then
    echo "⚠️  發現本地資料庫。暫時更名以排除在建置之外..."
    mv prisma/dev.db prisma/dev.db.bak
fi

# 確保即使建置失敗也能還原資料庫
function cleanup {
    if [ -f "prisma/dev.db.bak" ]; then
        echo "♻️  正在還原本地資料庫..."
        mv prisma/dev.db.bak prisma/dev.db
    fi
}
trap cleanup EXIT

# Build from current directory (backend/)
docker build --platform linux/amd64 -t $REGISTRY/$APP_NAME-backend:$TAG .

echo "Pushing Backend Image..."
docker push $REGISTRY/$APP_NAME-backend:$TAG

echo "✅ Backend Done!"
