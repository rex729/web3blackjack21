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
                const response = await axios.post(`${API_URL}/auth/google`, { credential });
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
                const response = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                this.user = response.data.user;
            } catch (err) {
                this.logout();
            } finally {
                this.loading = false;
            }
        },

        async updateRemoteBalance(amountChange: number) {
            if (!this.user || !this.token) return;
            try {
                const response = await axios.post(`${API_URL}/user/balance`,
                    { userId: this.user.id, amountChange },
                    { headers: { Authorization: `Bearer ${this.token}` } }
                );
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
