"use client";
import { useGameStore } from "@/store/useGameStore";
import { clsx } from "clsx";

export function Controls() {
    const { status, hit, stand, resetGame, startGame, placeBet, currentBet, balance, message } = useGameStore();

    if (status === "betting" || status === "idle") {
        return (
            <div className="flex flex-col items-center gap-6">
                <div className="text-xl text-white font-mono animate-pulse">{message || "Place your bet"}</div>

                {/* Chip Selector */}
                <div className="flex gap-4">
                    {[5, 25, 100, 500].map(amt => (
                        <button
                            key={amt}
                            onClick={() => placeBet(currentBet + amt)}
                            disabled={currentBet + amt > balance}
                            className={clsx(
                                "w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale",
                                amt === 5 ? "bg-red-600 border-red-400" :
                                    amt === 25 ? "bg-green-600 border-green-400" :
                                        amt === 100 ? "bg-black border-slate-600 text-white" :
                                            "bg-purple-600 border-purple-400 text-white"
                            )}
                        >
                            {amt}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => placeBet(0)}
                        className="px-4 py-2 text-white/50 hover:text-white uppercase text-xs font-bold tracking-widest"
                    >
                        Clear Bet
                    </button>
                    <div className="text-2xl font-black text-white bg-black/50 px-6 py-3 rounded-lg border border-white/20">
                        {currentBet}
                    </div>
                </div>

                <button
                    onClick={startGame}
                    disabled={currentBet === 0}
                    className="px-12 py-4 bg-yellow-500 text-yellow-950 font-black text-2xl uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(234,179,8,0.6)] hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                    DEAL
                </button>
            </div>
        );
    }

    if (status === "playing") {
        return (
            <div className="flex gap-4">
                <button
                    onClick={hit}
                    className="w-32 h-32 rounded-full bg-green-500 border-b-8 border-green-700 text-white font-black text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
                >
                    HIT
                </button>
                <button
                    onClick={stand}
                    className="w-32 h-32 rounded-full bg-red-500 border-b-8 border-red-700 text-white font-black text-2xl uppercase tracking-widest shadow-xl hover:translate-y-1 hover:border-b-4 active:translate-y-2 active:border-b-0 transition-all"
                >
                    STAND
                </button>
            </div>
        );
    }

    // Result State (Won / Lost / Push)
    return (
        <div className="flex flex-col items-center gap-6">
            <h2 className="text-4xl font-black text-white drop-shadow-lg">{message}</h2>
            <button
                onClick={resetGame}
                className="px-8 py-3 bg-white text-black font-bold text-xl uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors"
            >
                Play Again
            </button>
        </div>
    );
}
