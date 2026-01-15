#!/bin/bash
set -e

echo "==================================================="
echo "🚀 步驟 3: 部署應用程式"
echo "==================================================="

# 部署應用程式 (Applications)
echo "📦 正在部署應用程式 (Backend & Client)..."
kubectl apply -f backend.yaml
kubectl apply -f client.yaml

echo "==================================================="
echo "✅ 應用程式部署指令已發送！"
echo "   請使用以下指令檢查 Pod 狀態："
echo "   kubectl get pods --watch"
echo "==================================================="
