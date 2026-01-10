"use client";
import { Card } from "./Card";
import { Card as CardType } from "@/store/useGameStore";
import { motion } from "framer-motion";

interface HandProps {
    cards: CardType[];
    score?: number;
    label?: string;
}

export function Hand({ cards, score, label }: HandProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            {/* Score Bubble */}
            {score !== undefined && (
                <div className="bg-black/50 backdrop-blur-md px-4 py-1 rounded-full text-white font-mono text-xl border border-white/10 shadow-lg">
                    {score}
                </div>
            )}

            {/* Cards Fan */}
            <div className="flex -space-x-12">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        className="relative"
                        style={{ zIndex: i }}
                    >
                        <Card card={card} index={i} />
                    </motion.div>
                ))}

                {/* Empty Placeholder if no cards */}
                {cards.length === 0 && (
                    <div className="w-24 h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20 font-bold uppercase tracking-widest text-xs">
                        {label || "Empty"}
                    </div>
                )}
            </div>
        </div>
    );
}
