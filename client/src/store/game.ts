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
        status: 'idle' as GameStatus,
        balance: 1000,
        currentBet: 0,
        message: '',
    }),

    actions: {
        startGame() {
            if (this.currentBet === 0 || this.currentBet > this.balance) return;

            this.deck = createDeck();
            this.playerHand = [this.deck.pop()!, this.deck.pop()!];
            this.dealerHand = [this.deck.pop()!, { ...this.deck.pop()!, hidden: true }];

            this.status = 'playing';
            this.balance -= this.currentBet;
            this.message = 'Hit or Stand?';

            if (calculateScore(this.playerHand) === 21) {
                this.stand();
            }
        },

        placeBet(amount: number) {
            this.currentBet = amount;
        },

        hit() {
            if (this.status !== 'playing') return;

            const newCard = this.deck.pop()!;
            this.playerHand.push(newCard);

            if (calculateScore(this.playerHand) > 21) {
                this.status = 'lost';
                this.message = 'Bust!';
            }
        },

        stand() {
            this.status = 'dealerTurn';

            // Reveal Hole Card
            this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));

            // Dealer AI
            while (calculateScore(this.dealerHand) < 17) {
                this.dealerHand.push(this.deck.pop()!);
            }

            const playerScore = calculateScore(this.playerHand);
            const dealerScore = calculateScore(this.dealerHand);

            let payout = 0;

            if (dealerScore > 21) {
                this.status = 'won';
                payout = this.currentBet * 2;
                this.message = 'Dealer Bust! You Win!';
            } else if (playerScore > dealerScore) {
                this.status = 'won';
                payout = this.currentBet * 2;
                this.message = 'You Win!';
            } else if (playerScore < dealerScore) {
                this.status = 'lost';
                this.message = 'Dealer Wins.';
            } else {
                this.status = 'push';
                payout = this.currentBet;
                this.message = 'Push.';
            }

            // Blackjack special payout
            if (this.playerHand.length === 2 && playerScore === 21 && dealerScore !== 21) {
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
            this.message = 'Place your bet.';
        }
    }
});
