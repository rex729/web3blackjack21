<script setup lang="ts">
import { computed } from 'vue';
import { useMissionStore } from '../store/mission';
import { X, Target, Flame, Trophy, CheckCircle2, ChevronRight, Gift } from 'lucide-vue-next';

const props = defineProps<{
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const missionStore = useMissionStore();

const handleClose = () => {
    emit('update:show', false);
};

const handleClaim = async (missionId: string) => {
    await missionStore.claimMission(missionId);
};

const status = computed(() => missionStore.status);
const missions = computed(() => status.value?.missions || []);

const getIcon = (id: string) => {
    switch (id) {
        case 'streak3': return Flame;
        case 'streak5': return Trophy;
        case 'total15': return Target;
        default: return Target;
    }
};

const getTitle = (id: string) => {
    switch (id) {
        case 'streak3': return '3連勝 (3-Win Streak)';
        case 'streak5': return '5連勝 (5-Win Streak)';
        case 'total15': return '累積15勝 (15 Total Wins)';
        default: return 'Mission';
    }
};
</script>

<template>
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="handleClose"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            <!-- Header -->
            <div class="relative h-32 bg-gradient-to-br from-indigo-900 to-purple-900 shrink-0 overflow-hidden">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-30 mix-blend-screen"></div>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 text-white pointer-events-none">
                    <div class="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50 mb-2 border-2 border-indigo-200">
                        <Gift class="w-7 h-7 text-white" />
                    </div>
                </div>

                <button 
                    @click="handleClose"
                    class="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-20"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Body Area -->
            <div class="p-6 overflow-y-auto bg-zinc-950">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-black text-white tracking-tight mb-1">每日任務</h2>
                    <p class="text-zinc-400 text-sm">Daily Missions</p>
                </div>

                <div v-if="missionStore.loading && !status" class="flex justify-center p-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>

                <div v-else class="space-y-4">
                    <div 
                        v-for="mission in missions" 
                        :key="mission.id"
                        class="bg-zinc-900 rounded-2xl p-4 border relative overflow-hidden transition-all"
                        :class="mission.isClaimed ? 'border-green-500/30 bg-green-950/20' : mission.isComplete ? 'border-purple-500/50 bg-indigo-900/20 shadow-lg shadow-purple-900/20' : 'border-white/5'"
                    >
                        <div class="flex items-start justify-between mb-3 relative z-10">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                                     :class="mission.isClaimed ? 'bg-green-500/20 text-green-400' : mission.isComplete ? 'bg-purple-500/20 text-purple-400' : 'bg-black/40 text-zinc-500'">
                                    <component :is="getIcon(mission.id)" class="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 class="text-white font-bold leading-tight">{{ getTitle(mission.id) }}</h3>
                                    <p class="text-yellow-400 text-sm font-black">+${{ mission.reward.toLocaleString() }}</p>
                                </div>
                            </div>

                            <button
                                v-if="mission.isComplete && !mission.isClaimed"
                                @click="handleClaim(mission.id)"
                                :disabled="missionStore.loading"
                                class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transform active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                                Claim
                                <ChevronRight class="w-4 h-4" />
                            </button>
                            <div v-else-if="mission.isClaimed" class="flex items-center gap-1 text-green-500 font-bold text-sm px-2 py-2">
                                <CheckCircle2 class="w-4 h-4" />
                                Claimed
                            </div>
                            <div v-else class="text-zinc-500 font-bold text-sm px-2 py-2">
                                In Progress
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="relative z-10" v-if="!mission.isClaimed">
                            <div class="flex justify-between text-xs font-bold mb-1">
                                <span :class="mission.isComplete ? 'text-purple-400' : 'text-zinc-400'">
                                    {{ mission.progress }} / {{ mission.target }}
                                </span>
                                <span class="text-zinc-500">{{ Math.floor((mission.progress / mission.target) * 100) }}%</span>
                            </div>
                            <div class="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                <div 
                                    class="h-full transition-all duration-1000 ease-out"
                                    :class="mission.isComplete ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'"
                                    :style="{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
