import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

export interface User {
    id: string;
    email: string;
    name: string;
    image: string;
    balance: number;
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        // 使用者資訊 (包含餘額)
        user: null as User | null,
        // JWT Token (用於後續 API 請求的 Authorization header)
        token: localStorage.getItem('auth_token') as string | null,
        loading: false,
        error: null as string | null,
    }),

    actions: {
        async login(email: string, password?: string) {
            this.loading = true;
            this.error = null;
            try {
                const response = await axios.post(`${API_URL}/auth/login`, { email, password });
                this.user = response.data.user;
                this.token = response.data.token;
                localStorage.setItem('auth_token', response.data.token);
                return true;
            } catch (err: any) {
                this.error = err.response?.data?.error || 'Login failed';
                return false;
            } finally {
                this.loading = false;
            }
        },

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

        logout() {
            this.user = null;
            this.token = null;
            localStorage.removeItem('auth_token');
        }
    }
});
