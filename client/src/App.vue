<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { Spade, Heart, Club, Diamond, LogIn } from 'lucide-vue-next';
import Board from './components/Board.vue';
import { useAuthStore } from './store/auth';
import { useGameStore } from './store/game';

const authStore = useAuthStore();
const gameStore = useGameStore();

// Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "35708177818-vt66utfbrr6ivjtjch3nnk31aihfk1e0.apps.googleusercontent.com";

// Google 登入後的回調函式
// 當 Google 認證成功，會回傳一個 credential (JWT)，我們將其送往後端進行驗證
const handleGoogleCallback = async (response: any) => {
  const success = await authStore.loginWithGoogle(response.credential);
  if (success) {
    console.log("Google Login Success");
  }
};

const renderGoogleButton = () => {
  // @ts-ignore
  if (window.google && !authStore.user) {
    nextTick(() => {
      const btn = document.getElementById("google-login-btn");
      if (btn) {
        // @ts-ignore
        window.google.accounts.id.renderButton(
          btn,
          { theme: "filled_black", size: "large", width: 400, shape: "pill" }
        );
      }
    });
  }
};

// Re-render button when logging out
watch(() => authStore.user, (newVal) => {
  if (!newVal) renderGoogleButton();
});

onMounted(async () => {
  // Restore session if token exists
  await authStore.initialize();
  gameStore.initializeSocket();

  // @ts-ignore
  if (window.google) {
    // @ts-ignore
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
    });

    // 初始化 Google 按鈕
    // client_id 必須對應到 GCP 上的設定
    renderGoogleButton();
  }
});
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
    <div class="w-full max-w-md bg-zinc-900/50 p-10 rounded-3xl border border-white/10 backdrop-blur-xl flex flex-col items-center">
        <div id="google-login-btn" class="w-full flex justify-center mb-4"></div>
        
        <p v-if="authStore.error" class="text-red-500 text-center mt-4 text-sm font-bold uppercase tracking-tight">
            {{ authStore.error }}
        </p>
        
        <p class="text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em] mt-6 text-center">
          By signing in, you agree to our protocol terms
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
