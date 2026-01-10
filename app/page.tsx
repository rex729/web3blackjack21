import Link from "next/link";
import { Club, Diamond, Heart, Spade } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
      <div className="flex gap-4 mb-8 text-6xl animate-bounce">
        <Spade fill="white" />
        <Heart className="text-red-600" fill="currentColor" />
        <Club fill="white" />
        <Diamond className="text-red-600" fill="currentColor" />
      </div>

      <h1 className="text-6xl font-black mb-4 tracking-tighter">
        CRYPTO<span className="text-yellow-500">21</span>
      </h1>

      <p className="text-xl text-zinc-500 mb-12 tracking-widest uppercase">
        Web3 Blackjack Protocol
      </p>

      <Link
        href="/game"
        className="px-12 py-4 bg-white text-black font-black text-2xl uppercase tracking-widest rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl hover:shadow-white/20"
      >
        Enter Table
      </Link>
    </div>
  );
}
