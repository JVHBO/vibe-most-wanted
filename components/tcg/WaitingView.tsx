import React from "react";

interface WaitingViewProps {
  roomId?: string;
  onCancel: () => void;
  t: (key: string) => string;
}

export function WaitingView({ roomId, onCancel, t }: WaitingViewProps) {
  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

      {/* Subtle animated glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md w-full">
          {/* Header Badge */}
          <div className="mb-8">
            <span className="text-[10px] text-purple-300 bg-purple-900/40 border border-purple-500/30 px-4 py-1.5 rounded-full uppercase tracking-[0.25em] font-medium">PvP Battle</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-vintage-gold uppercase tracking-[0.2em] mb-2">{t('tcgWaitingOpponent')}</h1>
          <p className="text-vintage-burnt-gold/70 mb-8 text-sm tracking-wide">Share this code with your opponent</p>

          {/* Room Code Card */}
          <div className="bg-gradient-to-b from-vintage-charcoal/60 to-black/40 border border-vintage-gold/20 rounded-xl p-8 mb-8 relative overflow-hidden shadow-2xl shadow-black/50">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-vintage-gold/0 via-vintage-gold/10 to-vintage-gold/0 animate-pulse" />

            <p className="text-[9px] text-vintage-burnt-gold/50 mb-4 uppercase tracking-[0.3em]">{t('tcgRoomCode')}</p>
            <p className="text-5xl md:text-6xl font-mono font-black text-vintage-gold tracking-[0.4em] mb-6 relative drop-shadow-lg">
              {roomId || "..."}
            </p>

            {/* Copy button */}
            <button
              onClick={() => {
                if (roomId) {
                  navigator.clipboard.writeText(roomId);
                }
              }}
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-vintage-gold/80 via-yellow-500/80 to-vintage-gold/80 opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative z-10 block py-2.5 px-6 text-black font-black text-xs uppercase tracking-[0.2em]">
                Copy Code
              </span>
            </button>
          </div>

          {/* Waiting animation */}
          <div className="flex justify-center gap-3 mb-10">
            <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </div>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="group flex items-center gap-2 mx-auto text-red-400/70 hover:text-red-400 transition-colors text-[11px] uppercase tracking-[0.15em]"
          >
            <span className="text-red-500/50 group-hover:text-red-400 transition-colors">{"\u00D7"}</span>
            Cancel Match
          </button>
        </div>
      </div>
    </div>
  );
}
