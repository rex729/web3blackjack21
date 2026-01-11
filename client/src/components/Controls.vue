<script setup lang="ts">
import { useGameStore } from '@/store/game';
import { clsx } from 'clsx';

const store = useGameStore();

const chips = [5, 25, 100, 500, 1000];
</script>

<template>
  <div v-if="store.status === 'betting' || store.status === 'idle'" class="flex flex-col items-center gap-6">
    <div class="text-xl text-white font-mono animate-pulse">
      {{ store.message || 'Place your bet' }}
    </div>

    <!-- Chip Selector -->
    <div class="flex gap-4">
      <button v-for="amt in chips" :key="amt"
        @click="store.placeBet(store.currentBet + amt)"
        :disabled="store.currentBet + amt > store.balance"
        class="w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
        :class="clsx(
          amt === 5 ? 'bg-red-600 border-red-400' :
          amt === 25 ? 'bg-green-600 border-green-400' :
          amt === 100 ? 'bg-black border-slate-600 text-white' :
          amt === 500 ? 'bg-purple-600 border-purple-400 text-white' :
          'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
        )"
      >
        {{ amt }}
      </button>
    </div>

    <div class="flex gap-4 items-center">
      <button @click="store.placeBet(0)" 
        class="px-4 py-2 text-white/50 hover:text-white uppercase text-xs font-bold tracking-widest"
      >
        Clear Bet
      </button>
      <div class="text-2xl font-black text-white bg-black/50 px-6 py-3 rounded-lg border border-white/20">
        {{ store.currentBet }}
      </div>
    </div>

    <button @click="store.startGame" :disabled="store.currentBet === 0"
      class="px-12 py-4 bg-yellow-500 text-yellow-950 font-black text-2xl uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(234,179,8,0.6)] hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
    >
      DEAL
    </button>
  </div>

  <div v-else-if="store.status === 'playing'" class="flex gap-4">
    <button @click="store.hit"
      class="w-32 h-32 rounded-full bg-green-500 border-b-8 border-green-700 text-white font-black text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
    >
      HIT
    </button>
    <button @click="store.stand"
      class="w-32 h-32 rounded-full bg-red-500 border-b-8 border-red-700 text-white font-black text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
    >
      STAND
    </button>
  </div>

  <div v-else class="flex flex-col items-center gap-6 text-center">
    <h2 class="text-4xl font-black text-white drop-shadow-lg shadow-black uppercase tracking-tighter italic">
      {{ store.message }}
    </h2>
    <button @click="store.resetGame"
      class="px-8 py-3 bg-white text-black font-bold text-xl uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors shadow-xl"
    >
      Play Again
    </button>
  </div>
</template>
