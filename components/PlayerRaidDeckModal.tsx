"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardMedia } from "@/components/CardMedia";

interface PlayerRaidDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerAddress: string;
  playerUsername: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

export function PlayerRaidDeckModal({
  isOpen,
  onClose,
  playerAddress,
  playerUsername,
  soundEnabled,
  t,
}: PlayerRaidDeckModalProps) {
  const playerDeck = useQuery(
    api.raidBoss.getPlayerRaidDeckByAddress,
    isOpen ? { address: playerAddress } : "skip"
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[350] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-purple-600 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-purple-400">
            {playerUsername}'s Raid Team
          </h2>
          <button
            onClick={onClose}
            className="text-vintage-burnt-gold hover:text-red-400 text-2xl"
          >
            ×
          </button>
        </div>

        {playerDeck === undefined ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
            <p className="text-vintage-burnt-gold">Loading deck...</p>
          </div>
        ) : playerDeck === null ? (
          <div className="text-center py-8">
            <p className="text-vintage-burnt-gold text-lg">No raid deck set</p>
            <p className="text-vintage-burnt-gold/70 text-sm mt-2">
              This player hasn't configured their raid team yet.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-purple-600/20 border border-purple-600/50 rounded-lg p-3 text-center">
                <p className="text-purple-400 text-xs font-bold">Deck Power</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.deckPower?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 text-center">
                <p className="text-red-400 text-xs font-bold">Total Damage</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.totalDamageDealt?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-3 text-center">
                <p className="text-yellow-400 text-xs font-bold">Bosses Killed</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.bossesKilled || 0}
                </p>
              </div>
            </div>

            {/* Main Deck Cards */}
            <h3 className="text-lg font-bold text-vintage-burnt-gold mb-3">
              Attack Deck ({playerDeck.deck?.length || 0}/5)
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {playerDeck.deck?.map((card: any, index: number) => (
                <div
                  key={card.tokenId || index}
                  className="relative bg-vintage-black rounded-lg overflow-hidden border-2 border-purple-600/50"
                >
                  <CardMedia
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                    <p className="text-vintage-burnt-gold text-xs text-center font-bold">
                      ⚔️ {card.power}
                    </p>
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: 5 - (playerDeck.deck?.length || 0) }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="aspect-[2/3] bg-vintage-black/50 rounded-lg border-2 border-dashed border-purple-600/30 flex items-center justify-center"
                  >
                    <span className="text-purple-600/50 text-2xl">?</span>
                  </div>
                )
              )}
            </div>

            {/* VibeFID Card */}
            {playerDeck.vibefidCard && (
              <>
                <h3 className="text-lg font-bold text-cyan-400 mb-3">
                  VibeFID Card (Bonus Slot)
                </h3>
                <div className="flex justify-center mb-4">
                  <div className="relative w-24 bg-vintage-black rounded-lg overflow-hidden border-2 border-cyan-500">
                    <CardMedia
                      src={playerDeck.vibefidCard.imageUrl}
                      alt={playerDeck.vibefidCard.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                      <p className="text-cyan-400 text-xs text-center font-bold">
                        ⚔️ {((playerDeck.vibefidCard.power || 0) * 5).toLocaleString()} <span className="text-purple-400">(5x)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
