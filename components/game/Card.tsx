"use client";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Suit, CardValue, Card as CardType } from "@/store/useGameStore";
import { Club, Diamond, Heart, Spade } from "lucide-react";

interface CardProps {
    card: CardType;
    index?: number;
}

const SuitIcon = ({ suit }: { suit: Suit }) => {
    switch (suit) {
        case "spades": return <Spade className="w-4 h-4 text-black fill-current" />;
        case "hearts": return <Heart className="w-4 h-4 text-red-600 fill-current" />;
        case "diamonds": return <Diamond className="w-4 h-4 text-red-600 fill-current" />;
        case "clubs": return <Club className="w-4 h-4 text-black fill-current" />;
    }
};

export function Card({ card, index = 0 }: CardProps) {
    if (card.hidden) {
        return (
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative w-24 h-36 bg-blue-800 rounded-lg shadow-xl border-2 border-white/20 flex items-center justify-center pattern-grid"
            >
                <div className="w-20 h-32 border-2 border-white/10 rounded-md bg-white/5" />
            </motion.div>
        );
    }

    const isRed = card.suit === "hearts" || card.suit === "diamonds";

    return (
        <motion.div
            initial={{ y: -50, opacity: 0, rotateY: 90 }}
            animate={{ y: 0, opacity: 1, rotateY: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative w-24 h-36 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col justify-between p-2 select-none"
        >
            {/* Top Left */}
            <div className={clsx("flex flex-col items-center", isRed ? "text-red-600" : "text-black")}>
                <span className="font-bold text-lg leading-none">{card.value}</span>
                <SuitIcon suit={card.suit} />
            </div>

            {/* Center Big Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                {card.suit === "spades" && <Spade className="w-20 h-20 text-black fill-current" />}
                {card.suit === "hearts" && <Heart className="w-20 h-20 text-red-600 fill-current" />}
                {card.suit === "diamonds" && <Diamond className="w-20 h-20 text-red-600 fill-current" />}
                {card.suit === "clubs" && <Club className="w-20 h-20 text-black fill-current" />}
            </div>

            {/* Bottom Right (Rotated) */}
            <div className={clsx("flex flex-col items-center rotate-180", isRed ? "text-red-600" : "text-black")}>
                <span className="font-bold text-lg leading-none">{card.value}</span>
                <SuitIcon suit={card.suit} />
            </div>
        </motion.div>
    );
}
