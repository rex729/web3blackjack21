<script setup lang="ts">
import { onMounted, watch } from 'vue';
import Board from './components/Board.vue';
import LoginScreen from './components/LoginScreen.vue';
import Lobby from './components/Lobby.vue';
import { useAuthStore } from './store/auth';
import { useGameStore } from './store/game';

const authStore = useAuthStore();
const gameStore = useGameStore();
const isDev = import.meta.env.DEV;

// 監聽使用者狀態變化
watch(() => authStore.user, (newVal) => {
  if (!newVal) {
    // 登出：斷開 Socket 連線
    gameStore.disconnectSocket();
  } else if (!gameStore.socket) {
    // 只有在還沒有連線時才自動連線 (避免餘額更新觸發重複連線)
    console.log('[App] Auth detect, initializing socket...');
    gameStore.initializeSocket();
  }
});

onMounted(async () => {
  // 應用程式啟動時，嘗試恢復登入狀態
  await authStore.initialize();
  
  // 如果已登入，主動連線 Socket 以檢查是否有進行中的遊戲
  if (authStore.user) {
    console.log('[App] User detected on mount, checking for active game sessions...');
    gameStore.initializeSocket();
  }
});
</script>

<template>
  <!-- 根據狀態顯示不同畫面： -->
  <!-- 1. 未登入 -> 顯示登入畫面 -->
  <LoginScreen v-if="!authStore.user" />
  
  <!-- 2. 已登入且未選桌 -> 顯示大廳 -->
  <Lobby v-else-if="!gameStore.currentTableId" />
  
  <!-- 3. 已選桌 -> 顯示遊戲桌 -->
  <Board v-else />

  <!-- Debug Info: Display Server Pod Name (Only in Dev) -->
  <div v-if="gameStore.serverPodName && isDev" class="fixed bottom-1 left-1 z-50 pointer-events-none opacity-40 text-[10px] text-white font-mono bg-black/50 px-2 py-1 rounded">
    Connected to: {{ gameStore.serverPodName }}
  </div>
</template>

<style>
@import "./style.css";

.min-vh-100 {
  min-height: 100vh;
}
</style>
