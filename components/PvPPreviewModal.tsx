"use client";

import NextImage from "next/image";
import type { UserProfile } from "@/lib/convex-profile";

interface PvPPreviewData {
  playerAura: number;
  opponentAura: number;
  currentStreak: number;
  win: {
    totalReward: number;
    baseReward: number;
    rankingBonus: number;
    rankingMultiplier: number;
    firstPvpBonus: number;
    streakBonus: number;
    streakMessage: string;
  };
  loss: {
    totalPenalty: number;
    basePenalty: number;
    penaltyReduction: number;
    rankingMultiplier: number;
  };
}

interface PvPPreviewModalProps {
  showPvPPreview: boolean;
  pvpPreviewData: PvPPreviewData | null;
  targetPlayer: UserProfile | null;
  isAttacking: boolean;
  vbmsBlockchainBalance: string | null;
  soundEnabled: boolean;
  onConfirmAttack: () => void;
  onCancel: () => void;
}

export function PvPPreviewModal({
  showPvPPreview,
  pvpPreviewData,
  targetPlayer,
  isAttacking,
  vbmsBlockchainBalance,
  onConfirmAttack,
  onCancel,
}: PvPPreviewModalProps) {
  if (!showPvPPreview || !pvpPreviewData || !targetPlayer) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-vintage-charcoal via-vintage-black to-vintage-charcoal rounded-xl sm:rounded-2xl border-2 border-vintage-gold max-w-2xl w-full p-4 sm:p-6 md:p-8 shadow-2xl shadow-vintage-gold/30 my-4">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-1 sm:mb-2">
            ⚔️ BATTLE PREVIEW
          </h2>
          <p className="text-xs sm:text-sm text-vintage-burnt-gold font-modern">
            Potential gains and losses for this battle
          </p>
        </div>

        {/* Aura Comparison */}
        <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/30">
          <div className="text-center flex-1">
            <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">YOUR AURA</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400">{pvpPreviewData.playerAura}</p>
          </div>
          <div className="text-vintage-gold text-lg sm:text-xl md:text-2xl">VS</div>
          <div className="text-center flex-1">
            <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">OPPONENT AURA</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400">{pvpPreviewData.opponentAura}</p>
          </div>
        </div>

        {/* Win/Loss Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
          {/* Win Scenario */}
          <div className="bg-green-900/20 border-2 border-green-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <NextImage src="/images/icons/victory.svg" alt="Victory" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
              <h3 className="text-sm sm:text-base md:text-xl font-bold text-green-400 font-display">IF YOU WIN</h3>
            </div>

            <div className="mb-2 sm:mb-3 md:mb-4">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-300 mb-0.5 sm:mb-1">
                +{pvpPreviewData.win.totalReward}
              </p>
              <p className="text-xs sm:text-sm text-green-200/70">$TESTVBMS</p>
            </div>

            <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-green-100/80">
                <span>Base Reward:</span>
                <span className="font-mono">+{pvpPreviewData.win.baseReward}</span>
              </div>

              {pvpPreviewData.win.rankingBonus > 0 && (
                <div className="flex justify-between text-yellow-300 font-medium">
                  <span>⭐ Ranking Bonus ({pvpPreviewData.win.rankingMultiplier.toFixed(1)}x):</span>
                  <span className="font-mono">+{pvpPreviewData.win.rankingBonus}</span>
                </div>
              )}

              {pvpPreviewData.win.firstPvpBonus > 0 && (
                <div className="flex justify-between text-blue-300">
                  <span>First PvP Today:</span>
                  <span className="font-mono">+{pvpPreviewData.win.firstPvpBonus}</span>
                </div>
              )}

              {pvpPreviewData.win.streakBonus > 0 && (
                <div className="flex justify-between text-purple-300 font-medium">
                  <span>🔥 {pvpPreviewData.win.streakMessage}:</span>
                  <span className="font-mono">+{pvpPreviewData.win.streakBonus}</span>
                </div>
              )}
            </div>

            {pvpPreviewData.currentStreak > 0 && (
              <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                Current Streak: {pvpPreviewData.currentStreak} win{pvpPreviewData.currentStreak !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Loss Scenario */}
          <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <NextImage src="/images/icons/defeat.svg" alt="Defeat" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
              <h3 className="text-sm sm:text-base md:text-xl font-bold text-red-400 font-display">IF YOU LOSE</h3>
            </div>

            <div className="mb-2 sm:mb-3 md:mb-4">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-300 mb-0.5 sm:mb-1">
                {pvpPreviewData.loss.totalPenalty}
              </p>
              <p className="text-xs sm:text-sm text-red-200/70">$TESTVBMS</p>
            </div>

            <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-red-100/80">
                <span>Base Penalty:</span>
                <span className="font-mono">{pvpPreviewData.loss.basePenalty}</span>
              </div>

              {pvpPreviewData.loss.penaltyReduction > 0 && (
                <div className="flex justify-between text-orange-300 font-medium">
                  <span>🛡️ Penalty Reduced ({Math.round(pvpPreviewData.loss.rankingMultiplier * 100)}%):</span>
                  <span className="font-mono">+{pvpPreviewData.loss.penaltyReduction}</span>
                </div>
              )}
            </div>

            {pvpPreviewData.loss.penaltyReduction > 0 && (
              <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                Fighting a high-ranked opponent reduces your loss!
              </div>
            )}
          </div>
        </div>

        {/* Current Balance */}
        <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 bg-vintage-black/50 rounded-lg border border-vintage-gold/20 text-center">
          <p className="text-[10px] sm:text-xs text-vintage-burnt-gold mb-0.5 sm:mb-1">YOUR CURRENT BALANCE</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold">{parseFloat(vbmsBlockchainBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} VBMS</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          <button
            onClick={onConfirmAttack}
            disabled={isAttacking}
            className="flex-1 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 text-white rounded-lg sm:rounded-xl font-display font-bold text-sm sm:text-base md:text-xl shadow-lg transition-all uppercase tracking-wider border-2 border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAttacking ? 'ATTACKING...' : '⚔️ ATTACK'}
          </button>

          <button
            onClick={onCancel}
            disabled={isAttacking}
            className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg sm:rounded-xl hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-sm sm:text-base md:text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
