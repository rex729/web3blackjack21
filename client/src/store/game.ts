
import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { io, Socket } from 'socket.io-client';
import { useLobbyStore } from './lobby';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    value: CardValue;
    hidden?: boolean;
}

export type GameStatus = 'idle' | 'betting' | 'playing' | 'dealerTurn' | 'won' | 'lost' | 'push' | 'blackjack' | 'surrender';

/** 遊戲狀態資料介面 (Server 回傳) */
interface GameStatePayload {
    playerHand: Card[];
    dealerHand: Card[];
    playerScore: number;
    dealerScore: number;
    status: GameStatus;
    currentBet: number;
    message: string;
    levelId?: string;
    sideBetResult?: { payout: number, message: string };
}

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

        /** 目前選擇的桌子 ID，若為 null 代表在大廳 */
        currentTableId: null as string | null,

        /** 邊注金額 */
        sideBets: {
            perfectPairs: 0,
            twentyOnePlusThree: 0
        } as Record<string, number>,

        /** 邊注結果 */
        sideBetResult: null as { payout: number, message: string } | null,

        /** 正在執行的 setTimeout IDs，用於清除競態條件下的延遲任務 */
        _timeoutIds: [] as number[],

        /** 伺服器 Pod 名稱 (偵偵用) */
        serverPodName: null as string | null,

        /** 是否已收到伺服器初始狀態 */
        isInitialized: false,
    }),

    getters: {
        /** 取得目前使用者餘額 */
        balance: () => {
            const authStore = useAuthStore();
            return authStore.user?.balance ?? 0;
        },
        /** 取得目前關卡名稱 */
        currentLevelName: (state) => {
            const lobbyStore = useLobbyStore();
            const level = lobbyStore.levels.find(l => l.id === state.currentTableId);
            return level ? level.name : '';
        },
        /** 取得目前關卡允許的籌碼面額 */
        currentChips: (state) => {
            const lobbyStore = useLobbyStore();
            const level = lobbyStore.levels.find(l => l.id === state.currentTableId);
            return level?.allowedChips || [5, 25, 100, 500, 1000]; // 預設值
        },
        /** 是否可以加倍 (僅首兩張牌且餘額足夠且非 21 點，且非 Level 1) */
        canDouble: (state) => {
            const authStore = useAuthStore();
            const balance = authStore.user?.balance ?? 0;
            // 禁止在 Level 1 或 Blackjack (21點) 時加倍
            return state.currentTableId !== 'level-1' && state.playerHand.length === 2 && balance >= state.currentBet && state.playerScore !== 21;
        },
        /** 是否可以投降 (僅首兩張牌且 Level 規則允許) */
        canSurrender: (state) => {
            const lobbyStore = useLobbyStore();
            const level = lobbyStore.levels.find(l => l.id === state.currentTableId);
            return state.status === 'playing' && state.playerHand.length === 2 && !!level?.surrenderAllowed;
        },
        /** 是否啟用邊注 (Level 規則允許) */
        isSideBetsEnabled: (state) => {
            const lobbyStore = useLobbyStore();
            const level = lobbyStore.levels.find(l => l.id === state.currentTableId);
            return !!level?.sideBets;
        },
        /** 是否為 H17 規則 (莊家 17 點是否繼續要牌) */
        isHit17: (state) => {
            const lobbyStore = useLobbyStore();
            const level = lobbyStore.levels.find(l => l.id === state.currentTableId);
            return level ? level.hit17 : true;
        },
        /** 計算目前總下注額 (主注 + 邊注) */
        totalBet: (state) => {
            return state.currentBet + (state.sideBets.perfectPairs || 0) + (state.sideBets.twentyOnePlusThree || 0);
        }
    },

    actions: {
        /**
         * 選擇並進入桌子 (目前僅更新前端狀態，未來可通知後端)
         * @param tableId 桌子 ID (例如 'level-1', 'level-2')
         */
        joinTable(tableId: string) {
            this.currentTableId = tableId;
            // 重置遊戲狀態
            this.resetLocalState();
            // 初始化並連線 Socket
            this.initializeSocket();
        },

        /**
         * 離開桌子回到大廳
         */
        leaveTable() {
            // 通知後端移除遊戲實例，避免 10 秒內重連又被抓回牌局
            if (this.socket) {
                this.socket.emit('leaveTable');
            }
            this.currentTableId = null;
            this.resetLocalState();
            // 延遲一點點斷線，確保 emit 送出
            setTimeout(() => {
                this.disconnectSocket();
            }, 100);
        },

        /**
         * 斷開 Socket 連線
         */
        /**
         * 斷開 Socket 連線
         */
        disconnectSocket() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        },

        /**
         * 登出清理 (斷線並重置桌子狀態)
         */
        fullLogout() {
            this.disconnectSocket();
            this.currentTableId = null;
            this.resetLocalState();
        },

        /**
         * 初始化 Socket 連線並設定事件監聽
         */
        initializeSocket() {
            // 確保每次初始化都是乾淨的新連線 (避免切換帳號時殘留舊 Socket)
            this.disconnectSocket();

            // 重置本地狀態，避免顯示上一次的殘留畫面
            this.resetLocalState();

            const authStore = useAuthStore();
            const token = authStore.token;

            // 傳送 Token 進行驗證
            // 不指定 URL，自動連線到當前 Host (透過 Ingress / Nginx Proxy 轉發)
            this.socket = io({
                auth: { token },
                forceNew: true // 強制建立新連線，避免 Socket.io 復用舊的連線實例導致 Token 未更新
            });

            this.setupSocketListeners();
        },

        /**
         * 重置本地遊戲狀態
         */
        resetLocalState() {
            this.playerHand = [];
            this.dealerHand = [];
            this.playerScore = 0;
            this.dealerScore = 0;
            this.status = 'idle';
            this.currentBet = 0;
            this.sideBets = {
                perfectPairs: 0,
                twentyOnePlusThree: 0
            };
            this.sideBetResult = null;
            this.isInitialized = false;
        },

        /**
         * 設定 Socket 事件監聽器
         */
        setupSocketListeners() {
            if (!this.socket) return;

            this.socket.on('connect', () => {
                this.message = 'Connected to server.';
                // 同步目前選擇的關卡 ID 到後端
                if (this.currentTableId) {
                    console.log(`[Game] Joining level: ${this.currentTableId}`);
                    this.socket?.emit('joinLevel', { levelId: this.currentTableId });
                }
            });

            // 接收伺服器資訊 (Pod Name)
            this.socket.on('serverInfo', (data: { podName: string }) => {
                this.serverPodName = data.podName;
                console.log(`[Game] Connected to Pod: ${data.podName}`);
            });

            this.socket.on('disconnect', () => {
                this.message = 'Disconnected. Trying to reconnect...';
            });

            // 處理遊戲狀態更新
            this.socket.on('gameState', (state: GameStatePayload) => {
                this.handleGameStateUpdate(state);
            });

            // 處理餘額更新
            this.socket.on('balanceUpdate', (data: { balance: number }) => {
                this.handleBalanceUpdate(data.balance);
            });

            // 處理使用者升級/經驗值更新
            this.socket.on('userUpdate', (data: { level: number, experience: number }) => {
                const authStore = useAuthStore();
                authStore.handleUserUpdate(data);
            });

            this.socket.on('error', (data: { message: string, code?: string }) => {
                this.message = `Error: ${data.message}`;

                // 如果是因為重複登入被踢出，執行強制登出邏輯
                if (data.code === 'MULTIPLE_LOGIN') {
                    alert(data.message);
                    this.fullLogout();
                    const authStore = useAuthStore();
                    authStore.logout();
                }
            });
        },

        /**
         * 處理伺服器回傳的遊戲狀態
         * @param state 新的遊戲狀態
         */
        handleGameStateUpdate(state: GameStatePayload) {
            this._clearAllTimeouts();
            this.isInitialized = true;

            const oldStatus = this.status;
            const oldPlayerHandCount = this.playerHand.length;
            const oldDealerHandCount = this.dealerHand.length;

            // 只有在伺服器有明確下注額 (例如重連或遊戲中)，或是本地尚未下注時，才同步伺服器的下注額
            // 避免在「剛進入房間迅速點擊下注」時，被伺服器第一時間傳來的 0 元狀態覆蓋。
            if (state.currentBet > 0 || (state.status !== 'betting' && state.status !== 'idle') || this.currentBet === 0) {
                this.currentBet = state.currentBet;
            }
            this.sideBetResult = state.sideBetResult || null;

            // Case A: 新局開始 (從 Betting/Idle -> Playing) -> 需立即切換 UI 顯示 Board
            const isGameStart = (this.status === 'betting' || this.status === 'idle') && state.status === 'playing';

            // Case B: 遊戲中途加牌 -> 需播放發牌動畫 (延遲顯示分數)
            const hasNewCards = (this.playerHand.length > oldPlayerHandCount) ||
                (state.dealerHand.length > oldDealerHandCount);

            if (isGameStart) {
                // [新局/重連] 立即更新狀態以顯示遊戲面板
                this.status = state.status;
                this.message = state.message;
                this.dealerHand = state.dealerHand;
                this.playerHand = state.playerHand;

                // 稍微延遲顯示分數，讓畫面有一點「載入/發牌」的節奏感
                this._setTimeout(() => {
                    this.updateScores(state.playerScore, state.dealerScore);
                }, 600);
            } else if (hasNewCards) {
                this.playerHand = state.playerHand;

                // 先恢復成舊的手牌狀態，準備逐張加入
                const targetDealerHand = state.dealerHand;
                const newDealerCardsCount = targetDealerHand.length - oldDealerHandCount;

                // 如果莊家有新牌，則重置為舊手牌開始動畫
                if (newDealerCardsCount > 0) {
                    this.dealerHand = targetDealerHand.slice(0, oldDealerHandCount);
                } else {
                    this.dealerHand = targetDealerHand;
                }

                const DEAL_INTERVAL = 600; // 每張牌間隔
                let animationDelay = 0;

                for (let i = 0; i < newDealerCardsCount; i++) {
                    animationDelay += DEAL_INTERVAL;
                    this._setTimeout(() => {
                        // 加入下一張牌
                        const nextCardIndex = oldDealerHandCount + i;
                        if (targetDealerHand[nextCardIndex]) {
                            this.dealerHand.push(targetDealerHand[nextCardIndex]);
                        }
                    }, animationDelay);
                }

                // 總等待時間 = 發牌時間 + 額外一點點緩衝
                const totalDelay = animationDelay + 800;

                this._setTimeout(() => {
                    // 確保手牌完全同步 (防止動畫過程中有誤差)
                    this.dealerHand = targetDealerHand;
                    this.updateScores(state.playerScore, state.dealerScore);
                    this.status = state.status;
                    this.message = state.message;
                }, totalDelay);

            } else {
                // [其他] (例如重置、Stand 後、或單純的訊息更新)，直接同步無需延遲
                this.dealerHand = state.dealerHand;
                this.playerHand = state.playerHand;
                this.updateScores(state.playerScore, state.dealerScore);
                this.status = state.status;
                this.message = state.message;

                // 只有當狀態從「非下注/非空閒」轉變為「下注/空閒」時（通常是大局結束後新的一局），才重置邊注
                // 如果已經在下注狀態，不執行重置，以免覆蓋使用者剛剛快速點擊的本地邊注
                if ((this.status === 'idle' || this.status === 'betting') &&
                    (oldStatus !== 'idle' && oldStatus !== 'betting')) {
                    this.sideBets = {
                        perfectPairs: 0,
                        twentyOnePlusThree: 0
                    };
                    this.sideBetResult = null;
                }
            }

            // [同步關卡] 如果伺服器回傳了 levelId，且目前本地桌子 ID 不同（例如重登後），自動修正
            if (state.levelId && this.currentTableId !== state.levelId) {
                console.log(`[Game] Re-syncing table view: ${state.levelId}`);
                this.currentTableId = state.levelId;
            }
        },

        /**
         * 更新分數顯示
         */
        updateScores(playerScore: number, dealerScore: number) {
            this.playerScore = playerScore;
            this.dealerScore = dealerScore;
        },

        /**
         * 建立受管理的延遲任務 (setTimeout)
         */
        _setTimeout(callback: () => void, delay: number) {
            const id = window.setTimeout(() => {
                callback();
                this._timeoutIds = this._timeoutIds.filter(tid => tid !== id);
            }, delay);
            this._timeoutIds.push(id);
        },

        /**
         * 清除所有擱置中的延遲任務
         */
        _clearAllTimeouts() {
            this._timeoutIds.forEach(id => clearTimeout(id));
            this._timeoutIds = [];
        },

        /**
         * 處理餘額更新事件
         */
        handleBalanceUpdate(newBalance: number) {
            const authStore = useAuthStore();
            if (authStore.user) {
                // 餘額更新配合輸贏狀態的顯示時機 (1000ms)
                setTimeout(() => {
                    authStore.user!.balance = newBalance;
                }, 1000);
            }
        },

        /** 開始新局 (下注) */
        startGame() {
            const authStore = useAuthStore();
            if (!authStore.user || !this.socket) return;

            const totalSideBet = (this.sideBets.perfectPairs || 0) + (this.sideBets.twentyOnePlusThree || 0);
            const totalBet = this.currentBet + totalSideBet;

            if (this.currentBet === 0 || totalBet > authStore.user.balance) {
                this.message = 'Insufficient balance or no bet!';
                return;
            }

            // Server 自動從 Token 判斷 UserId，無需前端傳送
            this.socket.emit('startGame', {
                bet: this.currentBet,
                sideBets: this.sideBets
            });
        },

        /** 設定下注金額 (本地) */
        placeBet(amount: number) {
            const authStore = useAuthStore();
            const balance = authStore.user?.balance ?? 0;

            // 判斷加上這一注後總額是否會爆掉
            const sideBetTotal = (this.sideBets.perfectPairs || 0) + (this.sideBets.twentyOnePlusThree || 0);
            if (amount + sideBetTotal > balance) return false;

            this.currentBet = amount;
            this.status = 'betting';
            return true;
        },

        /** 設定邊注金額 (本地) */
        placeSideBet(type: string, amount: number) {
            const authStore = useAuthStore();
            const balance = authStore.user?.balance ?? 0;

            // 計算假設更新後的總注
            const otherSideBetKey = type === 'perfectPairs' ? 'twentyOnePlusThree' : 'perfectPairs';
            const otherSideBet = this.sideBets[otherSideBetKey] || 0;
            const projectedTotal = this.currentBet + otherSideBet + amount;

            if (projectedTotal > balance) return false;

            this.sideBets[type] = amount;
            this.status = 'betting';
            return true;
        },

        /** 清除所有下注 */
        clearBets() {
            this.currentBet = 0;
            this.sideBets = {
                perfectPairs: 0,
                twentyOnePlusThree: 0
            };
            this.status = 'idle';
        },

        /** 要牌 (Hit) */
        hit() {
            if (this.status !== 'playing' || !this.socket) return;
            this.socket.emit('hit');
        },

        /** 停牌 (Stand) */
        stand() {
            const authStore = useAuthStore();
            if (!authStore.user || !this.socket) return;
            // Server 自動從 Token 判斷 UserId
            this.socket.emit('stand');
        },

        /** 加倍下注 (Double) */
        double() {
            if (this.status !== 'playing' || !this.socket) return;
            this.socket.emit('double');
        },

        /** 投降 (Surrender) */
        surrender() {
            if (this.status !== 'playing' || !this.socket) return;
            this.socket.emit('surrender');
        },

        /** 重置遊戲 (回到下注畫面) */
        resetGame() {
            if (this.socket) {
                this.socket.emit('reset');
            }
        }
    }
});
