<script setup lang="ts">
import { ref } from 'vue';
import { Spade, Heart, Club, Diamond } from 'lucide-vue-next';
import Board from './components/Board.vue';

const isStarted = ref(false);
</script>

<template>
  <div v-if="!isStarted" class="flex flex-col items-center justify-center min-h-screen w-full bg-black text-white p-8 overflow-hidden">
    <div class="flex gap-4 mb-8 text-6xl animate-bounce">
      <Spade fill="white" class="w-16 h-16" />
      <Heart class="text-red-600 w-16 h-16" fill="currentColor" />
      <Club fill="white" class="w-16 h-16" />
      <Diamond class="text-red-600 w-16 h-16" fill="currentColor" />
    </div>

    <h1 class="text-6xl font-black mb-4 tracking-tighter uppercase italic">
      CRYPTO<span class="text-yellow-500">21</span>
    </h1>

    <p class="text-xl text-zinc-500 mb-12 tracking-widest uppercase">
      Web3 Blackjack Protocol
    </p>

    <button
      @click="isStarted = true"
      class="px-12 py-4 bg-white text-black font-black text-2xl uppercase tracking-widest rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl hover:shadow-white/20"
    >
      Enter Table
    </button>
  </div>

  <Board v-else />
</template>

<style>
@import "./style.css";
</style>
