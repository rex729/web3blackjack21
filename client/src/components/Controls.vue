<script setup lang="ts">
import { useGameStore } from '@/store/game';
import { useAuthStore } from '@/store/auth';
import { computed, ref, watch } from 'vue';

const store = useGameStore();
const authStore = useAuthStore();

const chips = computed(() => store.currentChips);
const selectedChip = ref(0);

// 當籌碼清單改變時（例如切換關卡），自動選擇第一個籌碼
watch(chips, (newChips) => {
  if (newChips && newChips.length > 0) {
    selectedChip.value = newChips[0];
  }
}, { immediate: true });

const getChipClass = (amt: number) => {
  if (amt <= 5) return 'bg-red-600 border-red-400';
  if (amt <= 25) return 'bg-green-600 border-green-400';
  if (amt <= 100) return 'bg-black border-slate-600 text-white';
  if (amt <= 500) return 'bg-purple-600 border-purple-400 text-white';
  if (amt <= 1000) return 'bg-yellow-600 border-yellow-400 text-white shadow-yellow-500/50';
  if (amt <= 5000) return 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-500/50';
  if (amt <= 50000) return 'bg-rose-600 border-rose-400 text-white shadow-rose-500/50';
  return 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]';
};

const isChipAffordable = (amt: number) => {
  const balance = authStore.user?.balance ?? 0;
  return (store.totalBet + amt) <= balance;
};

const handleAddBet = (amt?: number) => {
    const chipToUse = amt || selectedChip.value;
    if (chipToUse === 0 && chips.value.length > 0) {
        selectedChip.value = chips.value[0];
        return;
    }
  store.placeBet(store.currentBet + chipToUse);
};

const handleAddSideBet = (type: 'perfectPairs' | 'twentyOnePlusThree') => {
    if (selectedChip.value === 0 && chips.value.length > 0) {
        selectedChip.value = chips.value[0];
    }
  store.placeSideBet(type, (store.sideBets[type] || 0) + selectedChip.value);
};

const formatAmount = (amt: number) => {
  if (amt >= 1000000) return (amt / 1000000).toFixed(1) + 'M';
  if (amt >= 1000) return (amt / 1000).toFixed(0) + 'k';
  return Math.floor(amt);
};
</script>

<template>
  <!-- Betting Phase -->
  <div v-if="store.status === 'betting' || store.status === 'idle'" class="flex flex-col items-center gap-6 md:gap-12 w-full max-w-4xl px-4 py-4">
    <div class="text-xl text-white font-mono animate-pulse mb-4">
      {{ store.message || 'Place your bet' }}
    </div>

    <!-- Betting Layout -->
    <div class="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 w-full">
      
      <!-- Side Bet Spots (Left on Desktop) -->
      <div v-if="store.isSideBetsEnabled" class="flex md:flex-col gap-2 order-2 md:order-1">
        <div @click="handleAddSideBet('perfectPairs')" 
             class="group relative w-20 h-20 md:w-28 md:h-28 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-yellow-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-2">
          <span class="text-[10px] text-white/40 uppercase font-black mb-1">Perfect Pairs</span>
          <div class="text-lg font-black text-yellow-500">
            ${{ formatAmount(store.sideBets.perfectPairs) }}
          </div>
          <div class="absolute -top-2 -right-2 bg-yellow-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-lg">25:1</div>
        </div>

        <div @click="handleAddSideBet('twentyOnePlusThree')" 
             class="group relative w-20 h-20 md:w-28 md:h-28 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-2">
          <span class="text-[10px] text-white/40 uppercase font-black mb-1">21 + 3</span>
          <div class="text-lg font-black text-blue-400">
            ${{ formatAmount(store.sideBets.twentyOnePlusThree) }}
          </div>
          <div class="absolute -top-2 -right-2 bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-lg">100:1</div>
        </div>
      </div>

      <!-- Main Bet Spot (Center) -->
      <div class="flex flex-col items-center gap-2 order-1 md:order-2">
        <div @click="() => handleAddBet()" 
             class="relative w-32 h-32 md:w-56 md:h-56 rounded-full border-8 border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
          <span class="text-xs md:text-sm text-white/50 uppercase font-black tracking-widest mb-1">Main Bet</span>
          <div class="text-3xl md:text-5xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            ${{ formatAmount(store.currentBet) }}
          </div>
          <div v-if="store.currentBet > 0" class="absolute inset-0 rounded-full animate-ping border-2 border-white/20 pointer-events-none"></div>
        </div>
        
        <div class="flex gap-2">
          <button @click="store.clearBets" 
            class="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 text-[10px] font-black uppercase tracking-wider rounded border border-red-500/30 transition-all">
            Clear All
          </button>
          <button @click="store.startGame" :disabled="store.currentBet === 0"
            class="px-10 py-2 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-900/40 disabled:opacity-50 disabled:shadow-none transition-all">
            Deal
          </button>
        </div>
      </div>

      <!-- Chip Selector (Right on Desktop) -->
      <div class="flex md:flex-col gap-1.5 md:gap-3 flex-wrap justify-center order-3">
        <button v-for="amt in chips" :key="amt"
          @click="() => { if (isChipAffordable(amt)) { selectedChip = amt; handleAddBet(amt); } }"
          :disabled="!isChipAffordable(amt)"
          class="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center font-bold shadow-lg transition-all text-[10px] md:text-xs"
          :class="[
            getChipClass(amt), 
            selectedChip === amt ? 'ring-2 ring-white z-10' : 'opacity-80',
            isChipAffordable(amt) ? 'hover:scale-110 active:scale-95' : 'opacity-20 grayscale cursor-not-allowed scale-90'
          ]"
        >
          {{ formatAmount(amt) }}
        </button>
      </div>
    </div>
  </div>

  <!-- Playing Phase -->
  <div v-else-if="store.status === 'playing'" class="flex gap-4 flex-wrap justify-center">
    <button @click="store.hit"
      class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-green-500 border-b-8 border-green-700 text-white font-black text-lg md:text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
    >
      HIT
    </button>
    <button @click="store.stand"
      class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-red-500 border-b-8 border-red-700 text-white font-black text-lg md:text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
    >
      STAND
    </button>
    <button v-if="store.currentTableId !== 'level-1'" @click="store.double" :disabled="!store.canDouble"
      class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-yellow-500 border-b-8 border-yellow-700 text-white font-black text-[10px] md:text-xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all disabled:opacity-50 disabled:grayscale"
    >
      DOUBLE
    </button>
    <button v-if="store.canSurrender" @click="store.surrender"
      class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-500 border-b-8 border-slate-700 text-white font-black text-[10px] md:text-xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
    >
      SURRENDER
    </button>
  </div>

  <!-- Result Phase -->
  <div v-else class="flex flex-col items-center gap-6 text-center">
    <h2 class="text-3xl md:text-5xl font-black text-white drop-shadow-lg uppercase tracking-tighter italic max-w-2xl px-4">
      {{ store.message }}
    </h2>
    <div v-if="store.sideBetResult && store.sideBetResult.payout > 0" class="text-yellow-400 font-bold animate-bounce text-xl">
      Side Bet Win: +${{ formatAmount(store.sideBetResult.payout) }}
    </div>
    <button @click="store.resetGame"
      class="px-12 py-4 bg-white text-black font-black text-xl uppercase tracking-widest rounded-full hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-2xl"
    >
      Play Again
    </button>
  </div>
</template>

