<script setup lang="ts">
import { onMounted, watch } from 'vue';
import Board from './components/Board.vue';
import LoginScreen from './components/LoginScreen.vue';
import { useAuthStore } from './store/auth';
import { useGameStore } from './store/game';

const authStore = useAuthStore();
const gameStore = useGameStore();

// 監聽使用者狀態變化
watch(() => authStore.user, (newVal) => {
  if (newVal) {
    // 登入成功：初始化 Socket 連線
    gameStore.initializeSocket();
  } else {
    // 登出：斷開 Socket 連線
    gameStore.disconnectSocket();
  }
});

onMounted(async () => {
  // 應用程式啟動時，嘗試恢復登入狀態
  await authStore.initialize();
  
  // 如果恢復成功，則初始化 Socket
  if (authStore.user) {
    gameStore.initializeSocket();
  }
});
</script>

<template>
  <!-- 如果未登入顯示登入畫面，否則顯示遊戲畫面 -->
  <LoginScreen v-if="!authStore.user" />
  <Board v-else />
</template>

<style>
@import "./style.css";

.min-vh-100 {
  min-height: 100vh;
}
</style>
