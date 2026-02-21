<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { UserCircle, Trophy, X, Coins, Hexagon } from 'lucide-vue-next';
import { useAuthStore } from '../store/auth';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const authStore = useAuthStore();
const activeTab = ref<'balance' | 'experience'>('balance');
const leaderboardData = ref<any[]>([]);
const isLoading = ref(false);

const fetchLeaderboard = async () => {
    isLoading.value = true;
    try {
        const response = await fetch(`/api/leaderboard?type=${activeTab.value}`);
        const result = await response.json();
        if (result.success) {
            leaderboardData.value = result.data;
        }
    } catch (error) {
        console.error("Failed to fetch leaderboard", error);
    } finally {
        isLoading.value = false;
    }
};

const switchTab = (tab: 'balance' | 'experience') => {
    if (activeTab.value === tab) return;
    activeTab.value = tab;
    fetchLeaderboard();
};

import { watch } from 'vue';

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        fetchLeaderboard();
    }
});

onMounted(() => {
    if (props.isOpen) {
        fetchLeaderboard();
    }
});
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            <!-- Header -->
            <div class="p-6 pb-2 flex justify-between items-center bg-zinc-900 z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30">
                        <Trophy class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="text-xl font-black uppercase italic tracking-wider text-white">Leaderboard</h2>
                        <p class="text-xs text-white/50 font-bold tracking-widest uppercase">Global Ranking</p>
                    </div>
                </div>
                <button @click="emit('close')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Tabs -->
            <div class="px-6 py-4 flex gap-2">
                <button 
                    @click="switchTab('balance')"
                    class="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 border"
                    :class="activeTab === 'balance' 
                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-transparent hover:bg-zinc-800/80'"
                >
                    <Coins class="w-4 h-4" />
                    Wealth
                </button>
                <button 
                    @click="switchTab('experience')"
                    class="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 border"
                    :class="activeTab === 'experience' 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-transparent hover:bg-zinc-800/80'"
                >
                    <Hexagon class="w-4 h-4" />
                    Level
                </button>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 gap-4 text-white/30">
                    <div class="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs font-bold uppercase tracking-widest">Loading...</span>
                </div>

                <div v-else-if="leaderboardData.length === 0" class="flex flex-col items-center justify-center py-12 gap-2 text-white/30">
                     <Trophy class="w-8 h-8 opacity-50" />
                     <span class="text-xs font-bold uppercase tracking-widest">No records found</span>
                </div>

                <div v-else class="flex flex-col gap-2">
                    <div v-for="(user, index) in leaderboardData" :key="user.id" 
                        class="flex items-center gap-4 p-3 rounded-2xl border transition-all"
                        :class="[
                            user.id === authStore.user?.id 
                                ? 'bg-white/10 border-yellow-500/50' 
                                : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
                        ]"
                    >
                        <!-- Rank Number -->
                        <div class="w-8 flex flex-col items-center justify-center">
                            <span v-if="index < 3" class="text-xl">
                                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
                            </span>
                            <span v-else class="text-sm font-bold text-white/30 font-mono">
                                #{{ index + 1 }}
                            </span>
                        </div>

                        <!-- Avatar -->
                        <div class="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                             <img v-if="user.image" :src="user.image" class="w-full h-full object-cover" />
                             <div v-else class="w-full h-full flex items-center justify-center bg-zinc-800">
                                <UserCircle class="w-6 h-6 text-white/20" />
                             </div>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-sm text-white truncate flex items-center gap-2">
                                {{ user.name || 'Anonymous' }}
                                <span v-if="user.id === authStore.user?.id" class="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-wider">YOU</span>
                            </div>
                            <div class="text-[10px] text-white/40 font-mono truncate">
                                LV.{{ user.level }}
                            </div>
                        </div>

                        <!-- Value -->
                        <div class="text-right">
                             <div v-if="activeTab === 'balance'" class="font-mono font-bold text-yellow-400">
                                ${{ user.balance.toLocaleString() }}
                             </div>
                             <div v-else class="font-mono font-bold text-blue-400">
                                {{ user.experience.toLocaleString() }} XP
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
</template>
