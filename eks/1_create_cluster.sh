#!/bin/bash
set -e

CLUSTER_NAME="web3blackjack-cluster-v2"
REGION="us-east-1"
NODE_TYPE="t3.medium"
NODES=3 # 2 個節點用於後端，1 個用於前端

echo "==================================================="
echo "🚀 步驟 1: 建立 EKS 叢集"
echo "   叢集名稱: $CLUSTER_NAME"
echo "   區域:    $REGION"
echo "   節點:    $NODES ($NODE_TYPE)"
echo "==================================================="

# 檢查叢集是否存在
if eksctl get cluster --name $CLUSTER_NAME --region $REGION >/dev/null 2>&1; then
    echo "✅ 叢集 '$CLUSTER_NAME' 已存在。跳過建立步驟。"
else
    echo "🚧 正在建立叢集與節點群組... (這可能需要 15-20 分鐘)"
    eksctl create cluster \
        --name $CLUSTER_NAME \
        --region $REGION \
        --nodegroup-name standard-workers \
        --node-type $NODE_TYPE \
        --nodes $NODES \
        --nodes-min 1 \
        --nodes-max 4 \
        --managed
    
    echo "✅ 叢集建立成功！"
fi

# 更新 kubeconfig
echo "🔄 正在更新 kubeconfig..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
