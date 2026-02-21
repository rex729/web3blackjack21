<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../store/auth';
import { useLobbyStore } from '../store/lobby';
import { Trophy, Globe, ShoppingCart, Gift, UserCircle, Hexagon, Lock } from 'lucide-vue-next';
import LeaderboardModal from './LeaderboardModal.vue';

const authStore = useAuthStore();
const lobbyStore = useLobbyStore();

const showLeaderboard = ref(false);

// 顯示用的餘額 (用於數字滾動動畫)
const displayedBalance = ref(authStore.user?.balance ?? 0);
const isBalanceAnimating = ref(false);

// 監聽實際餘額變化，執行滾動動畫
watch(() => authStore.user?.balance, (newVal, oldVal) => {
    if (newVal === undefined) return;
    if (oldVal === undefined) {
        displayedBalance.value = newVal;
        return;
    }

    // 當數值「完全沒有變」（例如輸了或打平），強制依然跳動一次
    if (newVal === oldVal && oldVal !== undefined) {
        isBalanceAnimating.value = true;
        setTimeout(() => { isBalanceAnimating.value = false; }, 300);
        return;
    }

    // 觸發縮放動畫
    isBalanceAnimating.value = true;
    setTimeout(() => { isBalanceAnimating.value = false; }, 300);

    const start = displayedBalance.value;
    const end = newVal;
    const duration = 1200; // 動畫時間 1.2秒
    const startTime = performance.now();

    const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            // Ease Out Quart function: 1 - pow(1 - x, 4)
            const progress = 1 - Math.pow(1 - elapsed / duration, 4);
            displayedBalance.value = Math.floor(start + (end - start) * progress);
            requestAnimationFrame(animate);
        } else {
            displayedBalance.value = end;
        }
    };
    requestAnimationFrame(animate);
}, { immediate: true });

// 每次進入大廳時，設定 7秒延遲抓取最新餘額
// 這是為了配合後端的 "5秒 Auto-Stand" 機制
onMounted(async () => {
    // 進入大廳時，無論餘額是否變化，先強制跳動一次
    isBalanceAnimating.value = true;
    setTimeout(() => { isBalanceAnimating.value = false; }, 300);

    // 先立即抓一次 (確保剛登入時資料正確)
    authStore.initialize(); 
    
    // 抓取關卡資訊
    await lobbyStore.fetchLevels();

    // 再設定延遲更新 (捕捉剛剛可能發生的代理人代打結算)
    setTimeout(async () => {
        console.log("[Lobby] Fetching latest balance after delay...");
        await authStore.initialize();
        // 如果這個時候從後端抓到的餘額真的變多了 (例如贏錢)，
        // 上面的 watch 邏輯會自動觸發真正的跳動動畫，不需要這裡假跳
    }, 7000);
});

// 處理點擊關卡
const handleLevelClick = (level: any) => {
    // 如果正在拖曳，不要觸發點擊事件
    if (isDragging.value) return;

    if (level.locked) return;
    
    const success = lobbyStore.enterLevel(level.id);
    if (!success) {
        alert("餘額不足 (Insufficient Funds)");
    }
};

// --- 滑鼠拖曳滾動 (Drag to Scroll) ---
const scrollContainer = ref<HTMLElement | null>(null);
const isDown = ref(false);
const isDragging = ref(false); // 用來區分是「點擊」還是「拖曳」
const startX = ref(0);
const scrollLeft = ref(0);

const startDragging = (e: MouseEvent) => {
    isDown.value = true;
    isDragging.value = false; // 按下時先假設不是拖曳
    if (!scrollContainer.value) return;
    startX.value = e.pageX - scrollContainer.value.offsetLeft;
    scrollLeft.value = scrollContainer.value.scrollLeft;
};

const stopDragging = () => {
    isDown.value = false;
    // 稍微延遲重置拖曳狀態，避免 mouseup 後立即觸發 click
    setTimeout(() => {
        isDragging.value = false;
    }, 50);
};

const onDrag = (e: MouseEvent) => {
    if (!isDown.value || !scrollContainer.value) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.value.offsetLeft;
    const walk = (x - startX.value) * 2; // 調整滾動速度 (x2)
    scrollContainer.value.scrollLeft = scrollLeft.value - walk;
    
    // 如果移動距離超過一定閾值，標記為拖曳中 (防止誤觸點擊)
    if (Math.abs(walk) > 5) {
        isDragging.value = true;
    }
};
</script>

