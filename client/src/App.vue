<script setup lang="ts">
import { ref } from 'vue';
import { Spade, Heart, Club, Diamond, LogIn } from 'lucide-vue-next';
import Board from './components/Board.vue';
import { useAuthStore } from './store/auth';

const authStore = useAuthStore();
const email = ref('');
const isStarted = ref(false);

const handleLogin = async () => {
  if (!email.value) return;
  const success = await authStore.login(email.value);
  if (success) {
    isStarted.ref = true;
  }
};
</script>

<template>
  <div v-if="!authStore.user" class="flex flex-col items-center justify-center min-vh-100 w-full bg-black text-white p-8 overflow-hidden">
    <div class="flex gap-4 mb-8 text-6xl animate-bounce">
      <Spade fill="white" class="w-16 h-16" />
      <Heart class="text-red-600 w-16 h-16" fill="currentColor" />
      <Club fill="white" class="w-16 h-16" />
      <Diamond class="text-red-600 w-16 h-16" fill="currentColor" />
    </div>

    <h1 class="text-6xl font-black mb-4 tracking-tighter uppercase italic">
      CRYPTO<span class="text-yellow-500">21</span>
    </h1>

    <p class="text-xl text-zinc-500 mb-8 tracking-widest uppercase text-center">
      Web3 Blackjack Protocol
    </p>

    <!-- Login Area -->
    <div class="w-full max-w-md bg-zinc-900/50 p-8 rounded-3xl border border-white/10 backdrop-blur-xl">
        <input 
          v-model="email"
          type="email" 
          placeholder="Enter your email"
          class="w-full bg-black/50 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500 transition-colors mb-4"
          @keyup.enter="handleLogin"
        />
        
        <button
          @click="handleLogin"
          :disabled="authStore.loading"
          class="w-full py-4 bg-white text-black font-black text-xl uppercase tracking-widest rounded-2xl hover:bg-yellow-500 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <span v-if="authStore.loading">Entering...</span>
          <template v-else>
            Login / Join <LogIn class="w-6 h-6" />
          </template>
        </button>
        
        <p v-if="authStore.error" class="text-red-500 text-center mt-4 text-sm font-bold uppercase tracking-tight">
            {{ authStore.error }}
        </p>
    </div>
  </div>

  <Board v-else />
</template>

<style>
@import "./style.css";

.min-vh-100 {
  min-height: 100vh;
}
</style>
