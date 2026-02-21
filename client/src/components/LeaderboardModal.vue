<script setup lang="ts">
import { ref, watch } from 'vue';
import { UserCircle, Trophy, X, Coins } from 'lucide-vue-next';
import { useAuthStore } from '../store/auth';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const authStore = useAuthStore();
const leaderboardData = ref<any[]>([]);
const isLoading = ref(false);

const fetchLeaderboard = async () => {
    isLoading.value = true;
    try {
        const response = await fetch('/api/leaderboard');
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

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        fetchLeaderboard();
    }
});

const formatBalance = (val: number) => {
    return val.toLocaleString();
};
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            <!-- Header -->
            <div class="p-6 border-b border-white/5 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center border border-yellow-500/20">
                        <Trophy class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="text-xl font-black uppercase italic tracking-wider text-white">Global League</h2>
                        <p class="text-[10px] text-white/40 font-bold tracking-widest uppercase">Wealth Rankings</p>
                    </div>
                </div>
                <button @click="emit('close')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4 text-white/20">
                    <div class="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs font-bold uppercase tracking-widest">Loading Rankings...</span>
                </div>

                <div v-else-if="leaderboardData.length === 0" class="flex flex-col items-center justify-center py-20 gap-2 text-white/20">
                     <Trophy class="w-12 h-12 opacity-50" />
                     <span class="text-xs font-bold uppercase tracking-widest">No Records Yet</span>
                </div>

                <div v-else class="flex flex-col gap-2">
                    <div v-for="(user, index) in leaderboardData" :key="user.id" 
                        class="flex items-center gap-4 p-4 rounded-2xl transition-all"
                        :class="[
                            user.id === authStore.user?.id 
                                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                                : 'bg-white/5 border border-transparent hover:bg-white/10'
                        ]"
                    >
                        <!-- Rank -->
                        <div class="w-8 flex justify-center">
                            <span v-if="index === 0" class="text-2xl">🥇</span>
                            <span v-else-if="index === 1" class="text-2xl">🥈</span>
                            <span v-else-if="index === 2" class="text-2xl">🥉</span>
                            <span v-else class="text-sm font-bold text-white/30 font-mono">#{{ index + 1 }}</span>
                        </div>

                        <!-- Avatar -->
                        <div class="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                             <img v-if="user.image" :src="user.image" class="w-full h-full object-cover" />
                             <div v-else class="w-full h-full flex items-center justify-center">
                                <UserCircle class="w-6 h-6 text-white/20" />
                             </div>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-sm text-white truncate flex items-center gap-2 uppercase tracking-tight">
                                {{ user.name || 'Anonymous' }}
                                <span v-if="user.id === authStore.user?.id" class="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-wider">YOU</span>
                            </div>
                            <div class="text-[9px] text-white/40 font-bold uppercase tracking-widest">Professional Player</div>
                        </div>

                        <!-- Balance -->
                        <div class="text-right">
                             <div class="font-mono font-black text-yellow-500 text-lg tracking-tighter">
                                ${{ formatBalance(user.balance) }}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-white/5 bg-black/20 text-center">
                <p class="text-[10px] text-white/30 font-bold uppercase tracking-widest italic">Rankings update automatically</p>
            </div>
            
        </div>
    </div>
</template>
