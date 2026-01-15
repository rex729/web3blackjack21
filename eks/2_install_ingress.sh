#!/bin/bash
set -e

echo "==================================================="
echo "🚀 步驟 2: 安裝 Ingress Controller"
echo "==================================================="

# 安裝 Nginx Ingress Controller
echo "🛠 正在安裝 Nginx Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

echo "⏳ 等待 Ingress Controller 就緒..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo "✅ Ingress Controller 安裝完成！"
