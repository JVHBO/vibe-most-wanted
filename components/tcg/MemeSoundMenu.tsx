import React from "react";
import { playMemeSound } from "@/lib/tcg/audio";

interface MemeSoundMenuProps {
  show: boolean;
  onClose: () => void;
  onSurrender: () => void;
  t: (key: string) => string;
}

export function MemeSoundMenu({ show, onClose, onSurrender, t }: MemeSoundMenuProps) {
  if (!show) return null;

  return (
    <div className="absolute top-16 left-0 z-50 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
      style={{
        background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.98) 100%)",
        border: "2px solid",
        borderImage: "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
        boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
      }}
    >
      <div className="p-2 text-xs text-[#B8860B]" style={{ borderBottom: "1px solid rgba(184,134,11,0.3)" }}>
        {"\uD83D\uDD0A"} Meme Sounds
      </div>
      <button
        onClick={() => { playMemeSound("mechaArena"); onClose(); }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600 flex items-center gap-2"
      >
        {"\uD83E\uDD16"} Mecha Arena
      </button>
      <button
        onClick={() => { playMemeSound("ggez"); onClose(); }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-green-600 flex items-center gap-2"
      >
        {"\uD83D\uDE0E"} GG EZ
      </button>
      <button
        onClick={() => { playMemeSound("bruh"); onClose(); }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-orange-600 flex items-center gap-2"
      >
        {"\uD83D\uDE10"} Bruh
      </button>
      <button
        onClick={() => { playMemeSound("emotional"); onClose(); }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-red-600 flex items-center gap-2"
      >
        {"\uD83D\uDC94"} Emotional Damage
      </button>
      <button
        onClick={() => { playMemeSound("wow"); onClose(); }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-yellow-600 flex items-center gap-2"
      >
        {"\uD83E\uDD2F"} MLG Wow
      </button>
      <div style={{ borderTop: "1px solid rgba(184,134,11,0.3)" }}>
        <button
          onClick={onSurrender}
          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/50 flex items-center gap-2"
        >
          {"\uD83C\uDFF3\uFE0F"} {t('tcgSurrender')}
        </button>
      </div>
    </div>
  );
}