<template>
    <div class="flex flex-col h-screen w-full bg-[#022c22] text-white overflow-hidden relative font-sans">
        <!-- 經典賭場絨布背景 (Classic Casino Felt Background) -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <!-- 森林綠輻射漸層 -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,_#064e3b_0%,_#011a13_100%)]"></div>
            
            <!-- 絨布紋理疊加 (Felt Texture Overlay) -->
            <div class="absolute inset-0 opacity-[0.25] bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
            
            <!-- 深度暗角 (Deep Vignette) -->
            <div class="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]"></div>
            
            <!-- 微弱的灰塵/火花粒子感 (Subtle Particles for Atmosphere) -->
            <div class="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        </div>
        <!-- 頂部資訊欄 (Top Bar) -->
        <div class="h-20 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20 overflow-x-auto scrollbar-hide">
            <!-- 左側：使用者資訊 -->
            <div class="flex items-center gap-3 flex-shrink-0">
                <div class="relative group cursor-pointer" @click="authStore.logout()">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 p-[2px]">
                        <div class="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                             <!-- 如果有頭像則顯示，否則顯示預設圖標 -->
                        <img v-if="authStore.user?.image" :src="authStore.user.image" class="w-full h-full object-cover" />
                        <UserCircle v-else class="w-8 h-8 text-zinc-400" />
                        </div>
                    </div>
                    <!-- 等級徽章 -->
                    <div class="absolute -top-1 -right-1 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black">
                        LV.{{ authStore.currentLevel }}
                    </div>
                </div>
                <div class="flex flex-col w-24">
                    <span class="font-bold text-lg leading-tight truncate">{{ authStore.user?.name || 'Player' }}</span>
                    <!-- 經驗條 -->
                    <div class="w-20 h-1.5 bg-zinc-700 rounded-full mt-1 mb-1 overflow-hidden relative" :title="`XP: ${authStore.currentLevelProgress} / 1000`">
                        <div class="h-full bg-blue-500 transition-all duration-500" :style="{ width: `${(authStore.currentLevelProgress / 1000) * 100}%` }"></div>
                    </div>
                    <span class="text-xs text-zinc-400 font-mono">{{ authStore.currentLevelProgress }}/{{ authStore.nextLevelThreshold }}</span>
                </div>
            </div>

            <!-- 右側：貨幣資訊 -->
            <div class="flex items-center gap-4 flex-shrink-0">
                <!-- 籌碼 -->
                <div class="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                    <div class="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs">$</div>
                    <span class="font-mono text-yellow-500 font-bold transition-all duration-300" :class="{'scale-125 text-white': isBalanceAnimating}">{{ displayedBalance.toLocaleString() }}</span>
                    <button class="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-green-500">+</button>
                </div>
                <!-- 綠鈔 (Gems) -->
                <div class="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                    <Hexagon class="w-4 h-4 text-green-400 fill-current" />
                    <span class="font-mono text-green-400 font-bold">120</span>
                    <button class="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-green-500">+</button>
                </div>
            </div>
        </div>


        <!-- 內容區域：世界巡迴地圖 -->
        <div 
            ref="scrollContainer"
            class="flex-1 overflow-x-auto overflow-y-hidden relative z-10 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            @mousedown="startDragging"
            @mouseleave="stopDragging"
            @mouseup="stopDragging"
            @mousemove="onDrag"
        >
            


            <!-- 加上 flex-nowrap 確保不換行 -->
            <div class="h-full flex flex-nowrap items-center px-12 gap-8 w-max min-w-full justify-center">
                
                <!-- 關卡卡片 (Morandi Solid Flat Style) -->
                <div v-for="level in lobbyStore.levels" :key="level.id" 
                    @click="handleLevelClick(level)"
                    class="relative shrink-0 w-[300px] h-[420px] rounded-3xl transition-all duration-300 transform hover:-translate-y-4 hover:shadow-2xl cursor-pointer flex flex-col group overflow-hidden border-2 border-white/20 shadow-xl"
                    :style="{ 
                        backgroundColor: level.color
                    }"
                    :class="[level.locked ? 'opacity-60 grayscale' : '']"
                >
                    <!-- 卡片背景圖 (簡易模擬) -->
                    <div class="absolute top-0 right-0 p-4 opacity-10 text-9xl group-hover:scale-110 transition-transform duration-700">
                        {{ level.image }}
                    </div>

                    <!-- 卡片內容 -->
                    <div class="relative z-10 flex flex-col h-full p-6 text-white">
                        <!-- Header -->
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex gap-2 flex-wrap">
                                <!-- Dealer Rule Badge (H17/S17) -->
                                <div class="px-2 py-1 rounded-full text-[10px] font-black tracking-tighter border italic shrink-0"
                                    :class="[
                                        !level.hit17 
                                            ? 'bg-black/40 text-green-300 border-green-500/30' 
                                            : 'bg-black/40 text-orange-200 border-orange-500/30'
                                    ]"
                                >
                                    {{ level.hit17 ? 'H17' : 'S17' }}
                                </div>
                                <!-- XP Badge -->
                                <div v-if="level.xpMultiplier && level.xpMultiplier > 1" class="px-2 py-1 rounded-full text-[10px] font-black tracking-tighter border border-white/20 bg-black/40 text-blue-200 italic shrink-0">
                                    {{ level.xpMultiplier }}x XP
                                </div>
                                <!-- 5-Card Charlie Badge -->
                                <div v-if="level.fiveCardCharlie" class="px-2 py-1 rounded-full text-[10px] font-black tracking-tighter border border-white/20 bg-black/40 text-purple-200 flex items-center gap-1 shrink-0">
                                    <span>5★</span>
                                </div>
                            </div>
                            <!-- MapPin removed -->
                            <Lock v-if="level.locked" class="w-5 h-5 text-white/50 shrink-0" />
                        </div>
                        
                        <!-- Title -->
                        <div class="mb-auto">
                            <h2 class="text-3xl font-black italic uppercase leading-none mb-1">{{ level.name }}</h2>
                            <p class="text-sm font-medium text-white/70">{{ level.subtitle }}</p>
                        </div>

                        <!-- Stats -->
                        <div class="space-y-3 mb-6">
                            <div class="flex justify-between items-center border-b border-white/10 pb-2 relative">
                                <span class="text-xs uppercase text-white/50 font-bold tracking-wider">Buy In</span>
                                <span class="text-xl font-bold font-mono" :class="lobbyStore.canEnter(level.id) ? 'text-white' : 'text-red-500'">
                                    {{ typeof level.buyIn === 'number' && level.buyIn > 0 ? '$' + level.buyIn.toLocaleString() : 'FREE' }}
                                </span>
                            </div>
                            <div class="flex justify-between items-center border-b border-white/10 pb-2">
                                <span class="text-xs uppercase text-white/50 font-bold tracking-wider">Prize</span>
                                <span class="text-xl font-bold text-yellow-400 font-mono">{{ level.prize }}</span>
                            </div>
                        </div>

                        <!-- Play Button -->
                        <button class="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            :class="[
                                level.locked ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                                lobbyStore.canEnter(level.id) ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-red-900/50 text-red-200 cursor-not-allowed border border-red-500/30'
                            ]"
                        >
                            <span v-if="level.locked">Coming Soon</span>
                            <span v-else-if="level.minLevel && authStore.currentLevel < level.minLevel">Requres LV.{{ level.minLevel }}</span>
                            <span v-else-if="(authStore.user?.balance ?? 0) < level.buyIn">Need {{ level.buyIn > 0 ? '$' + level.buyIn.toLocaleString() : 'Free' }}</span>
                            <span v-else>Play Now</span>
                        </button>
                    </div>

                    <!-- Hover Effect: Highlight Border -->
                    <div class="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 transition-colors rounded-3xl pointer-events-none"></div>
                </div>

            </div>
        </div>

        <!-- 底部導航欄 (Bottom Navigation) -->
        <div class="h-24 bg-zinc-950 border-t border-white/10 flex justify-center items-center gap-12 z-20 pb-4">
            <button class="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors group">
                <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all">
                    <ShoppingCart class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider">Shop</span>
            </button>

            <button class="flex flex-col items-center gap-1 text-white group scale-110">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:translate-y-[-4px] transition-transform">
                    <Globe class="w-7 h-7" />
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">Play</span>
            </button>

             <button class="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors group relative">
                <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all">
                    <Gift class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider">Boxes</span>
                <!-- Notification Dot -->
                <span class="absolute top-0 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></span>
            </button>

            <button 
                @click="showLeaderboard = true"
                class="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors group"
            >
                <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all">
                    <Trophy class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider">Rank</span>
            </button>
        </div>

        <!-- Leaderboard Modal -->
        <LeaderboardModal :is-open="showLeaderboard" @close="showLeaderboard = false" />
    </div>
</template>

<style scoped>
/* 隱藏 Scrollbar 但保留滾動功能 */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
