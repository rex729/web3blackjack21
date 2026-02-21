
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    value: CardValue;
    hidden?: boolean;
}

export type GameStatus = 'idle' | 'betting' | 'playing' | 'dealerTurn' | 'won' | 'lost' | 'push' | 'blackjack' | 'surrender';

export interface GameConfig {
    // 邏輯規則
    hit17: boolean; // true: H17, false: S17
    payoutBlackjack: number;
    fiveCardCharlie: boolean;
    surrenderAllowed: boolean;
    sideBets: boolean;
    xpMultiplier: number;
    allowedChips: number[];
    doubleAllowed: boolean;
    decks: number;
    buyIn: number;
    prize: string;
    minLevel: number;

    // UI 顯示
    name: string;
    subtitle: string;
    color: string;
    image: string;
    features: string[];
    locked: boolean;
}

export interface SideBets {
    perfectPairs?: number;
    twentyOnePlusThree?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
    hit17: true,
    payoutBlackjack: 1.5,
    fiveCardCharlie: false,
    surrenderAllowed: false,
    sideBets: false,
    xpMultiplier: 1.0,
    doubleAllowed: true,
    decks: 1,
    allowedChips: [5, 25, 100, 500, 1000],
    buyIn: 0,
    prize: 'Variable',
    minLevel: 1,
    name: 'Downtown Basement',
    subtitle: '自家地下室',
    color: 'from-zinc-800 to-zinc-900',
    image: '🏙️',
    features: ['1v1', 'Free Chips'],
    locked: false
};

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

    /** 目前牌局所屬的關卡 ID */
    levelId: string = '';

    /** 遊戲規則配置 */
    config: GameConfig;

    /** 顯示給使用者的遊戲狀態訊息 */
    message: string = 'Place your bet.';

    /** 邊注資訊 */
    sideBets: SideBets = {};
    sideBetResult: { payout: number, message: string } = { payout: 0, message: '' };

    constructor(levelId: string = 'level-1', config?: GameConfig) {
        this.levelId = levelId;
        this.config = config || { ...DEFAULT_CONFIG };
        this.resetGame();
    }

    // -------------------------------------------------------------------------
    // 核心遊戲邏輯 (Core Game Logic)
    // -------------------------------------------------------------------------

    /**
     * 初始化新回合：洗牌並發初始手牌。
     * @param betAmount 玩家下注金額
     * @param sideBets 玩家邊注金額
     */
    startGame(betAmount: number, sideBets: SideBets = {}): { sideBetPayout: number } {
        this.currentBet = betAmount;
        this.sideBets = sideBets;
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

        // 結算邊注
        const sideBetResult = this.resolveSideBets();
        this.sideBetResult = sideBetResult;

        if (sideBetResult.payout > 0) {
            this.message += ` ${sideBetResult.message}`;
        }

        // 檢查玩家是否起手拿到 Blackjack (首兩張 21 點)
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            // 前端會檢查狀態
        }

        return { sideBetPayout: sideBetResult.payout };
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
        } else if (this.config.fiveCardCharlie && this.playerHand.length === 5) {
            // 5-Card Charlie Rule: 5 cards without busting = Win
            this.status = 'won';
            this.message = '5-Card Charlie! You Win!';
        }
    }

    /**
     * 玩家選擇 "Double" (加倍下注)。
     * 規則：
     * 1. 賭注翻倍
     * 2. 強制補發一張牌
     * 3. 立即換莊家行動 (Stand)
     * @returns 是否成功執行
     */
    doubleDown(): boolean {
        if (this.status !== 'playing') return false;

        // 檢查手牌數量，只能在首兩張牌時執行
        if (this.playerHand.length !== 2) {
            this.message = "Can only double on first two cards.";
            return false;
        }

        // 檢查規則是否允許 Double
        if (this.config.doubleAllowed === false) {
            this.message = "Double Down not allowed in this level.";
            return false;
        }

        // 禁止在已經是 21 點 (Blackjack) 的情況下加倍
        if (this.calculateScore(this.playerHand) === 21) {
            this.message = "Cannot Double Down on Blackjack.";
            return false;
        }

        // 注意：餘額檢查已在 Server 層完成，這裡只處理遊戲邏輯
        this.currentBet *= 2;
        this.message = "Double Down! Dealing last card...";

        // 強制發一張牌
        const newCard = this.deck.pop()!;
        this.playerHand.push(newCard);

        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.status = 'lost';
            this.message = 'Double Down Bust!';
            return true; // 動作成功，但結果輸了
        }

        return true; // 動作成功，需由外部呼叫 dealerTurn
    }

    /**
     * 玩家選擇 "Surrender" (投降)。
     * 規則：
     * 1. 僅能在首兩張牌時使用。
     * 2. 取回一半賭注。
     * 3. 遊戲直接結束 (Status -> surrender)。
     * @returns 退款金額 (若失敗則回傳 0)
     */
    surrender(): number {
        if (this.status !== 'playing') return 0;

        // 檢查手牌數量，只能在首兩張牌時執行
        if (this.playerHand.length !== 2) {
            this.message = "Can only surrender on first two cards.";
            return 0;
        }

        // 檢查規則是否允許 Surrender
        if (this.config.surrenderAllowed === false) {
            this.message = "Surrender not allowed in this level.";
            return 0;
        }

        // 執行投降
        this.status = 'surrender';
        this.message = "You Surrendered.";

        // 計算退款 (無條件捨去)
        const refund = Math.floor(this.currentBet / 2);
        return refund;
    }

    /**
     * 莊家回合 (同步執行)：掀開暗牌並補牌直到符合停牌規則。
     * @returns 包含結算金額 (payout) 的物件。
     */
    dealerTurn(): { payout: number } {
        this.status = 'dealerTurn';
        this.message = "Dealer's turn...";

        // 1. 掀開莊家的暗牌
        this.dealerHand = this.dealerHand.map(c => ({ ...c, hidden: false }));

        // 2. 莊家補牌規則 (Dealer Hit/Stand Rules)
        let { total: dealerScore, isSoft } = this.getFullScore(this.dealerHand);

        while (
            dealerScore < 17 ||
            (dealerScore === 17 && isSoft && this.config.hit17)
        ) {
            const newCard = this.deck.pop()!;
            this.dealerHand.push(newCard);
            const result = this.getFullScore(this.dealerHand);
            dealerScore = result.total;
            isSoft = result.isSoft;
        }

        const { total: finalDealerScore } = this.getFullScore(this.dealerHand);

        // 3. 判斷勝負 (Determine Winner)
        const playerScore = this.calculateScore(this.playerHand);
        let payout = 0;

        // 優先檢查 Blackjack 狀況
        const playerHasBlackjack = this.playerHand.length === 2 && playerScore === 21;
        const dealerHasBlackjack = this.dealerHand.length === 2 && finalDealerScore === 21;

        if (finalDealerScore > 21) {
            this.status = 'won';
            payout = this.currentBet * 2;
            this.message = 'Dealer Bust! You Win!';
        } else if (playerHasBlackjack) {
            if (dealerHasBlackjack) {
                this.status = 'push';
                payout = this.currentBet;
                this.message = 'Push (Both Blackjack).';
            } else {
                this.status = 'blackjack';
                payout = this.currentBet * (1 + this.config.payoutBlackjack);
                this.message = 'BLACKJACK!';
            }
        } else if (dealerHasBlackjack) {
            this.status = 'lost';
            payout = 0;
            this.message = 'Dealer has Blackjack.';
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

        const playerHandStr = this.playerHand.map(c => c.value).join(', ');
        const dealerHandStr = this.dealerHand.map(c => c.value).join(', ');
        const ruleStr = this.config.hit17 ? 'H17' : 'S17';

        console.log(`[Game][${this.levelId}] Settlement (${ruleStr}):`);
        console.log(`  - Player: [${playerHandStr}] (Score: ${playerScore})`);
        console.log(`  - Dealer: [${dealerHandStr}] (Score: ${finalDealerScore})`);
        console.log(`  - Result: ${this.message} | Payout: ${payout}`);

        return { payout };
    }

    /**
     * 結算邊注 (Perfect Pairs & 21+3)
     */
    private resolveSideBets(): { payout: number, message: string } {
        let totalPayout = 0;
        let messages: string[] = [];

        // 1. Perfect Pairs (僅看玩家前兩張牌)
        if (this.sideBets.perfectPairs && this.sideBets.perfectPairs > 0) {
            const c1 = this.playerHand[0];
            const c2 = this.playerHand[1];

            if (c1.value === c2.value) {
                if (c1.suit === c2.suit) {
                    // Perfect Pair (25:1)
                    const win = this.sideBets.perfectPairs * 25;
                    totalPayout += win;
                    messages.push(`Perfect Pair Win! +$${win}`);
                } else if (this.isSameColor(c1.suit, c2.suit)) {
                    // Colored Pair (12:1)
                    const win = this.sideBets.perfectPairs * 12;
                    totalPayout += win;
                    messages.push(`Colored Pair Win! +$${win}`);
                } else {
                    // Mixed Pair (5:1)
                    const win = this.sideBets.perfectPairs * 5;
                    totalPayout += win;
                    messages.push(`Mixed Pair Win! +$${win}`);
                }
            }
        }

        // 2. 21+3 (看玩家前兩張牌 + 莊家明牌)
        if (this.sideBets.twentyOnePlusThree && this.sideBets.twentyOnePlusThree > 0) {
            const cards = [this.playerHand[0], this.playerHand[1], this.dealerHand[0]];
            const result = this.check21PlusThree(cards);

            if (result.payoutMultiplier > 0) {
                const win = this.sideBets.twentyOnePlusThree * result.payoutMultiplier;
                totalPayout += win;
                messages.push(`21+3 ${result.name} Win! +$${win}`);
            }
        }

        return {
            payout: totalPayout,
            message: messages.join(' ')
        };
    }

    private isSameColor(s1: Suit, s2: Suit): boolean {
        const red = ['hearts', 'diamonds'];
        const black = ['spades', 'clubs'];
        return (red.includes(s1) && red.includes(s2)) || (black.includes(s1) && black.includes(s2));
    }

    private check21PlusThree(cards: Card[]): { name: string, payoutMultiplier: number } {
        const suits = cards.map(c => c.suit);
        const values = cards.map(c => VALUES.indexOf(c.value)).sort((a, b) => a - b);

        const isFlush = suits.every(s => s === suits[0]);

        // Straight 檢查 (包含 A-2-3 的特殊情況)
        let isStraight = false;
        if (values[2] - values[0] === 2 && values[1] - values[0] === 1) {
            isStraight = true;
        } else if (values[0] === 0 && values[1] === 1 && values[2] === 12) {
            // A, 2, 3 (indices: 12, 0, 1) -> sorted indices: 0, 1, 12
            isStraight = true;
        }

        const isThreeOfAKind = values[0] === values[1] && values[1] === values[2];
        const isStraightFlush = isStraight && isFlush;
        const isSuitedTrips = isThreeOfAKind && isFlush;

        if (isSuitedTrips) return { name: 'Suited Trips', payoutMultiplier: 100 };
        if (isStraightFlush) return { name: 'Straight Flush', payoutMultiplier: 40 };
        if (isThreeOfAKind) return { name: 'Three of a Kind', payoutMultiplier: 30 };
        if (isStraight) return { name: 'Straight', payoutMultiplier: 10 };
        if (isFlush) return { name: 'Flush', payoutMultiplier: 5 };

        return { name: '', payoutMultiplier: 0 };
    }

    /**
     * 重置遊戲狀態，準備下一局。
     */
    resetGame() {
        this.status = 'betting';
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.sideBets = {};
        this.sideBetResult = { payout: 0, message: '' };
        this.message = 'Place your bet.';
    }

    // -------------------------------------------------------------------------
    // 輔助方法 (Helper Methods - Private)
    // -------------------------------------------------------------------------

    /**
     * 建立一副或多副標準 52 張撲克牌。
     */
    private createDeck(): Card[] {
        const deck: Card[] = [];
        const numDecks = this.config.decks || 1;

        for (let i = 0; i < numDecks; i++) {
            SUITS.forEach(suit => {
                VALUES.forEach(value => {
                    deck.push({ suit, value });
                });
            });
        }
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
        return this.getFullScore(hand).total;
    }

    /**
     * 取得完整的分數資訊，包含總分以及是否為「軟牌 (Soft Hand)」。
     * 軟牌定義：手牌包含至少一個被當作 11 點計算的 A。
     */
    getFullScore(hand: Card[]): { total: number, isSoft: boolean } {
        let total = 0;
        let aces = 0;

        hand.forEach(card => {
            if (card.hidden) return; // 不計算暗牌點數

            if (card.value === 'A') {
                aces += 1;
                total += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                total += 10;
            } else {
                total += parseInt(card.value);
            }
        });

        // 若爆牌 (Bust) 則將 A 視為 1 點
        let isSoft = aces > 0;
        while (total > 21 && aces > 0) {
            total -= 10;
            aces -= 1;
            // 如果所有的 A 都被降為 1 點了，就不再是軟牌
            if (aces === 0) isSoft = false;
        }

        return { total, isSoft };
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
            currentBet: this.currentBet,
            levelId: this.levelId,
            sideBetResult: this.sideBetResult
        };
    }
}
