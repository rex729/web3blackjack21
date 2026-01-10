# Web3 Blackjack Backend (Node.js + Prisma + SQLite)

這是遊戲的後端服務，負責處理使用者認證、餘額持久化與基礎數據服務。

## 目前已實現功能 (Summary)

1.  **使用者自動化管理 (Auth)**
    *   實作了「懶人登入」邏輯：輸入 Email 即可登入。
    *   **自動註冊**：新 Email 會自動創建帳號並給予 **1000 點** 初始點數。
    *   **資料持久化**：玩家的點數與頭像資訊皆存儲於 SQLite 資料庫中。

2.  **API 接口 (Endpoints)**
    *   `POST /api/auth/login`: 認證玩家並獲取/創建資料。
    *   `POST /api/user/balance`: 同步遊戲結果，更新資料庫中的餘額。

3.  **資料結構 (Database)**
    *   使用 **Prisma ORM** 管理資料。
    *   **SQLite** 資料庫 (`dev.db`)：位於本地開發環境，無需額外安裝資料庫伺服器。

4.  **即時通信 (Socket.io)**
    *   已預留 Socket.io 架構，方便未來擴充多人在線或即時對戰功能。

## 啟動方式

1.  進入後端目錄: `cd backend`
2.  安裝依賴: `npm install`
3.  同步資料庫結構: `npx prisma db push`
4.  啟動開發伺服器: `npm run dev` (監聽 Port 4000)

## 技術棧
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express
- **ORM**: Prisma
- **Database**: SQLite3
