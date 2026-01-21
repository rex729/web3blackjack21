<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/store/game';
import { useAuthStore } from '@/store/auth';
import HandComp from './Hand.vue';
import ControlsComp from './Controls.vue';
import { Wallet, RefreshCw, Coins } from 'lucide-vue-next';

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
  <div class="relative w-full h-screen bg-emerald-900 overflow-hidden flex flex-col font-sans">
    <!-- Green Felt Texture Overlay -->
    <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none" />

    <!-- HUD -->
    <div class="relative z-10 flex justify-between items-center p-6 w-full">
        <!-- Left Side: Live Indicator & Bet -->
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 bg-black/40 px-6 py-3 rounded-full text-white backdrop-blur-md border border-white/10 h-[52px]">
                <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span class="font-mono text-xs tracking-widest uppercase text-white/50 italic font-bold">LIVE</span>
            </div>

            <!-- Current Bet Display -->
            <div v-if="store.currentBet > 0" class="flex items-center gap-2 bg-black/40 px-6 py-3 rounded-full text-white backdrop-blur-md border border-white/10 h-[52px]">
                <Coins class="w-4 h-4 text-yellow-500" />
                <span class="font-mono text-xs tracking-widest uppercase text-white/50 font-bold">BET: ${{ store.currentBet }}</span>
            </div>
        </div>

        <!-- Right Side: Balance & Avatar -->
        <div class="flex items-center gap-4">
          <button 
            @click="handleRefresh"
            class="p-3 rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-black/60 transition-all border border-white/10 flex items-center justify-center group h-[52px] w-[52px]"
            title="Refresh Balance"
          >
            <RefreshCw 
              class="w-5 h-5 transition-transform duration-700 ease-in-out" 
              :class="{ 'rotate-[360deg]': isRefreshing }"
            />
          </button>

          <div class="flex items-center gap-2 bg-black/80 px-6 py-3 rounded-full text-yellow-500 font-black text-xl border border-yellow-500/50 shadow-lg h-[52px]">
              <Wallet class="w-5 h-5" />
              ${{ authStore.user?.balance ?? 0 }}
          </div>
          <div 
            @click="showExitModal = true"
            class="w-[46.8px] h-[46.8px] rounded-full border-2 border-yellow-500/50 overflow-hidden shadow-lg shadow-yellow-500/20 bg-black cursor-pointer hover:border-red-500 transition-colors"
            title="Exit to Lobby"
          >
              <img :src="authStore.user?.image" alt="Avatar" class="w-full h-full object-cover" />
          </div>
        </div>
    </div>

    <!-- Game Area -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-between py-12 pb-24 max-w-5xl mx-auto w-full">

        <!-- Dealer Area -->
        <div class="flex flex-col items-center gap-4">
            <HandComp 
              :cards="store.dealerHand" 
              label="DEALER" 
              :score="showDealerScore() ? store.dealerScore : undefined" 
            />
        </div>


        <!-- Player Area -->
        <div class="flex flex-col items-center gap-8 w-full">
            <HandComp 
              :cards="store.playerHand" 
              label="PLAYER" 
              :score="store.playerHand.length > 0 ? store.playerScore : undefined" 
            />

            <!-- Controls -->
            <ControlsComp />
        </div>

    </div>

    <!-- Game Rules -->
    <div class="absolute bottom-16 left-6 z-0 text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">
        Dealer Must Draw to 16, Stand on 17
    </div>

    <!-- Watermark -->
    <div class="absolute bottom-8 right-8 pointer-events-none opacity-10 z-0">
        <div class="text-6xl font-black tracking-tighter text-black rotate-[-10deg] select-none text-right">
            CRYPTO<br />21
        </div>
    </div>

    <!-- Footer Info: Email in bottom right -->
    <div class="absolute bottom-4 right-6 z-20 flex flex-col items-end opacity-40 hover:opacity-100 transition-opacity">
        <span class="text-[10px] font-mono text-white/50 tracking-tighter uppercase mb-1">Authenticated Account</span>
        <span class="text-xs font-bold text-white tracking-widest">{{ authStore.user?.email }}</span>
    </div>

    <!-- Exit Button (Left Side) -->
    <div class="absolute bottom-4 left-6 z-20">
        <button 
            @click="showExitModal = true"
            class="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-sm"
        >
            Exit Table
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
