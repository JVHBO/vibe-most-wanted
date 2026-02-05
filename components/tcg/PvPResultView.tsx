import React from "react";
import { stopBgm } from "@/lib/tcg/audio";

interface PvPResultViewProps {
  currentMatch: any;
  address: string | undefined;
  showDefeatBait: boolean;
  onBackToLobby: () => void;
  t: (key: string) => string;
}

export function PvPResultView({ currentMatch, address, showDefeatBait, onBackToLobby, t }: PvPResultViewProps) {
  const isWinner = currentMatch.winnerId === address?.toLowerCase();
  const isDraw = !currentMatch.winnerId;
  const isPlayer1 = currentMatch.player1Address === address?.toLowerCase();
  const pvpOpponentName = isPlayer1 ? currentMatch.player2Username : currentMatch.player1Username;
  const pvpIsCpu = (currentMatch as any).isCpuOpponent;
  const pvpOpponentDisplay = pvpOpponentName ? (pvpIsCpu ? `${pvpOpponentName} (CPU)` : pvpOpponentName) : "Opponent";

  // Calculate lanes won
  const lanesWon = currentMatch.laneResults?.filter((lane: any) =>
    lane.winner === (isPlayer1 ? "player1" : "player2")
  ).length || 0;
  const lanesLost = currentMatch.laneResults?.filter((lane: any) =>
    lane.winner === (isPlayer1 ? "player2" : "player1")
  ).length || 0;
  const lanesTied = currentMatch.laneResults?.filter((lane: any) =>
    lane.winner === "tie"
  ).length || 0;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDraw
        ? "bg-gradient-to-b from-gray-900 via-gray-800 to-black"
        : isWinner
          ? "bg-gradient-to-b from-yellow-900/30 via-gray-900 to-black"
          : "bg-gradient-to-b from-red-900/30 via-gray-900 to-black"
    }`}>
      <div className="text-center max-w-md w-full">
        {/* PvP Badge */}
        <span className="text-xs text-purple-400 bg-purple-900/50 px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
          {(currentMatch as any)?.isStakedMatch ? "Staked Battle" : "PvP Battle"}
        </span>

        {/* Staked Match Reward Info */}
        {(currentMatch as any)?.isStakedMatch && (currentMatch as any)?.stakeAmount > 0 && (
          <div className={`mb-2 px-4 py-2 rounded-lg border ${isWinner ? "bg-green-900/30 border-green-500/40" : "bg-red-900/30 border-red-500/40"}`}>
            <p className={`text-sm font-bold ${isWinner ? "text-green-400" : "text-red-400"}`}>
              {isWinner
                ? `+${((currentMatch as any).poolTier || Math.floor((currentMatch as any).stakeAmount * 10)).toLocaleString()} VBMS`
                : `-${(currentMatch as any).stakeAmount.toLocaleString()} VBMS`
              }
            </p>
            <p className="text-[9px] text-green-400/60">
              {isWinner ? "Pool reward added to your balance." : "Attack fee lost."}
            </p>
          </div>
        )}

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
                vs <span className="text-vintage-burnt-gold max-w-[150px] truncate inline-block align-bottom">{pvpOpponentDisplay}</span>
              </p>
            </>
          )}
        </div>

        {/* Lane Results */}
        {currentMatch.laneResults && (
          <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lane Breakdown</p>
            <div className="flex gap-3 justify-center">
              {currentMatch.laneResults.map((lane: any, idx: number) => {
                const playerWon = lane.winner === (isPlayer1 ? "player1" : "player2");
                const isTie = lane.winner === "tie";
                const yourPower = isPlayer1 ? lane.player1FinalPower : lane.player2FinalPower;
                const enemyPower = isPlayer1 ? lane.player2FinalPower : lane.player1FinalPower;

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
                    <p className="text-xs text-gray-500 mb-1">{t('tcgLane')} {idx + 1}</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-lg font-bold ${playerWon ? "text-green-400" : "text-white"}`}>
                        {yourPower}
                      </span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className={`text-lg font-bold ${!playerWon && !isTie ? "text-red-400" : "text-white"}`}>
                        {enemyPower}
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
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onBackToLobby}
            className={`font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 ${
              isWinner
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/30"
                : "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white"
            }`}
          >
            {t('tcgBackToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
