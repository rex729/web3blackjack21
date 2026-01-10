import { create } from 'zustand';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    value: CardValue;
    hidden?: boolean;
}

export type GameStatus = 'idle' | 'betting' | 'playing' | 'dealerTurn' | 'won' | 'lost' | 'push' | 'blackjack';

interface GameState {
    deck: Card[];
    playerHand: Card[];
    dealerHand: Card[];
    status: GameStatus;
    balance: number;
    currentBet: number;
    message: string;

    // Actions
    startGame: () => void;
    placeBet: (amount: number) => void;
    hit: () => void;
    stand: () => void;
    resetGame: () => void;
}

// Helpers
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

const calculateScore = (hand: Card[]) => {
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

export const useGameStore = create<GameState>((set, get) => ({
    deck: [],
    playerHand: [],
    dealerHand: [],
    status: 'idle',
    balance: 1000,
    currentBet: 0,
    message: '',

    startGame: () => {
        const { currentBet, balance } = get();
        if (currentBet === 0) return; // Must bet first
        if (currentBet > balance) return;

        const deck = createDeck();
        const playerHand = [deck.pop()!, deck.pop()!];
        const dealerHand = [deck.pop()!, { ...deck.pop()!, hidden: true }];

        // Check Player Blackjack (Simplified)
        const playerScore = calculateScore(playerHand);

        set({
            deck,
            playerHand,
            dealerHand,
            status: 'playing',
            balance: balance - currentBet, // Deduct bet immediately
            message: 'Hit or Stand?'
        });

        // Instant Blackjack Check
        if (playerScore === 21) {
            get().stand();
        }
    },

    placeBet: (amount) => set((state) => ({ currentBet: amount })),

    hit: () => {
        const { deck, playerHand, status } = get();
        if (status !== 'playing') return;

        const newCard = deck.pop()!;
        const newHand = [...playerHand, newCard];
        set({ deck, playerHand: newHand });

        const score = calculateScore(newHand);
        if (score > 21) {
            set({ status: 'lost', message: 'Bust!' });
        }
    },

    stand: () => {
        set({ status: 'dealerTurn' });

        // Reveal Hole Card
        const { dealerHand, deck } = get(); // Refresh state
        const revealedHand: Card[] = dealerHand.map(c => ({ ...c, hidden: false }));
        set({ dealerHand: revealedHand });

        // Dealer AI Loop
        let currentDealerHand = revealedHand;
        let dealerScore = calculateScore(currentDealerHand);
        let currentDeck = deck;

        // Soft 17 Rule: Dealer hits until >= 17.
        while (dealerScore < 17) {
            const newCard = currentDeck.pop()!;
            currentDealerHand = [...currentDealerHand, newCard];
            dealerScore = calculateScore(currentDealerHand);
        }

        set({ dealerHand: currentDealerHand, deck: currentDeck });

        // Final Evaluation
        const playerScore = calculateScore(get().playerHand);
        const finalDealerScore = calculateScore(currentDealerHand); // Recalculate to be sure

        let finalStatus: GameStatus = 'push';
        let payout = 0;
        const { currentBet, balance } = get();

        if (finalDealerScore > 21) {
            finalStatus = 'won';
            payout = currentBet * 2;
            set({ message: 'Dealer Bust! You Win!' });
        } else if (playerScore > finalDealerScore) {
            finalStatus = 'won';
            payout = currentBet * 2;
            set({ message: 'You Win!' });
        } else if (playerScore < finalDealerScore) {
            finalStatus = 'lost';
            payout = 0;
            set({ message: 'Dealer Wins.' });
        } else {
            finalStatus = 'push';
            payout = currentBet; // Return bet
            set({ message: 'Push.' });
        }

        // Check Blackjack special payout (3:2) if player had 21 and 2 cards?
        if (get().playerHand.length === 2 && playerScore === 21) {
            if (finalDealerScore !== 21) {
                finalStatus = 'blackjack';
                payout = currentBet * 2.5; // Return bet + 1.5x bet
                set({ message: 'BLACKJACK!' });
            }
        }

        set({ status: finalStatus, balance: balance + payout });
    },

    resetGame: () => {
        set({ status: 'betting', playerHand: [], dealerHand: [], message: 'Place your bet.' });
    }
}));
