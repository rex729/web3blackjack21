import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useGameStore } from './game';

export interface LevelConfig {
    id: string;
    name: string;
    subtitle: string;
    buyIn: number;
    prize: string;
    color: string;
    image: string;
    features: string[];
    minLevel: number;
    hit17: boolean;
    sideBets: boolean;
    allowedChips: number[];
    surrenderAllowed: boolean;
    fiveCardCharlie: boolean;
    xpMultiplier: number;
    locked?: boolean;
}

export const useLobbyStore = defineStore('lobby', {
    state: () => ({
        levels: [] as LevelConfig[],
        loading: false
    }),

    getters: {
        /** 判斷是否能進入該關卡 (餘額檢查 & 解鎖檢查) */
        canEnter: (state) => {
            return (levelId: string) => {
                const authStore = useAuthStore();
                const level = state.levels.find(l => l.id === levelId);

                if (!level) return false;

                // 檢查餘額是否足夠入場
                const userBalance = authStore.user?.balance ?? 0;
                if (userBalance < level.buyIn) return false;

                // 檢查等級要求
                const userLevel = authStore.currentLevel;
                if (level.minLevel && userLevel < level.minLevel) return false;

                return true;
            };
        }
    },

    actions: {
        /** 從後端 API 取得關卡資訊 */
        async fetchLevels() {
            this.loading = true;
            try {
                const response = await fetch('/api/game/levels');
                const result = await response.json();
                if (result.success) {
                    this.levels = result.data;
                }
            } catch (error) {
                console.error('Failed to fetch levels:', error);
            } finally {
                this.loading = false;
            }
        },

        /**
         * 嘗試進入關卡
         * @returns boolean 是否成功進入
         */
        enterLevel(levelId: string): boolean {
            const level = this.levels.find(l => l.id === levelId);
            if (!level) return false;

            // 檢查通過，呼叫 GameStore 進行轉場
            if (this.canEnter(levelId)) {
                const gameStore = useGameStore();
                gameStore.joinTable(levelId);
                return true;
            }
            return false;
        }
    }
});
