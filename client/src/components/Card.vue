<script setup lang="ts">
import { computed } from 'vue';
import { Spade, Heart, Diamond, Club } from 'lucide-vue-next';
import type { Card, Suit } from '@/store/game';

const props = defineProps<{
  card: Card;
  index?: number;
}>();

const isRed = computed(() => props.card.suit === 'hearts' || props.card.suit === 'diamonds');

const getSuitIcon = (suit: Suit) => {
  switch (suit) {
    case 'spades': return Spade;
    case 'hearts': return Heart;
    case 'diamonds': return Diamond;
    case 'clubs': return Club;
  }
};
</script>

<template>
  <div v-if="card.hidden" 
    class="relative w-24 h-36 bg-blue-800 rounded-lg shadow-xl border-2 border-white/20 flex items-center justify-center pattern-grid opacity-0 animate-card-deal"
    :style="{ animationDelay: `${(index || 0) * 150}ms` }"
  >
    <div class="w-20 h-32 border-2 border-white/10 rounded-md bg-white/5" />
  </div>

  <div v-else 
    class="relative w-24 h-36 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col justify-between p-2 select-none opacity-0 animate-card-deal"
    :class="isRed ? 'text-red-600' : 'text-black'"
    :style="{ animationDelay: `${(index || 0) * 150}ms` }"
  >
    <!-- Top Left -->
    <div class="flex flex-col items-center">
      <span class="font-bold text-lg leading-none">{{ card.value }}</span>
      <component :is="getSuitIcon(card.suit)" class="w-4 h-4 fill-current" />
    </div>

    <!-- Center Big Icon -->
    <div class="absolute inset-0 flex items-center justify-center opacity-20">
      <component :is="getSuitIcon(card.suit)" class="w-20 h-20 fill-current" />
    </div>

    <!-- Bottom Right (Rotated) -->
    <div class="flex flex-col items-center rotate-180">
      <span class="font-bold text-lg leading-none">{{ card.value }}</span>
      <component :is="getSuitIcon(card.suit)" class="w-4 h-4 fill-current" />
    </div>
  </div>
</template>

<style scoped>
</style>
