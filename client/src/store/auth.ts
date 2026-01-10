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
        user: null as User | null,
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
                return true;
            } catch (err: any) {
                this.error = err.response?.data?.error || 'Login failed';
                return false;
            } finally {
                this.loading = false;
            }
        },

        async updateRemoteBalance(amountChange: number) {
            if (!this.user) return;
            try {
                const response = await axios.post(`${API_URL}/user/balance`, {
                    userId: this.user.id,
                    amountChange
                });
                this.user.balance = response.data.balance;
            } catch (err) {
                console.error('Failed to sync balance', err);
            }
        },

        logout() {
            this.user = null;
        }
    }
});
