import { defineStore } from 'pinia';

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
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    return shuffle(deck);
};

const shuffle = (deck: Card[]) => {
    return deck.sort(() => Math.random() - 0.5);
};

export const calculateScore = (hand: Card[]) => {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
        if (card.hidden) return;
        if (card.value === 'A') {
            aces += 1;
            score += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    });

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
        balance: 1000,
        currentBet: 0,
        message: '',
    }),

    actions: {
        async startGame() {
            if (this.currentBet === 0 || this.currentBet > this.balance) return;

            this.status = 'playing';
            this.balance -= this.currentBet;
            this.message = 'Dealing...';

            this.deck = createDeck();
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;

            const p1 = this.deck.pop()!;
            const d1 = this.deck.pop()!;
            const p2 = this.deck.pop()!;
            const d2 = { ...this.deck.pop()!, hidden: true };

            // Sequential push with delays for animation and score update
            this.playerHand.push(p1);
            await new Promise(r => setTimeout(r, 600));
            this.playerScore = calculateScore(this.playerHand);

            this.dealerHand.push(d1);
            await new Promise(r => setTimeout(r, 600));
            this.dealerScore = calculateScore(this.dealerHand);

            this.playerHand.push(p2);
            await new Promise(r => setTimeout(r, 600));
            this.playerScore = calculateScore(this.playerHand);

            this.dealerHand.push(d2);
            await new Promise(r => setTimeout(r, 600));

            this.message = 'Hit or Stand?';

            if (this.playerScore === 21) {
                this.stand();
            }
        },

        placeBet(amount: number) {
            this.currentBet = amount;
        },

        async hit() {
            if (this.status !== 'playing') return;

            const newCard = this.deck.pop()!;
            this.playerHand.push(newCard);

            // Wait for dealing animation
            await new Promise(r => setTimeout(r, 600));

            this.playerScore = calculateScore(this.playerHand);

            if (this.playerScore > 21) {
                this.status = 'lost';
                this.message = 'Bust!';
            }
        },

        async stand() {
            this.status = 'dealerTurn';
            this.message = "Dealer's turn...";

            // Reveal Hole Card
            this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));
            await new Promise(r => setTimeout(r, 600));
            this.dealerScore = calculateScore(this.dealerHand);

            // Dealer AI
            while (this.dealerScore < 17) {
                const newCard = this.deck.pop()!;
                this.dealerHand.push(newCard);
                await new Promise(r => setTimeout(r, 800));
                this.dealerScore = calculateScore(this.dealerHand);
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

            // Blackjack special payout
            if (this.playerHand.length === 2 && finalPlayerScore === 21 && finalDealerScore !== 21) {
                this.status = 'blackjack';
                payout = this.currentBet * 2.5;
                this.message = 'BLACKJACK!';
            }

            this.balance += payout;
        },

        resetGame() {
            this.status = 'betting';
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;
            this.message = 'Place your bet.';
        }
    }
});
