
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
        initializeSocket() {
            if (this.socket) return;

            this.socket = io('http://localhost:4000'); // 確保這裡與後端連接埠匹配

            this.socket.on('connect', () => {
                this.message = 'Connected to server.';
            });

            this.socket.on('gameState', (state: any) => {
                // 1. 總是先更新手牌，讓動畫可以先跑
                const oldPlayerHandCount = this.playerHand.length;
                const oldDealerHandCount = this.dealerHand.length;

                this.playerHand = state.playerHand;
                this.dealerHand = state.dealerHand;
                this.currentBet = state.currentBet;

                // 2. 判斷是否為「新局開始」(從 Betting/Idle -> Playing)
                // 這種情況需要立即切換 UI (隱藏下注區)，不需要等待動畫結束
                const isGameStart = (this.status === 'betting' || this.status === 'idle') && state.status === 'playing';

                // 3. 判斷是否有新牌加入
                const hasNewCards = (this.playerHand.length > oldPlayerHandCount) ||
                    (this.dealerHand.length > oldDealerHandCount);

                if (isGameStart) {
                    // 遊戲剛開始：立即更新狀態以隱藏下注 UI，但點數可以稍後顯示
                    this.status = state.status;
                    this.message = state.message;

                    // 點數還是稍微延遲一下，配合發牌動畫
                    setTimeout(() => {
                        this.playerScore = state.playerScore;
                        this.dealerScore = state.dealerScore;
                    }, 600);
                } else if (hasNewCards) {
                    // 遊戲中途加牌：維持原有的延遲邏輯
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
                    // 其他情況 (例如重置或純訊息更新)，立即同步
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

            this.socket.emit('startGame', {
                bet: this.currentBet,
                userId: authStore.user.id
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
            this.socket.emit('stand', { userId: authStore.user.id });
        },

        resetGame() {
            if (this.socket) {
                this.socket.emit('reset');
            }
        }
    }
});
