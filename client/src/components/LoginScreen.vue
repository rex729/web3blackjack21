<script setup lang="ts">
import { onMounted, nextTick, ref } from 'vue';
import { Spade, Heart, Club, Diamond, Share2, ExternalLink, MoreVertical } from 'lucide-vue-next';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();

// --- 環境偵測邏輯 ---
const isInAppBrowser = ref(false);
const isAndroid = ref(false);
const isIOS = ref(false);

const isTermsModalOpen = ref(false);
const isPrivacyModalOpen = ref(false);

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
  <div class="w-full bg-black text-white selection:bg-yellow-500 selection:text-black">
    <!-- Hero Section -->
    <main class="relative flex flex-col items-center min-vh-100 w-full bg-black text-white p-8 text-center overflow-x-hidden pt-32">
        <!-- ⚠️ In-App Browser Guidance Layer -->
        <div v-if="isInAppBrowser" class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
            <div class="w-20 h-20 bg-yellow-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                <ExternalLink class="text-black w-10 h-10" />
            </div>
            <h2 class="text-3xl font-black mb-4 italic uppercase">Compatible Mode</h2>
            <p class="text-zinc-400 mb-8 leading-relaxed">
                為支持 Google 安全登入，請點擊右上角控制項並選擇 <span class="text-white font-bold">「使用預設瀏覽器開啟」</span>。
            </p>
            <div class="space-y-6 w-full max-w-xs text-sm">
                <div class="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-white/10">
                    <div class="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-500">1</div>
                    <div class="flex-1 text-left">點擊右上角的 <MoreVertical class="inline w-4 h-4" /> 或 <Share2 class="inline w-4 h-4" /></div>
                </div>
                <div class="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-white/10">
                    <div class="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-500">2</div>
                    <div class="flex-1 text-left">選擇 <span class="text-yellow-500 font-bold">使用預設瀏覽器開啟</span></div>
                </div>
            </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center">
            <!-- Brand Mark -->
            <div class="flex gap-4 mb-8 text-5xl animate-bounce justify-center">
              <Spade fill="white" class="w-12 h-12" />
              <Heart class="text-red-600 w-12 h-12" fill="currentColor" />
              <Club fill="white" class="w-12 h-12" />
              <Diamond class="text-red-600 w-12 h-12" fill="currentColor" />
            </div>

            <h1 class="text-6xl font-black mb-4 tracking-tighter uppercase italic">
              CRYPTO<span class="text-yellow-500">21</span>
            </h1>

            <p class="text-xl text-zinc-500 mb-10 tracking-widest uppercase">
              Web3 Blackjack Protocol
            </p>

            <!-- Login Module -->
            <div class="w-full max-w-md bg-zinc-900/50 p-10 rounded-3xl border border-white/10 backdrop-blur-xl flex flex-col items-center mb-12 shadow-2xl">
                <div class="relative w-full max-w-[320px] h-[50px] mb-4 group cursor-pointer">
                    <div id="google-login-btn" class="absolute inset-0 z-50 opacity-[0.01] flex items-center justify-center"></div>
                    <div class="absolute inset-0 z-10 bg-white text-black rounded-full flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
                         <svg class="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                         </svg>
                         <span class="font-bold tracking-wide uppercase text-xs">Sign in with Google</span>
                    </div>
                </div>
                <p v-if="authStore.error" class="text-red-500 text-center mt-2 text-xs font-bold uppercase tracking-tight">{{ authStore.error }}</p>
                <p class="text-zinc-600 text-[11px] uppercase font-bold tracking-[0.2em] mt-4">By signing in, you agree to our protocol terms</p>
            </div>
        </div>

        <!-- Integrated 01 / Concept Section (At the bottom of first view) -->
        <div class="w-full max-w-5xl text-left border-t border-white/10 pt-16 pb-20 grid md:grid-cols-2 gap-16 items-start mt-auto">
            <div class="space-y-6">
                <h2 class="text-xs font-black uppercase tracking-[0.4em] text-yellow-500">01 / Logic</h2>
                <h3 class="text-4xl font-black uppercase italic leading-tight">Professional <br/> 21 Simulation.</h3>
                <p class="text-zinc-400 text-sm leading-relaxed font-light">
                    CRYPTO21 provides a high-fidelity environment for mastering blackjack strategy. Our engine strictly follows standard Las Vegas rules to ensure a mathematically accurate training environment.
                </p>
                <div class="pt-6 grid grid-cols-2 gap-8 border-t border-white/10">
                    <div>
                        <h4 class="text-xs font-black uppercase text-zinc-500 mb-1">RNG Protocol</h4>
                        <p class="text-xs text-zinc-400 italic">True Random Generation</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-black uppercase text-zinc-500 mb-1">Standards</h4>
                        <p class="text-xs text-zinc-400 italic">3:2 Blackjack Payout</p>
                    </div>
                </div>
            </div>
            <div class="bg-zinc-900/30 p-10 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
                <div class="absolute -top-10 -right-10 text-[120px] font-black opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">21</div>
                <h4 class="text-sm font-black uppercase mb-4 tracking-widest text-zinc-300">System Integrity</h4>
                <p class="text-xs text-zinc-500 leading-relaxed">Providing a transparent, non-wagering platform for the mastery of card game logic and statistical analysis since 2026.</p>
            </div>
        </div>
    </main>

    <!-- Detailed Info Layer -->
    <div id="seo-content" class="bg-[#050505] border-t border-white/5">
        <section class="max-w-5xl mx-auto px-6 py-20 border-b border-white/5">
            <h2 class="text-sm font-black uppercase tracking-[0.4em] text-zinc-500 mb-12 text-center uppercase">02 / Mission Parameters</h2>
            <div class="grid md:grid-cols-3 gap-16 text-center">
                <div class="p-4">
                    <h4 class="text-white font-black uppercase text-xs tracking-widest mb-4">Ranking</h4>
                    <p class="text-xs text-zinc-500 leading-relaxed">Strategic performance benchmarked against global standards.</p>
                </div>
                <div class="p-4">
                    <h4 class="text-white font-black uppercase text-xs tracking-widest mb-4">Progression</h4>
                    <p class="text-xs text-zinc-500 leading-relaxed">Earn experience points to unlock exclusive table access.</p>
                </div>
                <div class="p-4">
                    <h4 class="text-white font-black uppercase text-xs tracking-widest mb-4">Security</h4>
                    <p class="text-xs text-zinc-500 leading-relaxed">Google Authentication keeps your protocol data private.</p>
                </div>
            </div>
        </section>
        
        <!-- Strategy Intelligence (03) - HIGH VALUE FOR ADSENSE REVIEW -->
        <section class="max-w-5xl mx-auto px-6 py-20 border-t border-white/5">
            <h2 class="text-sm font-black uppercase tracking-[0.4em] text-yellow-500 mb-12 text-left">03 / Strategy Manual</h2>
            <div class="grid md:grid-cols-2 gap-20">
                <div class="space-y-12">
                    <div class="group">
                        <h4 class="text-white font-bold uppercase text-sm mb-4 tracking-widest border-l-2 border-yellow-500 pl-4">The Basic Protocol</h4>
                        <p class="text-xs text-zinc-500 leading-relaxed font-light">
                            To ensure optimal performance within the CRYPTO21 simulation, users are encouraged to study the mathematical Basic Strategy. This protocol dictates the statistically correct move for every possible hand combination against the dealer's visible card.
                        </p>
                    </div>
                    <div class="group">
                        <h4 class="text-white font-bold uppercase text-sm mb-4 tracking-widest border-l-2 border-yellow-500 pl-4">Hit vs Stand Logic</h4>
                        <p class="text-xs text-zinc-500 leading-relaxed font-light">
                            The engine utilizes a standard 6-deck shoe. Under these parameters, the protocol suggests standing on hard totals of 12-16 against a dealer's 2-6, and hitting until 17 when the dealer shows a 7-Ace.
                        </p>
                    </div>
                </div>
                <div class="space-y-12">
                    <div class="group">
                        <h4 class="text-white font-bold uppercase text-sm mb-4 tracking-widest border-l-2 border-yellow-500 pl-4">Soft 17 Interaction</h4>
                        <p class="text-xs text-zinc-500 leading-relaxed font-light">
                            Dealer hits on Soft 17 (H17). This specific ruleset requires a more aggressive double-down strategy on soft hands (Ace-low cards) to maintain a competitive equity edge in the global rankings.
                        </p>
                    </div>
                    <div class="p-8 bg-zinc-900/30 rounded-3xl border border-white/5 italic">
                        <p class="text-[10px] text-zinc-600 leading-loose">
                            PROTOCOL NOTICE: Educational content provided for simulation mastery. CRYPTO21 does not facilitate real-money transactions. All outcomes are limited to virtual experience points.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <footer class="bg-black py-40 border-t border-white/10">
            <div class="max-w-4xl mx-auto px-6 flex flex-col items-center">
                <nav class="flex gap-10 mb-20 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 border-b border-white/5 pb-10">
                    <button @click="isTermsModalOpen = true" class="hover:text-white transition-colors cursor-pointer uppercase">Terms of Service</button>
                    <button @click="isPrivacyModalOpen = true" class="hover:text-white transition-colors cursor-pointer uppercase">Privacy Policy</button>
                    <a href="mailto:support@casinohome.cc" class="hover:text-white transition-colors uppercase">Support Intel</a>
                </nav>
                <div class="text-xs text-zinc-800 text-center uppercase tracking-[0.4em] leading-loose">
                    Social Gaming Simulation. Virtual chips carry no monetary value. Produced by CasinoHome.cc Group. &copy; 2026.
                </div>
            </div>
        </footer>
    </div>

    <!-- Modals -->
    <Transition name="fade">
        <div v-if="isTermsModalOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="isTermsModalOpen = false"></div>
            <div class="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
                <h3 class="text-2xl font-black italic uppercase mb-8 tracking-tighter">Terms of Protocol</h3>
                <div class="text-zinc-400 text-sm space-y-6 mb-12 leading-relaxed">
                    <p>1. <strong>Virtual Economy:</strong> CRYPTO21 operates as a social simulation. Chips have NO financial value.</p>
                    <p>2. <strong>Usage:</strong> Users must follow ethical strategy standards. Automation is strictly prohibited.</p>
                    <p>3. <strong>Data:</strong> Progress data is stored to enhance the simulation experience.</p>
                </div>
                <button @click="isTermsModalOpen = false" class="w-full py-5 bg-white text-black font-black uppercase text-xs rounded-full hover:bg-zinc-200 transition-colors">Acknowledge</button>
            </div>
        </div>
    </Transition>

    <Transition name="fade">
        <div v-if="isPrivacyModalOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="isPrivacyModalOpen = false"></div>
            <div class="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
                <h3 class="text-2xl font-black italic uppercase mb-8 tracking-tighter">Identity Policy</h3>
                <div class="text-zinc-400 text-sm space-y-6 mb-12 leading-relaxed">
                    <p>We leverage Google Sign-In for secure access. Only essential profile markers are retained for mission persistence.</p>
                    <p>AdSense cookies may be used for personalized advertising delivery.</p>
                </div>
                <button @click="isPrivacyModalOpen = false" class="w-full py-5 bg-white text-black font-black uppercase text-xs rounded-full hover:bg-zinc-200 transition-colors">Close</button>
            </div>
        </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(20px);
}
</style>
