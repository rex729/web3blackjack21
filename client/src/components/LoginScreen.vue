<script setup lang="ts">
import { onMounted, nextTick, ref } from 'vue';
import { Spade, Heart, Club, Diamond, Share2, ExternalLink, MoreVertical } from 'lucide-vue-next';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();

// --- 環境偵測邏輯 ---
const isInAppBrowser = ref(false);
const isAndroid = ref(false);
const isIOS = ref(false);

const checkBrowser = () => {
    // @ts-ignore
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    isAndroid.value = /android/i.test(ua);
    isIOS.value = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    
    // 偵測是否在常見 App 的內建瀏覽器環境
    const inAppKeywords = ['Line', 'Telegram', 'Lark', 'Feishu', 'MicroMessenger', 'FBAN', 'FBAV', 'Instagram'];
    isInAppBrowser.value = inAppKeywords.some(key => ua.indexOf(key) > -1);

    // 如果是 Android 且在 App 內，嘗試執行「強制跳轉 Chrome」的黑科技
    if (isAndroid.value && isInAppBrowser.value) {
        const currentUrl = window.location.href.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = intentUrl;
    }
};

// Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "35708177818-vt66utfbrr6ivjtjch3nnk31aihfk1e0.apps.googleusercontent.com";

// Google 登入後的回調函式
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
        btn.innerHTML = '';
        // @ts-ignore
        window.google.accounts.id.renderButton(
          btn,
          { 
            theme: "filled_black", 
            size: "large", 
            width: 350, 
            shape: "pill",
            logo_alignment: "left"
          }
        );
      }
    });
  }
};

onMounted(() => {
  checkBrowser();
  
  const initGoogleBtn = () => {
    // @ts-ignore
    if (window.google) {
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      renderGoogleButton();
      return true;
    }
    return false;
  };

  if (!initGoogleBtn()) {
    const checkGoogleInterval = setInterval(() => {
      if (initGoogleBtn()) {
        clearInterval(checkGoogleInterval);
      }
    }, 200);
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center min-vh-100 w-full bg-black text-white p-8 overflow-hidden relative">
    
    <!-- ⚠️ In-App Browser Guidance Layer (for iOS / Others who didn't auto-jump) -->
    <div v-if="isInAppBrowser" class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
        <div class="w-20 h-20 bg-yellow-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <ExternalLink class="text-black w-10 h-10" />
        </div>
        
        <h2 class="text-3xl font-black mb-4 italic uppercase">Compatible Mode</h2>
        <p class="text-zinc-400 mb-8 leading-relaxed">
            為支持 Google 安全登入，請點擊右上角控制項並選擇 <span class="text-white font-bold">「使用預設瀏覽器開啟」</span>。
        </p>

        <!-- Dynamic Instructions based on OS -->
        <div class="space-y-6 w-full max-w-xs">
            <div class="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-white/10">
                <div class="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-500">1</div>
                <div class="flex-1 text-left text-sm">
                    點擊右上角的 <MoreVertical class="inline w-4 h-4" /> 或 <Share2 class="inline w-4 h-4" /> 
                </div>
            </div>
            <div class="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-white/10">
                <div class="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-500">2</div>
                <div class="flex-1 text-left text-sm">
                    選擇 <span class="text-yellow-500 font-bold">使用預設瀏覽器開啟</span>
                </div>
            </div>
        </div>

        <p class="mt-12 text-[10px] text-zinc-600 uppercase tracking-widest italic">
            Redirecting to System Browser...
        </p>
    </div>

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
        
        <!-- Custom UI Wrapper -->
        <div class="relative w-[350px] h-[50px] mb-4 group cursor-pointer">
            <!-- 1. The Real Google Button (Invisible Layer) -->
            <!-- Remove scale to ensure stable rendering. Z-index 50 to be on top. Opacity almost 0. -->
            <div id="google-login-btn" class="absolute inset-0 z-50 opacity-[0.01] flex items-center justify-center"></div>

            <!-- 2. The Custom Visual Button (Visible Layer) -->
            <div class="absolute inset-0 z-10 bg-white text-black rounded-full flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
                 <!-- Google G Logo (SVG) -->
                 <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                 </svg>
                 <span class="font-bold tracking-wide">SIGN IN WITH GOOGLE</span>
            </div>
        </div>
        
        <p v-if="authStore.error" class="text-red-500 text-center mt-4 text-sm font-bold uppercase tracking-tight">
            {{ authStore.error }}
        </p>
        
        <p class="text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em] mt-6 text-center">
          By signing in, you agree to our protocol terms
        </p>
    </div>
  </div>
</template>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}
</style>
