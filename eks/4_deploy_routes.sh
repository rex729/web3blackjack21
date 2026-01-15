#!/bin/bash
set -e

echo "==================================================="
echo "🚀 步驟 4: 設定 Ingress 路由"
echo "==================================================="

# 部署 Ingress
echo "🌐 正在部署 Ingress 規則..."
# 這需要等待 Application Service 與 Ingress Controller 都已經準備好
kubectl apply -f ingress.yaml

echo "==================================================="
echo "✅ Ingress 設定已套用！"
echo "   請使用以下指令取得外部存取網址 (Address)："
echo "   kubectl get ingress"
echo "==================================================="
