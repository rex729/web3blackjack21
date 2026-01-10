<script setup lang="ts">
import CardComp from './Card.vue';
import type { Card } from '@/store/game';

defineProps<{
  cards: Card[];
  score?: number;
  label?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Score Bubble -->
    <div v-if="score !== undefined" 
      class="bg-black/50 backdrop-blur-md px-4 py-1 rounded-full text-white font-mono text-xl border border-white/10 shadow-lg"
    >
      {{ score }}
    </div>

    <!-- Cards Fan -->
    <div class="flex -space-x-12 min-h-[144px]">
      <div v-for="(card, i) in cards" :key="i" class="relative" :style="{ zIndex: i }">
        <CardComp :card="card" :index="i" />
      </div>

      <!-- Empty Placeholder -->
      <div v-if="cards.length === 0" 
        class="w-24 h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20 font-bold uppercase tracking-widest text-xs"
      >
        {{ label || 'Empty' }}
      </div>
    </div>
  </div>
</template>
