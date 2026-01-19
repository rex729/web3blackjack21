<script setup lang="ts">
import { onMounted, watch } from 'vue';
import Board from './components/Board.vue';
import LoginScreen from './components/LoginScreen.vue';
import Lobby from './components/Lobby.vue';
import { useAuthStore } from './store/auth';
import { useGameStore } from './store/game';

const authStore = useAuthStore();
const gameStore = useGameStore();

// 監聽使用者狀態變化
watch(() => authStore.user, (newVal) => {
  if (!newVal) {
    // 登出：斷開 Socket 連線
    gameStore.disconnectSocket();
  }
  // 注意：登入時**不再**自動連線 Socket，改由進入桌子時觸發
});

onMounted(async () => {
  // 應用程式啟動時，嘗試恢復登入狀態
  await authStore.initialize();
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
</template>

<style>
@import "./style.css";

.min-vh-100 {
  min-height: 100vh;
}
</style>
