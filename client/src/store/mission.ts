import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './auth';

const API_URL = '/api';

export interface Mission {
    id: string;
    target: number;
    reward: number;
    type: string;
    progress: number;
    isClaimed: boolean;
    isComplete: boolean;
}

export interface MissionStatus {
    currentWinStreak: number;
    maxDailyWinStreak: number;
    dailyTotalWins: number;
    missions: Mission[];
}

export const useMissionStore = defineStore('mission', {
    state: () => ({
        status: null as MissionStatus | null,
        loading: false,
    }),
    getters: {
        claimableCount(state): number {
            if (!state.status) return 0;
            return state.status.missions.filter(m => m.isComplete && !m.isClaimed).length;
        }
    },
    actions: {
        async fetchMissionStatus() {
            const authStore = useAuthStore();
            if (!authStore.token) return;

            this.loading = true;
            try {
                const response = await axios.get(`${API_URL}/missions/status`, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                this.status = response.data;
            } catch (err) {
                console.error('Failed to fetch mission status', err);
            } finally {
                this.loading = false;
            }
        },
        async claimMission(missionId: string) {
            const authStore = useAuthStore();
            if (!authStore.token) return false;

            try {
                const response = await axios.post(`${API_URL}/missions/claim`, { missionId }, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (response.data.success) {
                    if (authStore.user) {
                        authStore.user.balance = response.data.balance;
                    }
                    // Refresh status after successful claim
                    await this.fetchMissionStatus();
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Failed to claim mission', err);
                return false;
            }
        }
    }
});
