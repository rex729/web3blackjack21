#!/bin/bash
CLUSTER_NAME="web3blackjack-cluster-v2"
REGION="us-east-1"

echo "==================================================="
echo "⚠️  警告：即將刪除 EKS 叢集"
echo "   叢集名稱: $CLUSTER_NAME"
echo "   區域:    $REGION"
echo "==================================================="
echo "這將移除所有執行中的 Pod、Service 與負載均衡器。"
read -p "確定要繼續嗎？ (y/n): " confirm

if [ "$confirm" == "y" ]; then
    echo "🚧 正在清理 Kubernetes 資源 (Ingress)..."
    kubectl delete -f ingress.yaml --ignore-not-found
    
    echo "🗑️  正在刪除叢集... (這可能需要 10-15 分鐘)"
    eksctl delete cluster --name $CLUSTER_NAME --region $REGION
    echo "✅ 叢集已成功刪除。"
else
    echo "❌ 操作已取消。"
fi
