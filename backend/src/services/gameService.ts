
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

export class GameService {
    deck: Card[] = [];
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    status: GameStatus = 'idle';
    currentBet: number = 0;
    message: string = 'Place your bet.';

    constructor() {
        this.resetGame();
    }

    private createDeck(): Card[] {
        const deck: Card[] = [];
        SUITS.forEach(suit => {
            VALUES.forEach(value => {
                deck.push({ suit, value });
            });
        });
        return this.shuffle(deck);
    }

    private shuffle(deck: Card[]): Card[] {
        return [...deck].sort(() => Math.random() - 0.5);
    }

    calculateScore(hand: Card[]): number {
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
    }

    resetGame() {
        this.status = 'betting';
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.message = 'Place your bet.';
    }

    startGame(betAmount: number): void {
        this.currentBet = betAmount;
        this.status = 'playing';
        this.message = 'Dealt cards.';

        this.deck = this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];

        // 發牌
        this.playerHand.push(this.deck.pop()!);
        this.dealerHand.push(this.deck.pop()!);
        this.playerHand.push(this.deck.pop()!);
        this.dealerHand.push({ ...this.deck.pop()!, hidden: true } as Card);

        // 檢查是否有 Blackjack
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            // 目前簡單處理：如果玩家拿到 21 點，就直接等同這裡不做動作，
            // 讓前端或玩家呼叫 stand，或者自動觸發。
            // 為求簡單，我們維持現狀，讓前端處理後續。
        }
    }

    hit(): void {
        if (this.status !== 'playing') return;

        const newCard = this.deck.pop()!;
        this.playerHand.push(newCard);

        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.status = 'lost';
            this.message = 'Bust!';
        }
    }

    dealerTurn(): { payout: number } {
        this.status = 'dealerTurn';
        this.message = "Dealer's turn...";

        // 掀開暗牌
        this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));

        let dealerScore = this.calculateScore(this.dealerHand);

        while (dealerScore < 17) {
            const newCard = this.deck.pop()!;
            this.dealerHand.push(newCard);
            dealerScore = this.calculateScore(this.dealerHand);
        }

        const playerScore = this.calculateScore(this.playerHand);
        const finalDealerScore = dealerScore;
        let payout = 0;

        if (finalDealerScore > 21) {
            this.status = 'won';
            payout = this.currentBet * 2;
            this.message = 'Dealer Bust! You Win!';
        } else if (playerScore > finalDealerScore) {
            this.status = 'won';
            payout = this.currentBet * 2;
            this.message = 'You Win!';
        } else if (playerScore < finalDealerScore) {
            this.status = 'lost';
            payout = 0;
            this.message = 'Dealer Wins.';
        } else {
            this.status = 'push';
            payout = this.currentBet;
            this.message = 'Push.';
        }

        // 檢查 Blackjack (首兩張牌合計 21 點)
        if (this.playerHand.length === 2 && playerScore === 21 && finalDealerScore !== 21) {
            this.status = 'blackjack';
            payout = this.currentBet * 2.5;
            this.message = 'BLACKJACK!';
        }

        return { payout };
    }

    getState() {
        return {
            playerHand: this.playerHand,
            dealerHand: this.dealerHand,
            playerScore: this.calculateScore(this.playerHand),
            dealerScore: this.calculateScore(this.dealerHand),
            status: this.status,
            message: this.message,
            currentBet: this.currentBet
        };
    }
}
