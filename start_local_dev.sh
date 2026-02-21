#!/bin/bash

# 遇到錯誤即停止
set -e

echo "🚀 初始化 Web3 Blackjack 本地開發環境..."

# 定義清理函式：當腳本結束或被中斷時，殺死所有背景子進程
cleanup() {
    echo ""
    echo "🛑 正在關閉服務..."
    # 嘗試殺死此腳本啟動的所有子進程
    pkill -P $$ || true
    exit
}

# 捕捉 SIGINT (Ctrl+C) 和 SIGTERM 信號
trap cleanup SIGINT SIGTERM EXIT

# 檢查並殺死已被佔用的 Port (避免重複啟動報錯)
echo "🧹 清理舊的進程 (Port 4000 & 5173)..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 啟動後端
echo "📦 啟動後端服務 (Backend)..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   偵測到尚未安裝依賴，正在執行 npm install..."
    npm install
fi

# 初始化/更新資料庫 Schema (Prisma)
echo "🗄️  正在更新資料庫 Schema (Prisma)..."
npx prisma db push

# 在背景執行
npm run dev &
BACKEND_PID=$!
cd ..

# 等待後端稍微初始化 (可選)
sleep 2

# 啟動前端
echo "🎨 啟動前端服務 (Client)..."
cd client
if [ ! -d "node_modules" ]; then
    echo "   偵測到尚未安裝依賴，正在執行 npm install..."
    npm install
fi
# 在背景執行
npm run dev &
CLIENT_PID=$!
cd ..

echo "✅ 服務已全部啟動！"
echo "👉 Backend API: http://localhost:4000"
echo "👉 Client App:  http://localhost:5173"
echo "按 Ctrl+C 可停止所有服務"

# 等待所有背景進程
wait
