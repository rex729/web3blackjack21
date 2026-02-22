import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = '/api';

export interface User {
    /** 使用者唯一識別碼 */
    id: string;
    /** 電子郵件 */
    email: string;
    /** 顯示名稱 */
    name: string;
    /** 頭像路徑 */
    image: string;
    /** 目前餘額 */
    balance: number;
    /** 目前等級 (Computed) */
    level?: number;
    /** 目前經驗值 (Total) */
    experience: number;
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        // 使用者資訊 (包含餘額)
        user: null as User | null,
        // JWT Token (用於後續 API 請求的 Authorization header)
        token: localStorage.getItem('auth_token') as string | null,
        loading: false,
        error: null as string | null,
        rewardStatus: null as {
            adRewardCount: number;
            maxRewards: number;
            canClaim: boolean;
            rewardAmount: number;
        } | null,
    }),

    getters: {
        /** 計算當前等級 */
        currentLevel(state): number {
            if (!state.user) return 1;
            const xp = state.user.experience || 0;
            return Math.floor(xp / 1000) + 1;
        },
        /** 計算當前等級經驗值 (進度條用) */
        currentLevelProgress(state): number {
            if (!state.user) return 0;
            const xp = state.user.experience || 0;
            return xp % 1000;
        },
        /** 下一級所需經驗值 */
        nextLevelThreshold(): number {
            return 1000;
        }
    },

    actions: {


        /**
         * 使用 Google Credential 登入
         * @param credential Google 提供的 JWT 字串
         */
        async loginWithGoogle(credential: string) {
            this.loading = true;
            this.error = null;
            try {
                // 將前端拿到 Google credential 送給後端驗證
                const response = await axios.post(`${API_URL}/auth/google`, { credential });

                // 驗證成功，存入使用者資料與 Token
                this.user = response.data.user;
                this.token = response.data.token;
                localStorage.setItem('auth_token', response.data.token);
                return true;
            } catch (err: any) {
                this.error = err.response?.data?.error || 'Google login failed';
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * 初始化應用程式 (檢查本地 Token 並恢復使用者狀態)
         */
        async initialize() {
            if (!this.token) return;
            this.loading = true;
            try {
                // 如果本地有 Token，嘗試向後端獲取最新的使用者資訊
                const response = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                this.user = response.data.user;
            } catch (err) {
                // Token 無效或過期，強制登出
                this.logout();
            } finally {
                this.loading = false;
            }
        },

        async updateRemoteBalance(amountChange: number) {
            if (!this.user || !this.token) return;
            try {
                // 同步餘額變更到後端資料庫
                const response = await axios.post(`${API_URL}/user/balance`,
                    { userId: this.user.id, amountChange },
                    { headers: { Authorization: `Bearer ${this.token}` } }
                );
                // 更新本地 store 顯示
                this.user.balance = response.data.balance;
            } catch (err) {
                console.error('Failed to sync balance', err);
            }
        },

        async fetchRewardStatus() {
            if (!this.token) return;
            try {
                const response = await axios.get(`${API_URL}/rewards/status`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                this.rewardStatus = response.data;
            } catch (err) {
                console.error('Failed to fetch reward status', err);
            }
        },

        async claimReward() {
            if (!this.token) return false;
            try {
                const response = await axios.post(`${API_URL}/rewards/claim`, {}, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                this.rewardStatus = response.data;
                if (this.user) {
                    this.user.balance = response.data.balance;
                }
                return true;
            } catch (err) {
                console.error('Failed to claim reward', err);
                return false;
            }
        },


        handleUserUpdate(data: { level: number, experience: number }) {
            if (!this.user) return;
            // 雖然 data.level 是後端算的，但前端也有 getter 自動算
            // 我們主要更新 experience 即可，getter 會自動反應
            this.user.experience = data.experience;
            console.log(`[Auth] User XP updated: ${data.experience} (Lv.${this.currentLevel})`);
        },

        logout() {
            this.user = null;
            this.token = null;
            localStorage.removeItem('auth_token');
        }
    }
});
