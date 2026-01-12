
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
    // -------------------------------------------------------------------------
    // 狀態屬性 (Server-Authoritative)
    // -------------------------------------------------------------------------

    /** 遊戲牌組 (Deck)，由伺服器端安全管理，不直接暴露給 Client 端 */
    deck: Card[] = [];

    /** 玩家目前的手牌 */
    playerHand: Card[] = [];

    /** 莊家目前的手牌 (包含一張暗牌) */
    dealerHand: Card[] = [];

    /** 目前的遊戲回合狀態 */
    status: GameStatus = 'idle';

    /** 本回合的下注金額 */
    currentBet: number = 0;

    /** 顯示給使用者的遊戲狀態訊息 */
    message: string = 'Place your bet.';

    constructor() {
        this.resetGame();
    }

    // -------------------------------------------------------------------------
    // 核心遊戲邏輯 (Core Game Logic)
    // -------------------------------------------------------------------------

    /**
     * 初始化新回合：洗牌並發初始手牌。
     * @param betAmount 玩家下注金額
     */
    startGame(betAmount: number): void {
        this.currentBet = betAmount;
        this.status = 'playing';
        this.message = 'Dealt cards.';

        // 建立一副新牌並進行洗牌 (Shuffle)
        this.deck = this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];

        // 發初始手牌順序：玩家 -> 莊家 -> 玩家 -> 莊家(暗牌)
        this.playerHand.push(this.deck.pop()!);
        this.dealerHand.push(this.deck.pop()!);
        this.playerHand.push(this.deck.pop()!);
        this.dealerHand.push({ ...this.deck.pop()!, hidden: true } as Card);

        // 檢查玩家是否起手拿到 Blackjack (首兩張 21 點)
        // 註：目前維持 'playing' 狀態，讓前端處理視覺上的 Stand 或自動檢查
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            // 未來優化：可以在此處自動結算 Blackjack
        }
    }

    /**
     * 玩家選擇 "Hit" (加牌)。
     */
    hit(): void {
        if (this.status !== 'playing') return;

        // 從 Server 端管理的牌組中抽一張牌
        const newCard = this.deck.pop()!;
        this.playerHand.push(newCard);

        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.status = 'lost';
            this.message = 'Bust!';
        }
    }

    /**
     * 玩家選擇 "Stand" (停牌)。莊家掀開暗牌並補牌直到點數 >= 17。
     * @returns 包含結算金額 (payout) 的物件。
     */
    dealerTurn(): { payout: number } {
        this.status = 'dealerTurn';
        this.message = "Dealer's turn...";

        // 1. 掀開莊家的暗牌
        this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));

        // 2. 莊家補牌規則：必須補到 17 點或以上
        let dealerScore = this.calculateScore(this.dealerHand);
        while (dealerScore < 17) {
            const newCard = this.deck.pop()!;
            this.dealerHand.push(newCard);
            dealerScore = this.calculateScore(this.dealerHand);
        }

        // 3. 判斷勝負 (Determine Winner)
        const playerScore = this.calculateScore(this.playerHand);
        const finalDealerScore = dealerScore;
        let payout = 0;

        if (finalDealerScore > 21) {
            // 莊家爆牌 (Bust)
            this.status = 'won';
            payout = this.currentBet * 2;
            this.message = 'Dealer Bust! You Win!';
        } else if (playerScore > finalDealerScore) {
            // 玩家點數較大
            this.status = 'won';
            payout = this.currentBet * 2;
            this.message = 'You Win!';
        } else if (playerScore < finalDealerScore) {
            // 莊家點數較大
            this.status = 'lost';
            payout = 0;
            this.message = 'Dealer Wins.';
        } else {
            // 平手 (Push)
            this.status = 'push';
            payout = this.currentBet;
            this.message = 'Push.';
        }

        // 4. 特殊規則：檢查 Blackjack (雖然這裡簡單用點數勝負，但通常 Blackjack 賠率較高)
        if (this.playerHand.length === 2 && playerScore === 21 && finalDealerScore !== 21) {
            this.status = 'blackjack';
            payout = this.currentBet * 2.5; // 3:2 賠率 (本金 1 + 獲利 1.5 = 回收 2.5)
            this.message = 'BLACKJACK!';
        }

        return { payout };
    }

    /**
     * 重置遊戲狀態，準備下一局。
     */
    resetGame() {
        this.status = 'betting';
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.message = 'Place your bet.';
    }

    // -------------------------------------------------------------------------
    // 輔助方法 (Helper Methods - Private)
    // -------------------------------------------------------------------------

    /**
     * 建立一副標準 52 張撲克牌。
     */
    private createDeck(): Card[] {
        const deck: Card[] = [];
        SUITS.forEach(suit => {
            VALUES.forEach(value => {
                deck.push({ suit, value });
            });
        });
        return this.shuffle(deck);
    }

    /**
     * 洗牌 (Shuffle)，使用隨機排序。
     * @param deck 要洗的牌組
     */
    private shuffle(deck: Card[]): Card[] {
        return [...deck].sort(() => Math.random() - 0.5);
    }

    /**
     * 計算手牌點數 (Blackjack 規則)。
     * A 可以當作 11 或 1，J/Q/K 算作 10。
     */
    calculateScore(hand: Card[]): number {
        let score = 0;
        let aces = 0;

        hand.forEach(card => {
            if (card.hidden) return; // 不計算暗牌點數

            if (card.value === 'A') {
                aces += 1;
                score += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        });

        // 若爆牌 (Bust) 則將 A 視為 1 點
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }

        return score;
    }

    /**
     * 回傳公開的遊戲狀態 (Public State)，供前端顯示使用。
     */
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
