"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";

interface WantedCastProps {
  soundEnabled: boolean;
}

// Megaphone icon for casting
const MegaphoneIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h3l5 4V4l-5 4zm9.5 4c0 1.71-.96 3.26-2.5 4V8c1.54.74 2.5 2.29 2.5 4z" />
  </svg>
);

export function WantedCast({ soundEnabled }: WantedCastProps) {
  return (
    <Link
      href="/quests/cast"
      onClick={() => soundEnabled && AudioManager.buttonClick()}
      className="block bg-vintage-charcoal/80 backdrop-blur-sm rounded-xl border border-vintage-gold/30 px-4 py-3 hover:border-vintage-gold/50 hover:bg-vintage-charcoal transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-vintage-gold">
            <MegaphoneIcon />
          </div>
          <div>
            <span className="text-vintage-gold font-display font-bold text-sm">
              WANTED CAST
            </span>
            <p className="text-vintage-burnt-gold text-[10px] font-modern">
              Earn coins by interacting
            </p>
          </div>
        </div>
        <svg className="w-5 h-5 text-vintage-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
