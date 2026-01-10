"use client";

import { useGameStore } from "@/store/useGameStore";
import { Hand } from "./Hand";
import { Controls } from "./Controls";
import { Wallet } from "lucide-react";

export function Board() {
    const { dealerHand, playerHand, balance, status } = useGameStore();

    // Quick Score
    const getScore = (hand: any[]) => {
        let score = 0;
        let aces = 0;
        hand.forEach(c => {
            if (c.hidden) return;
            if (c.value === 'A') { aces++; score += 11; }
            else if (['K', 'Q', 'J'].includes(c.value)) score += 10;
            else score += parseInt(c.value);
        });
        while (score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    };

    return (
        <div className="relative w-full h-screen bg-emerald-900 overflow-hidden flex flex-col">
            {/* Green Felt Texture Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none" />

            {/* HUD */}
            <div className="relative z-10 flex justify-between p-6">
                <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full text-white backdrop-blur-md border border-white/10">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono text-xs tracking-widest uppercase text-white/50">LIVE</span>
                </div>

                <div className="flex items-center gap-2 bg-black/80 px-6 py-3 rounded-full text-yellow-500 font-black text-xl border border-yellow-500/50 shadow-lg">
                    <Wallet className="w-5 h-5" />
                    ${balance}
                </div>
            </div>

            {/* Game Diameter */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-12 pb-24 max-w-5xl mx-auto w-full">

                {/* Dealer Area */}
                <div className="flex flex-col items-center gap-4">
                    <Hand cards={dealerHand} label="DEALER" score={status !== 'betting' && status !== 'idle' ? getScore(dealerHand) : undefined} />
                    <div className="text-white/30 font-black uppercase tracking-[0.2em] text-sm mt-2">Dealer Must Draw to 16, Stand on 17</div>
                </div>

                {/* Center Info / Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <div className="text-9xl font-black tracking-tighter text-black rotate-[-10deg]">
                        CRYPTO<br />21
                    </div>
                </div>

                {/* Player Area */}
                <div className="flex flex-col items-center gap-8 w-full">
                    <Hand cards={playerHand} label="PLAYER" score={playerHand.length > 0 ? getScore(playerHand) : undefined} />

                    {/* Controls */}
                    <Controls />
                </div>

            </div>
        </div>
    );
}
