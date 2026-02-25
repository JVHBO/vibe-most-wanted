"use client";

import { AudioManager } from "@/lib/audio-manager";

interface ChainToggleProps {
  chain: "base" | "arbitrum";
  onChange: (chain: "base" | "arbitrum") => void;
}

export function ChainToggle({ chain, onChange }: ChainToggleProps) {
  return (
    <div className="flex gap-1 bg-black/60 p-1 rounded-lg">
      <button
        onClick={() => { AudioManager.buttonClick(); onChange("base"); }}
        onMouseEnter={() => AudioManager.buttonHover()}
        className={`px-3 py-1 rounded font-bold text-xs transition ${chain === "base" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"}`}
      >BASE</button>
      <button
        onClick={() => { AudioManager.buttonClick(); onChange("arbitrum"); }}
        onMouseEnter={() => AudioManager.buttonHover()}
        className={`px-3 py-1 rounded font-bold text-xs transition ${chain === "arbitrum" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"}`}
      >ARB</button>
    </div>
  );
}
