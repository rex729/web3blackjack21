
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
    }),

    getters: {
        balance: () => {
            const authStore = useAuthStore();
            return authStore.user?.balance ?? 0;
        }
    },

    actions: {
        disconnectSocket() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        },

        initializeSocket() {
            // 確保每次初始化都是乾淨的新連線 (避免切換帳號時殘留舊 Socket)
            this.disconnectSocket();

            // 重置本地狀態，避免顯示上一次的殘留畫面
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;
            this.status = 'idle';
            this.currentBet = 0;

            const authStore = useAuthStore();
            const token = authStore.token;

            // 傳送 Token 進行驗證
            // 不指定 URL，自動連線到當前 Host (透過 Ingress / Nginx Proxy 轉發)
            this.socket = io({
                auth: { token },
                forceNew: true // 強制建立新連線，避免 Socket.io 復用舊的連線實例導致 Token 未更新
            });

            this.socket.on('connect', () => {
                this.message = 'Connected to server.';
            });

            this.socket.on('disconnect', () => {
                this.message = 'Disconnected. Trying to reconnect...';
            });

            this.socket.on('gameState', (state: any) => {
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
                        this.playerScore = state.playerScore;
                        this.dealerScore = state.dealerScore;
                    }, 600);
                } else if (hasNewCards) {
                    // [加牌] 維持原有的動畫延遲邏輯
                    // 階段一：動畫進行到約 3/4 時 (600ms)，更新點數
                    setTimeout(() => {
                        this.playerScore = state.playerScore;
                        this.dealerScore = state.dealerScore;
                    }, 600);

                    // 階段二：動畫完全結束後 (1000ms)，更新輸贏狀態與訊息
                    setTimeout(() => {
                        this.status = state.status;
                        this.message = state.message;
                    }, 1000);
                } else {
                    // [其他] (例如重置、Stand 後的狀態更新)，直接同步無需延遲
                    this.playerScore = state.playerScore;
                    this.dealerScore = state.dealerScore;
                    this.status = state.status;
                    this.message = state.message;
                }
            });

            this.socket.on('balanceUpdate', (data: { balance: number }) => {
                const authStore = useAuthStore();
                if (authStore.user) {
                    // 餘額更新配合輸贏狀態的顯示時機 (1000ms)
                    setTimeout(() => {
                        authStore.user!.balance = data.balance;
                    }, 1000);
                }
            });

            this.socket.on('error', (data: { message: string }) => {
                this.message = `Error: ${data.message}`;
            });
        },

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

        placeBet(amount: number) {
            this.currentBet = amount;
            this.status = 'betting'; // 本地樂觀更新，Server 會確認最終狀態
        },

        hit() {
            if (this.status !== 'playing' || !this.socket) return;
            this.socket.emit('hit');
        },

        stand() {
            const authStore = useAuthStore();
            if (!authStore.user || !this.socket) return;
            // Server 自動從 Token 判斷 UserId
            this.socket.emit('stand');
        },

        resetGame() {
            if (this.socket) {
                this.socket.emit('reset');
            }
        }
    }
});
