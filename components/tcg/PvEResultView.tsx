import React from "react";
import type { PvEGameState } from "@/lib/tcg/types";
import { stopBgm } from "@/lib/tcg/audio";

const BATTLE_AURA_REWARD = 85;

interface PvEResultViewProps {
  pveGameState: PvEGameState;
  showDefeatBait: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  t: (key: string) => string;
}

export function PvEResultView({ pveGameState, showDefeatBait, onPlayAgain, onBackToLobby, t }: PvEResultViewProps) {
  const winner = pveGameState.winner;
  const isWinner = winner === "player";
  const isDraw = winner === "tie";

  // Calculate lanes won
  const lanesWon = pveGameState.lanes.filter((lane: any) => lane.playerPower > lane.cpuPower).length;
  const lanesLost = pveGameState.lanes.filter((lane: any) => lane.cpuPower > lane.playerPower).length;
  const lanesTied = pveGameState.lanes.filter((lane: any) => lane.playerPower === lane.cpuPower).length;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDraw
        ? "bg-gradient-to-b from-gray-900 via-gray-800 to-black"
        : isWinner
          ? "bg-gradient-to-b from-yellow-900/30 via-gray-900 to-black"
          : "bg-gradient-to-b from-red-900/30 via-gray-900 to-black"
    }`}>
      <div className="text-center max-w-md w-full">
        {/* PvE Badge */}
        <span className="text-xs text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          {t('tcgCpuMode')}
        </span>

        {/* Result Icon & Title - OR Bait Video on defeat */}
        <div className="my-6">
          {showDefeatBait && !isWinner && !isDraw ? (
            <video
              autoPlay
              loop
              playsInline
              className="w-48 h-48 mx-auto mb-4 rounded-xl object-cover"
              ref={(el) => {
                if (el) {
                  el.volume = 0.7;
                  el.play().catch(() => {
                    el.muted = true;
                    el.play().catch(() => {});
                  });
                }
              }}
            >
              <source src="/sounds/defeat-bait.mp4" type="video/mp4" />
            </video>
          ) : isWinner ? (
            <img
              src="/images/angry-angry-kid.png"
              alt="Victory"
              className="w-32 h-32 mx-auto mb-4 animate-bounce object-contain"
            />
          ) : (
            <div className={`text-6xl mb-4`}>
              {isDraw ? "\uD83E\uDD1D" : "\uD83D\uDC94"}
            </div>
          )}
          {!showDefeatBait && (
            <>
              <h1
                className={`text-5xl font-black mb-2 ${
                  isDraw ? "text-gray-400" : isWinner ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "text-red-400"
                }`}
              >
                {isDraw ? t('tcgDraw') : isWinner ? t('tcgVictory') : t('tcgDefeat')}
              </h1>
              <p className="text-gray-500 text-sm">
                {isDraw ? "Both sides are equal!" : isWinner ? "You outsmarted the CPU!" : "The CPU was too strong..."}
              </p>
            </>
          )}
        </div>

        {/* Lane Results */}
        <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lane Breakdown</p>
          <div className="flex gap-3 justify-center">
            {pveGameState.lanes.map((lane: any, idx: number) => {
              const playerWon = lane.playerPower > lane.cpuPower;
              const isTie = lane.playerPower === lane.cpuPower;

              return (
                <div
                  key={idx}
                  className={`flex-1 bg-gray-900/50 border-2 rounded-xl p-3 transition-all ${
                    playerWon
                      ? "border-green-500/70 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                      : isTie
                        ? "border-gray-600"
                        : "border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  }`}
                >
                  <div className={`text-lg mb-1 ${
                    playerWon ? "text-green-400" : isTie ? "text-gray-400" : "text-red-400"
                  }`}>
                    {playerWon ? "\u2713" : isTie ? "=" : "\u2717"}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{lane.name || `${t('tcgLane')} ${idx + 1}`}</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-bold ${playerWon ? "text-green-400" : "text-white"}`}>
                      {lane.playerPower}
                    </span>
                    <span className="text-gray-600 text-xs">vs</span>
                    <span className={`text-lg font-bold ${!playerWon && !isTie ? "text-red-400" : "text-white"}`}>
                      {lane.cpuPower}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-gray-700/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{lanesWon}</p>
              <p className="text-xs text-gray-500">{t('tcgWinning')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{lanesTied}</p>
              <p className="text-xs text-gray-500">{t('tcgTied')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{lanesLost}</p>
              <p className="text-xs text-gray-500">{t('tcgLosing')}</p>
            </div>
          </div>
        </div>

        {/* AURA Reward Display */}
        {isWinner && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30">
            <p className="text-yellow-400 font-bold text-lg">
              {pveGameState.auraRewarded ? (
                <>+{BATTLE_AURA_REWARD} AURA</>
              ) : (
                <span className="text-gray-400 text-sm">No AURA reward (daily limit reached)</span>
              )}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className={`font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 ${
              isWinner
                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg shadow-green-500/30"
                : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/30"
            }`}
          >
            {t('tcgPlayAgain')}
          </button>
          <button
            onClick={onBackToLobby}
            className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            {t('tcgBackToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
