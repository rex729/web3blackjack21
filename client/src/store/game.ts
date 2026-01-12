import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    value: CardValue;
    hidden?: boolean;
}

export type GameStatus = 'idle' | 'betting' | 'playing' | 'dealerTurn' | 'won' | 'lost' | 'push' | 'blackjack';

const VALUES: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

const createDeck = (): Card[] => {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
        VALUES.forEach(value => {
            deck.push({ suit, value });
        });
    });
    // 洗牌後回傳
    return shuffle(deck);
};

const shuffle = (deck: Card[]) => {
    return [...deck].sort(() => Math.random() - 0.5);
};

export const calculateScore = (hand: Card[]) => {
    let score = 0;
    let aces = 0;

    // 計算基礎分數
    hand.forEach(card => {
        if (card.hidden) return; // 隱藏牌不算分
        if (card.value === 'A') {
            aces += 1;
            score += 11; // Ace 預設算 11
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    });

    // 如果爆牌 (超過 21) 且有 Ace，將 Ace 視為 1 分
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }

    return score;
};

export const useGameStore = defineStore('game', {
    state: () => ({
        deck: [] as Card[],
        playerHand: [] as Card[],
        dealerHand: [] as Card[],
        playerScore: 0,
        dealerScore: 0,
        status: 'idle' as GameStatus,
        currentBet: 0,
        message: 'Place your bet.',
    }),

    getters: {
        balance: () => {
            const authStore = useAuthStore();
            return authStore.user?.balance ?? 0;
        }
    },

    actions: {
        async startGame() {
            const authStore = useAuthStore();
            if (!authStore.user) return;

            if (this.currentBet === 0 || this.currentBet > authStore.user.balance) {
                this.message = 'Insufficient balance or no bet!';
                return;
            }

            this.status = 'playing';

            // 先從後端扣除下注金額
            await authStore.updateRemoteBalance(-this.currentBet);

            this.message = 'Dealing...';

            this.deck = createDeck();
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;

            // 發牌順序：閒家 -> 莊家 -> 閒家 -> 莊家(暗牌)
            const p1 = this.deck.pop()!;
            const d1 = this.deck.pop()!;
            const p2 = this.deck.pop()!;
            const d2 = { ...this.deck.pop()!, hidden: true } as Card; // 莊家第二張牌是暗牌

            // 模擬發牌動畫延遲
            this.playerHand.push(p1);
            await new Promise(r => setTimeout(r, 450));
            this.playerScore = calculateScore(this.playerHand);
            await new Promise(r => setTimeout(r, 150));

            this.dealerHand.push(d1);
            await new Promise(r => setTimeout(r, 450));
            this.dealerScore = calculateScore(this.dealerHand);
            await new Promise(r => setTimeout(r, 150));

            this.playerHand.push(p2);
            await new Promise(r => setTimeout(r, 450));
            this.playerScore = calculateScore(this.playerHand);
            await new Promise(r => setTimeout(r, 150));

            this.dealerHand.push(d2);
            await new Promise(r => setTimeout(r, 600));

            this.message = 'Hit or Stand?';

            if (this.playerScore === 21) {
                this.stand();
            }
        },

        placeBet(amount: number) {
            this.currentBet = amount;
            this.status = 'betting';
        },

        async hit() {
            if (this.status !== 'playing') return;

            const newCard = this.deck.pop()!;
            this.playerHand.push(newCard);

            await new Promise(r => setTimeout(r, 450));
            this.playerScore = calculateScore(this.playerHand);
            await new Promise(r => setTimeout(r, 150));

            if (this.playerScore > 21) {
                this.status = 'lost';
                this.message = 'Bust!';
            }
        },

        async stand() {
            const authStore = useAuthStore();
            if (!authStore.user) return;

            this.status = 'dealerTurn';
            this.message = "Dealer's turn...";

            // 莊家掀牌
            this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));
            await new Promise(r => setTimeout(r, 600));
            this.dealerScore = calculateScore(this.dealerHand);

            // 莊家必須補牌直到 17 點
            while (this.dealerScore < 17) {
                const newCard = this.deck.pop()!;
                this.dealerHand.push(newCard);
                await new Promise(r => setTimeout(r, 600));
                this.dealerScore = calculateScore(this.dealerHand);
                await new Promise(r => setTimeout(r, 200));
            }

            const finalPlayerScore = this.playerScore;
            const finalDealerScore = this.dealerScore;

            let payout = 0;

            if (finalDealerScore > 21) {
                this.status = 'won';
                payout = this.currentBet * 2;
                this.message = 'Dealer Bust! You Win!';
            } else if (finalPlayerScore > finalDealerScore) {
                this.status = 'won';
                payout = this.currentBet * 2;
                this.message = 'You Win!';
            } else if (finalPlayerScore < finalDealerScore) {
                this.status = 'lost';
                payout = 0;
                this.message = 'Dealer Wins.';
            } else {
                this.status = 'push';
                payout = this.currentBet;
                this.message = 'Push.';
            }

            if (this.playerHand.length === 2 && finalPlayerScore === 21 && finalDealerScore !== 21) {
                this.status = 'blackjack';
                payout = this.currentBet * 2.5; // Blackjack 賠率 3:2 (也就是拿回本金 + 1.5倍)
                this.message = 'BLACKJACK!';
            }

            // 遊戲結束，與後端同步獎金
            await authStore.updateRemoteBalance(payout);
        },

        resetGame() {
            this.status = 'betting';
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;
            this.currentBet = 0;
            this.message = 'Place your bet.';
        }
    }
});
