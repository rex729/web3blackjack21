"use client";
import { clsx } from "clsx";

interface ChipProps {
    amount: number;
    onClick?: () => void;
    active?: boolean;
}

export function Chip({ amount, onClick, active }: ChipProps) {
    const getColor = (val: number) => {
        if (val >= 500) return "bg-purple-600 border-purple-400 text-purple-100";
        if (val >= 100) return "bg-black border-gray-600 text-white";
        if (val >= 25) return "bg-green-600 border-green-400 text-green-100";
        if (val >= 5) return "bg-red-600 border-red-400 text-red-100";
        return "bg-white border-gray-400 text-black";
    };

    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-16 h-16 rounded-full border-4 shadow-lg flex items-center justify-center font-bold text-lg transition-transform",
                getColor(amount),
                active ? "scale-110 ring-4 ring-yellow-400 ring-offset-2 ring-offset-green-900" : "hover:scale-105"
            )}
        >
            {amount}
        </button>
    );
}
