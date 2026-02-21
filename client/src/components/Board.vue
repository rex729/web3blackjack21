<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/store/game';
import { useAuthStore } from '@/store/auth';
import HandComp from './Hand.vue';
import ControlsComp from './Controls.vue';
import { Wallet, RefreshCw, Coins, LogOut } from 'lucide-vue-next';

const store = useGameStore();
const authStore = useAuthStore();
const isRefreshing = ref(false);
const showExitModal = ref(false);

const handleRefresh = async () => {
  isRefreshing.value = true;
  await authStore.initialize();
  setTimeout(() => { isRefreshing.value = false; }, 600);
};

const showDealerScore = () => {
  return store.status !== 'betting' && store.status !== 'idle' && store.status !== 'playing';
};
</script>

<template>
  <div class="fixed inset-0 w-full h-[100dvh] bg-[#064e3b] overflow-y-auto flex flex-col font-sans scroll-smooth">
    <!-- 高級桌布漸層與質感 (Premium Felt & Spotlight) -->
    <div class="fixed inset-0 bg-[radial-gradient(circle_at_50%_60%,_#065f46_0%,_#022c22_100%)] pointer-events-none"></div>
    <div class="fixed inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none" />
    
    <!-- 桌邊光澤 (Table Edge Subtle Glow) -->
    <div class="fixed inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none"></div>

    <!-- HUD -->
    <div class="sticky top-0 z-40 bg-black/30 backdrop-blur-md border-b border-white/10 flex items-center px-4 py-6 md:py-4 w-full overflow-x-auto overflow-y-hidden scrollbar-hide" style="touch-action: pan-x;">
        <div class="flex justify-between items-center w-full gap-3">
            <!-- Left Side: Live Indicator & Bet -->
            <div class="flex items-center gap-2 flex-shrink-0">
                <div class="flex items-center gap-2 md:gap-3 bg-black/40 px-4 md:px-8 py-2 rounded-full text-white backdrop-blur-md border border-white/10 h-10 md:h-[52px]">
                    <div class="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse" />
                    <span class="font-mono text-xs md:text-sm tracking-widest uppercase text-white/50 italic font-bold">LIVE</span>
                </div>

                <!-- Current Bet Display -->
                <div v-if="store.currentBet > 0" class="flex items-center justify-center gap-2 bg-black/40 px-4 py-2 rounded-full text-white backdrop-blur-md border border-white/10 h-10 md:h-[52px] min-w-[80px] md:min-w-[110px]">
                    <Coins class="w-3 h-3 text-yellow-500" />
                    <span class="font-mono text-xs tracking-widest uppercase text-white/50 font-bold">${{ store.currentBet }}</span>
                </div>
            </div>

            <!-- Right Side: Balance & Avatar -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <button 
                @click="handleRefresh"
                class="p-2 rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-black/60 transition-all border border-white/10 flex items-center justify-center group h-10 w-10 md:h-[52px] md:w-[52px]"
              >
                <RefreshCw class="w-4 h-4" :class="{ 'rotate-[360deg]': isRefreshing }" />
              </button>

              <div class="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full text-yellow-500 font-black text-sm md:text-xl border border-yellow-500/50 shadow-lg h-10 md:h-[52px]">
                  <Wallet class="w-4 h-4" />
                  ${{ authStore.user?.balance ?? 0 }}
              </div>
              <div 
                @click="showExitModal = true"
                class="w-10 h-10 md:w-[46.8px] md:h-[46.8px] rounded-full border-2 border-yellow-500/50 overflow-hidden shadow-lg shadow-yellow-500/20 bg-black cursor-pointer hover:border-red-500 transition-colors"
              >
                  <img :src="authStore.user?.image" alt="Avatar" class="w-full h-full object-cover" />
              </div>
            </div>
        </div>
    </div>

    <!-- Game Area -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-start gap-4 md:gap-12 py-4 md:py-12 pb-32 md:pb-24 max-w-5xl mx-auto w-full">

        <!-- Dealer Area -->
        <div class="flex flex-col items-center gap-2 md:gap-4 shrink-0 scale-90 md:scale-100 mt-16 md:mt-24">
            <HandComp 
              :cards="store.dealerHand" 
              label="DEALER" 
              :score="showDealerScore() ? store.dealerScore : undefined" 
            />
        </div>


        <!-- Player Area -->
        <div class="flex-1 flex flex-col items-center justify-center gap-2 md:gap-8 w-full overflow-visible">
            <div class="shrink-0 scale-90 md:scale-100 mb-2 md:mb-0">
                <HandComp 
                  :cards="store.playerHand" 
                  label="PLAYER" 
                  :score="store.playerHand.length > 0 ? store.playerScore : undefined" 
                />
            </div>

            <!-- Controls (這個組件內容很多，需要內部適配) -->
            <ControlsComp class="z-20 w-full" />
        </div>

    </div>

    <!-- Level Info & Game Rules (極小螢幕隱藏) -->
    <div class="absolute bottom-16 left-6 z-0 hidden lg:flex flex-col gap-1">
        <div class="text-white/20 font-mono text-[10px] uppercase tracking-widest">
            STATE: {{ store.status }}
        </div>
        <div class="text-white/60 font-black uppercase tracking-[0.2em] text-sm">
            {{ store.currentLevelName }}
        </div>
        <div class="text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">
            Dealer Must Draw to 16, {{ store.isHit17 ? 'Hits Soft 17' : 'Stands on All 17s' }}
        </div>
    </div>

    <!-- Watermark -->
    <div class="absolute bottom-8 right-8 pointer-events-none opacity-10 z-0">
        <div class="text-6xl font-black tracking-tighter text-black rotate-[-10deg] select-none text-right">
            CRYPTO<br />21
        </div>
    </div>

    <!-- Footer Info: Email in bottom right -->
    <div class="absolute bottom-4 right-6 z-20 hidden md:flex flex-col items-end opacity-40 hover:opacity-100 transition-opacity">
        <span class="text-[10px] font-mono text-white/50 tracking-tighter uppercase mb-1">Authenticated Account</span>
        <span class="text-xs font-bold text-white tracking-widest">{{ authStore.user?.email }}</span>
    </div>

    <!-- Exit Button (Left Side) -->
    <div class="absolute bottom-4 left-6 z-20">
        <button 
            @click="showExitModal = true"
            class="px-3 py-3 md:px-4 md:py-2 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/30 rounded-lg md:rounded-lg rounded-full text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-sm flex items-center justify-center shadow-lg"
            title="Exit Table"
        >
            <span class="hidden md:inline">Exit Table</span>
            <LogOut class="w-5 h-5 md:hidden" />
        </button>
    </div>

    <!-- Exit Confirmation Modal -->
    <div v-if="showExitModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-[90%] max-w-sm flex flex-col gap-6 shadow-2xl">
            <h3 class="text-xl font-black text-white text-center uppercase tracking-wider">Leave Table?</h3>
            <p class="text-white/60 text-center font-medium leading-relaxed">
                Are you sure you want to exit? <br/>
                <span class="text-red-400 text-sm">Your current progress will be lost.</span>
            </p>
            <div class="flex gap-4">
                <button 
                    @click="showExitModal = false"
                    class="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors uppercase text-sm tracking-wider"
                >
                    Cancel
                </button>
                <button 
                    @click="store.leaveTable()"
                    class="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors uppercase text-sm tracking-wider shadow-lg shadow-red-500/20"
                >
                    Yes, Exit
                </button>
            </div>
        </div>
    </div>

  </div>
</template>
