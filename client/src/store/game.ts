
import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { io, Socket } from 'socket.io-client';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    value: CardValue;
    hidden?: boolean;
}

export type GameStatus = 'idle' | 'betting' | 'playing' | 'dealerTurn' | 'won' | 'lost' | 'push' | 'blackjack';

/** 遊戲狀態資料介面 (Server 回傳) */
interface GameStatePayload {
    playerHand: Card[];
    dealerHand: Card[];
    playerScore: number;
    dealerScore: number;
    status: GameStatus;
    currentBet: number;
    message: string;
}

export const useGameStore = defineStore('game', {
    state: () => ({
        playerHand: [] as Card[],
        dealerHand: [] as Card[],
        playerScore: 0,
        dealerScore: 0,
        status: 'idle' as GameStatus,
        currentBet: 0,
        message: 'Connecting...',
        socket: null as Socket | null,

        /** 目前選擇的桌子 ID，若為 null 代表在大廳 */
        currentTableId: null as string | null,
    }),

    getters: {
        /** 取得目前使用者餘額 */
        balance: () => {
            const authStore = useAuthStore();
            return authStore.user?.balance ?? 0;
        }
    },

    actions: {
        /**
         * 選擇並進入桌子 (目前僅更新前端狀態，未來可通知後端)
         * @param tableId 桌子 ID (例如 'level-1', 'level-2')
         */
        joinTable(tableId: string) {
            this.currentTableId = tableId;
            // 重置遊戲狀態
            this.resetLocalState();
            // 初始化並連線 Socket
            this.initializeSocket();
        },

        /**
         * 離開桌子回到大廳
         */
        leaveTable() {
            this.currentTableId = null;
            this.resetLocalState();
            // 離開桌子時斷線
            this.disconnectSocket();
        },

        /**
         * 斷開 Socket 連線
         */
        /**
         * 斷開 Socket 連線
         */
        disconnectSocket() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        },

        /**
         * 登出清理 (斷線並重置桌子狀態)
         */
        fullLogout() {
            this.disconnectSocket();
            this.currentTableId = null;
            this.resetLocalState();
        },

        /**
         * 初始化 Socket 連線並設定事件監聽
         */
        initializeSocket() {
            // 確保每次初始化都是乾淨的新連線 (避免切換帳號時殘留舊 Socket)
            this.disconnectSocket();

            // 重置本地狀態，避免顯示上一次的殘留畫面
            this.resetLocalState();

            const authStore = useAuthStore();
            const token = authStore.token;

            // 傳送 Token 進行驗證
            // 不指定 URL，自動連線到當前 Host (透過 Ingress / Nginx Proxy 轉發)
            this.socket = io({
                auth: { token },
                forceNew: true // 強制建立新連線，避免 Socket.io 復用舊的連線實例導致 Token 未更新
            });

            this.setupSocketListeners();
        },

        /**
         * 重置本地遊戲狀態
         */
        resetLocalState() {
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;
            this.status = 'idle';
            this.currentBet = 0;
        },

        /**
         * 設定 Socket 事件監聽器
         */
        setupSocketListeners() {
            if (!this.socket) return;

            this.socket.on('connect', () => {
                this.message = 'Connected to server.';
            });

            this.socket.on('disconnect', () => {
                this.message = 'Disconnected. Trying to reconnect...';
            });

            // 處理遊戲狀態更新
            this.socket.on('gameState', (state: GameStatePayload) => {
                this.handleGameStateUpdate(state);
            });

            // 處理餘額更新
            this.socket.on('balanceUpdate', (data: { balance: number }) => {
                this.handleBalanceUpdate(data.balance);
            });

            this.socket.on('error', (data: { message: string }) => {
                this.message = `Error: ${data.message}`;
            });
        },

        /**
         * 處理伺服器回傳的遊戲狀態
         * @param state 新的遊戲狀態
         */
        handleGameStateUpdate(state: GameStatePayload) {
            // 1. 總是先更新手牌資料，讓前端元件 (Vue) 可以先渲染出牌
            const oldPlayerHandCount = this.playerHand.length;
            const oldDealerHandCount = this.dealerHand.length;

            this.playerHand = state.playerHand;
            this.dealerHand = state.dealerHand;
            this.currentBet = state.currentBet;

            // 2. 判斷情境：
            // Case A: 新局開始 (從 Betting/Idle -> Playing) -> 需立即切換 UI 顯示 Board
            // Case B: 斷線重連 (因為 initializeSocket 會先重置為 Idle，所以這裡也會判定為 True) -> 需立即恢復 Board
            const isGameStart = (this.status === 'betting' || this.status === 'idle') && state.status === 'playing';

            // Case C: 遊戲中途加牌 -> 需播放發牌動畫 (延遲顯示分數)
            const hasNewCards = (this.playerHand.length > oldPlayerHandCount) ||
                (this.dealerHand.length > oldDealerHandCount);

            if (isGameStart) {
                // [新局/重連] 立即更新狀態以顯示遊戲面板
                this.status = state.status;
                this.message = state.message;

                // 稍微延遲顯示分數，讓畫面有一點「載入/發牌」的節奏感
                setTimeout(() => {
                    this.updateScores(state.playerScore, state.dealerScore);
                }, 600);
            } else if (hasNewCards) {
                // [加牌] 維持原有的動畫延遲邏輯
                // 階段一：動畫進行到約 3/4 時 (600ms)，更新點數
                setTimeout(() => {
                    this.updateScores(state.playerScore, state.dealerScore);
                }, 600);

                // 階段二：動畫完全結束後 (1000ms)，更新輸贏狀態與訊息
                setTimeout(() => {
                    this.status = state.status;
                    this.message = state.message;
                }, 1000);
            } else {
                // [其他] (例如重置、Stand 後的狀態更新)，直接同步無需延遲
                this.updateScores(state.playerScore, state.dealerScore);
                this.status = state.status;
                this.message = state.message;
            }
        },

        /**
         * 更新分數顯示
         */
        updateScores(playerScore: number, dealerScore: number) {
            this.playerScore = playerScore;
            this.dealerScore = dealerScore;
        },

        /**
         * 處理餘額更新事件
         */
        handleBalanceUpdate(newBalance: number) {
            const authStore = useAuthStore();
            if (authStore.user) {
                // 餘額更新配合輸贏狀態的顯示時機 (1000ms)
                setTimeout(() => {
                    authStore.user!.balance = newBalance;
                }, 1000);
            }
        },

        /** 開始新局 (下注) */
        startGame() {
            const authStore = useAuthStore();
            if (!authStore.user || !this.socket) return;

            if (this.currentBet === 0 || this.currentBet > authStore.user.balance) {
                this.message = 'Insufficient balance or no bet!';
                return;
            }

            // Server 自動從 Token 判斷 UserId，無需前端傳送
            this.socket.emit('startGame', {
                bet: this.currentBet
            });
        },

        /** 設定下注金額 (本地) */
        placeBet(amount: number) {
            this.currentBet = amount;
            this.status = 'betting'; // 本地樂觀更新，Server 會確認最終狀態
        },

        /** 要牌 (Hit) */
        hit() {
            if (this.status !== 'playing' || !this.socket) return;
            this.socket.emit('hit');
        },

        /** 停牌 (Stand) */
        stand() {
            const authStore = useAuthStore();
            if (!authStore.user || !this.socket) return;
            // Server 自動從 Token 判斷 UserId
            this.socket.emit('stand');
        },

        /** 重置遊戲 (回到下注畫面) */
        resetGame() {
            if (this.socket) {
                this.socket.emit('reset');
            }
        }
    }
});
