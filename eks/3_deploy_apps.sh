#!/bin/bash
set -e

echo "==================================================="
echo "🚀 步驟 3: 部署應用程式與原始設定"
echo "==================================================="

# 1. 部署機密資訊 (Secrets) - 包含連線 Neon DB 的 DATABASE_URL
echo "🔒 正在部署/更新機密資訊 (secrets.yaml)..."
kubectl apply -f secrets.yaml

# 2. 部署應用程式 (Applications)
echo "📦 正在部署應用程式 (Backend & Client)..."
kubectl apply -f backend.yaml
kubectl apply -f client.yaml

# 3. 強制滾動更新 (Ensure latest image is pulled since we use :latest tag)
echo "♻️  正在強制重啟服務以確保載入最新 Image..."
kubectl rollout restart deployment backend-deployment
kubectl rollout restart deployment client-deployment

echo "==================================================="
echo "✅ 部署完成！"
echo "   請使用以下指令檢查 Pod 啟動狀態："
echo "   kubectl get pods --watch"
echo "==================================================="
