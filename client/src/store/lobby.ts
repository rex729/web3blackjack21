
import { defineStore } from 'pinia';
import { LEVELS, LevelConfig } from '@/config/levels';
import { useAuthStore } from './auth';
import { useGameStore } from './game';

export const useLobbyStore = defineStore('lobby', {
    state: () => ({
        levels: LEVELS as LevelConfig[]
    }),

    getters: {
        /** 判斷是否能進入該關卡 (餘額檢查 & 解鎖檢查) */
        canEnter: (state) => {
            return (levelId: string) => {
                const authStore = useAuthStore();
                const level = state.levels.find(l => l.id === levelId);

                if (!level) return false;
                // 若關卡鎖定，直接回傳 false
                if (level.locked) return false;

                // 檢查餘額是否足夠入場
                const userBalance = authStore.user?.balance ?? 0;
                return userBalance >= level.buyIn;
            };
        }
    },

    actions: {
        /**
         * 嘗試進入關卡
         * @returns boolean 是否成功進入
         */
        enterLevel(levelId: string): boolean {
            const level = this.levels.find(l => l.id === levelId);
            if (!level) return false;

            if (level.locked) return false;

            // 使用 getter 的邏輯進行檢查 (不過 getter 需傳參數，這裡直接重寫或調用 getter 稍微麻煩，直接檢查即可)
            const authStore = useAuthStore();
            const userBalance = authStore.user?.balance ?? 0;

            if (userBalance < level.buyIn) {
                // 餘額不足
                return false;
            }

            // 檢查通過，呼叫 GameStore 進行轉場
            const gameStore = useGameStore();
            gameStore.joinTable(levelId);
            return true;
        }
    }
});
