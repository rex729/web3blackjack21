
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
                this.playerHand = state.playerHand;
                this.dealerHand = state.dealerHand;
                this.playerScore = state.playerScore;
                this.dealerScore = state.dealerScore;
                this.status = state.status;
                this.message = state.message;
                this.currentBet = state.currentBet;
            });

            this.socket.on('balanceUpdate', (data: { balance: number }) => {
                const authStore = useAuthStore();
                if (authStore.user) {
                    authStore.user.balance = data.balance;
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
