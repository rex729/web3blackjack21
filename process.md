# Web3Blackjack Project Progress

## 項目概述
Web3Blackjack 是一個結合現代 Web 技術與後端同步功能的 21 點遊戲。目前已完成基礎的遊戲邏輯開發與後端 API 整合。

## 當前進度 (Current Status)

### 1. 後端開發 (Backend - Node.js/Prisma)
- [x] **環境架設**: 使用 Express 搭配 TypeScript。
- [x] **資料庫設計**: 使用 SQLite 與 Prisma ORM 定義 `User` 模型。
- [x] **身份驗證 API**: 實作 `POST /api/auth/login`，支持自動註冊與登入。
- [x] **餘額管理 API**: 實作 `POST /api/user/balance`，用於同步玩家的下注與獲勝金額。
- [x] **Socket.io**: 初步整合 Socket.io，為未來即時功能預留架構。

### 2. 前端開發 (Frontend - Vue 3/Pinia)
- [x] **UI/UX 設計**: 採用現代化的深色主題介面 (Tailwind CSS)，包含發牌動畫效果（CSS Transitions）。
- [x] **身份驗證 Store (`auth.ts`)**: 處理登入狀態，並與後端同步玩家資訊。
- [x] **遊戲邏輯 Store (`game.ts`)**: 
    - 完整實現洗牌、發牌、計算點數邏輯。
    - 實作「要牌 (Hit)」、「停牌 (Stand)」功能。
    - 自動判斷莊家補牌順序。
    - 自動判定遊戲結果（Blackjack, Bust, Push, Win/Loss）。
- [x] **自動同步**: 遊戲開始前自動扣除餘額，結算後自動更新後端資料。

## 技術棧 (Tech Stack)
- **Frontend**: Vue 3 (Composition API), Pinia (State Management), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: SQLite, Prisma ORM.

## 待完成 / 後續優化 (Next Steps)
- [ ] **邏輯後端化**: 為了防止前端作弊，計劃將洗牌與判定邏輯移至後端伺服器。
- [ ] **Web3 整合**: 加入錢包連接功能（如 MetaMask），實現真正的 Web3 元素（如代幣下注）。
- [ ] **音效系統**: 增加發牌、洗牌與輸贏的音效提升沉浸感。
- [ ] **歷史記錄**: 記錄玩家的對局歷史與盈虧曲線。

---
*更新日期：2026-01-11*
