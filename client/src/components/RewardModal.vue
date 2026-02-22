<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../store/auth';
import { X, PlayCircle, Loader2, Coins } from 'lucide-vue-next';

declare global {
  interface Window {
    googletag: any;
  }
}

// Access googletag safely for TS
const getGoogleTag = () => window.googletag || { cmd: [] };

const props = defineProps<{
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const authStore = useAuthStore();
const isPlayingAd = ref(false);

const handleClose = () => {
    if (isPlayingAd.value) return; // Prevent closing while ad is playing
    emit('update:show', false);
};

const playAd = async () => {
    if (isPlayingAd.value || !authStore.rewardStatus?.canClaim) return;
    
    isPlayingAd.value = true;
    let rewardGranted = false;

    // Use Google Publisher Tag for Rewarded Ads
    const googletag = getGoogleTag();
    if (googletag && googletag.apiReady) {
        googletag.cmd.push(() => {
            // Test ID for Rewarded Web Ads
            const adUnitPath = (import.meta as any).env?.VITE_GAM_REWARD_AD_UNIT || '/22639388115/rewarded_web_example';
            
            const rewardedSlot = googletag.defineOutOfPageSlot(adUnitPath, googletag.enums.OutOfPageFormat.REWARDED);
            
            if (rewardedSlot) {
                rewardedSlot.addService(googletag.pubads());
                
                // Event fired when the ad is closed
                googletag.pubads().addEventListener('rewardedSlotClosed', async (event: any) => {
                    console.log("[GPT] rewardedSlotClosed fired.", { rewardGranted });
                    if (event.slot === rewardedSlot) {
                        googletag.destroySlots([rewardedSlot]);
                        isPlayingAd.value = false;
                        
                        if (rewardGranted) {
                            // User watched the ad completely, claim reward!
                            console.log("[GPT] Claiming reward via API...");
                            const success = await authStore.claimReward();
                            console.log("[GPT] Claim reward API result:", success);
                            if (success) {
                                emit('update:show', false);
                            }
                        }
                    }
                });

                // Event fired when the user earns the reward
                googletag.pubads().addEventListener('rewardedSlotGranted', (event: any) => {
                    console.log("[GPT] rewardedSlotGranted fired! Player earned reward:", event.payload);
                    if (event.slot === rewardedSlot) {
                        rewardGranted = true;
                    }
                });

                // Event fired when the ad is ready to be displayed
                googletag.pubads().addEventListener('rewardedSlotReady', (event: any) => {
                    if (event.slot === rewardedSlot) {
                        event.makeRewardedVisible();
                    }
                });

                // Request the ad
                googletag.pubads().enableSingleRequest();
                googletag.enableServices();
                googletag.display(rewardedSlot);
            } else {
                // Fallback if slot creation fails (e.g. ad blocker)
                alert("Unable to load Ad. Please disable your Ad Blocker and try again.");
                isPlayingAd.value = false;
            }
        });
    } else {
        alert("Ad Service is currently unavailable. Please try again later.");
        isPlayingAd.value = false;
    }
};

const dontShowToday = ref(localStorage.getItem('last_auto_ad_date') === new Date().toDateString());

watch(dontShowToday, (val) => {
    if (val) {
        localStorage.setItem('last_auto_ad_date', new Date().toDateString());
    } else {
        localStorage.removeItem('last_auto_ad_date');
    }
});

const status = computed(() => authStore.rewardStatus);
</script>

<template>
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center pt-24 px-4 sm:pt-0 pb-16">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="handleClose"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            <!-- Header -->
            <div class="relative h-40 bg-gradient-to-br from-yellow-600 to-amber-900 shrink-0 overflow-hidden">
                <!-- Decorative background elements -->
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-30 mix-blend-screen"></div>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 text-white pointer-events-none">
                    <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 mb-3 border-2 border-yellow-200">
                        <Coins class="w-8 h-8 text-white" />
                    </div>
                </div>

                <button 
                    v-if="!isPlayingAd"
                    @click="handleClose"
                    class="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-20"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Body Area -->
            <div class="p-6 overflow-y-auto">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tight mb-2">Daily Reward</h2>
                    <p class="text-zinc-400 text-sm">Watch a short video to instantly claim <span class="text-yellow-400 font-bold">$10,000</span> chips!</p>
                </div>

                <div class="bg-black/30 rounded-2xl p-4 mb-6 border border-white/5 flex justify-between items-center">
                    <span class="text-zinc-400 text-sm font-medium">Claims Remaining Today</span>
                    <div class="flex items-center gap-2">
                        <span class="text-xl font-bold text-white tracking-widest">
                            {{ status ? status.maxRewards - status.adRewardCount : 0 }}<span class="text-zinc-500 text-sm">/{{ status?.maxRewards || 3 }}</span>
                        </span>
                    </div>
                </div>

                <!-- Ad Loading View -->
                <div v-if="isPlayingAd" class="w-full aspect-video bg-black rounded-xl border border-white/10 flex flex-col justify-center items-center text-center relative overflow-hidden mb-6">
                    <Loader2 class="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p class="text-zinc-400 text-sm animate-pulse">Loading Sponsor Message...</p>
                </div>

                <!-- Action Button -->
                <button 
                    v-if="!isPlayingAd"
                    @click="playAd"
                    :disabled="!status?.canClaim"
                    class="w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
                >
                    <PlayCircle class="w-6 h-6" />
                    {{ status?.canClaim ? 'Watch Ad to Claim' : 'Come back tomorrow!' }}
                </button>

                <!-- Checkbox for "Don't show today" -->
                <div v-if="!isPlayingAd" class="mt-4 flex items-center justify-center gap-2">
                    <input 
                        type="checkbox" 
                        id="dontShowToday" 
                        v-model="dontShowToday" 
                        class="w-4 h-4 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
                    />
                    <label for="dontShowToday" class="text-sm text-zinc-400 cursor-pointer select-none hover:text-white transition-colors">
                        今天不再主動跳出
                    </label>
                </div>
            </div>
        </div>
    </div>
</template>
