# Web3 Blackjack Client

這是一個基於 Vue 3 + TypeScript + Vite + Tailwind CSS 建構的 Blackjack RPG 遊戲前端專案。

## 架構模式 (Architecture)

本專案採用 **MVVM (Model-View-ViewModel)** 架構模式，並結合 **Pinia** 進行集中式狀態管理。

![MVVM Architecture](https://miro.medium.com/v2/resize:fit:1400/1*98-N9r69-42b7Pj5tI6sng.png)

1.  **View (視圖層) - `src/components/`**
    *   **職責**: 負責 UI 渲染與使用者互動。
    *   **特性**: 被動接收資料，不包含複雜業務邏輯。
    *   **對應檔案**: `Lobby.vue`, `Board.vue`, `LoginScreen.vue` 等。

2.  **ViewModel (視圖模型層) - `src/store/`**
    *   **職責**: 作為 View 與 Model 的橋樑。保存 UI 狀態，提供資料給 View (Getters)，並處理 UI 觸發的動作 (Actions)。
    *   **特性**: 透過 Vue 的 Reactivity System 與 View 進行雙向/單向綁定。
    *   **對應檔案**: `store/game.ts`, `store/auth.ts`, `store/lobby.ts`。

3.  **Model (模型層) - `src/config/` & Backend Service**
    *   **職責**: 定義資料結構、靜態設定與後端資料交互。
    *   **對應檔案**: `config/levels.ts` (靜態資料), Socket.IO 連線 (動態資料源)。

---

## 專案結構說明

### 核心檔案

- **`src/main.ts`**
  - **用途**: 應用程式的進入點。
  - **職責**: 
    - 初始化 Vue 應用實例。
    - 註冊 Pinia 狀態管理庫。
    - 掛載 Root Component (`App.vue`) 到 DOM 上。
    - 引入全域樣式 (`style.css`)。

- **`vite.config.ts`**
  - **用途**: Vite 建構工具的設定檔。
  - **職責**:
    - 設定 Vue 插件。
    - 配置路徑別名 (`@/` 指向 `src/`)。
    - **Proxy 設定**: 將 `/api` 和 `/socket.io`請求轉發到後端 (Port 4000)。
    - **Header 設定**: 設定 COOP/COEP Headers 以支援 Google 登入功能。

### 狀態管理 (Pinia Stores) - `src/store/`

- **`game.ts`**
  - **用途**: 管理遊戲對局與即時連線狀態。
  - **職責**:
    - 維護目前牌局資料（手牌、分數、輸贏狀態）。
    - 管理 `currentTableId` (當前所在的遊戲桌/關卡)。
    - 封裝 **Socket.IO** 連線邏輯 (`initializeSocket`, `disconnectSocket`)。
    - 處理遊戲動作 Request (`hit`, `stand`, `placeBet`) 與 Response。
    - 提供 `fullLogout` action 來清除遊戲與連線狀態。

- **`auth.ts`**
  - **用途**: 管理使用者認證狀態。
  - **職責**:
    - 儲存使用者資訊 (`user` object) 與 JWT Token。
    - 處理 Google Login 邏輯與後端 API 驗證 (`loginWithGoogle`)。
    - 處理登出 (`logout`) 與 Session 恢復 (`initialize`)。

- **`lobby.ts`**
  - **用途**: 管理遊戲大廳邏輯。
  - **職責**:
    - 讀取並提供關卡設定列表 (`levels`)。
    - 提供 `canEnter(levelId)` 檢查邏輯 (判斷餘額與解鎖狀態)。
    - 處理進入關卡的動作 (`enterLevel`)，驗證通過後呼叫 `gameStore.joinTable`。

### 設定檔 - `src/config/`

- **`levels.ts`**
  - **用途**: 關卡靜態設定檔。
  - **職責**:
    - 定義所有關卡 (World Tour Map) 的詳細參數。
    - 包含：ID、名稱、入場費 (BuyIn)、獎金、圖片、特殊規則等。

### Vue 元件 (主要) - `src/components/`

- **`App.vue`**
  - **用途**: 根元件，負責頁面路由切換。
  - **職責**: 根據狀態 (`authStore.user`, `gameStore.currentTableId`) 決定顯示 `LoginScreen`、`Lobby` 或 `Board`。

- **`Lobby.vue`**
  - **用途**: 大廳介面。
  - **職責**: 顯示從 `lobbyStore` 取得的關卡列表，處理點擊事件。

- **`LoginScreen.vue`**
  - **用途**: 登入頁面。
  - **職責**: 顯示 Google 登入按鈕，處理 OAuth 回調。

- **`Board.vue`**
  - **用途**: 遊戲對局介面。
  - **職責**: 顯示牌桌、手牌、分數，提供操作按鈕 (Hit/Stand/Exit)。
