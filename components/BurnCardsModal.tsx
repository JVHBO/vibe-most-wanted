"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Id } from "@/convex/_generated/dataModel";

interface Card {
  _id: Id<"cardInventory">;
  name: string;
  imageUrl: string;
  rarity: string;
  power: number;
  quantity: number;
  foil?: string;
}

interface BurnCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  address: string;
  lockedCardIds?: string[];
  onSuccess?: (result: { totalVBMS: number; cardsBurned: number }) => void;
}

const BURN_VALUES: Record<string, number> = {
  Common: 200,
  Rare: 1100,
  Epic: 4000,
  Legendary: 40000,
};

// Foil multipliers for burn value
const BURN_FOIL_MULTIPLIER: Record<string, number> = {
  Prize: 10.0,
  Standard: 2.0,
  None: 1.0,
};

// Calculate burn value with foil bonus
function calculateBurnValue(rarity: string, foil?: string): number {
  const baseValue = BURN_VALUES[rarity] || 200;
  const foilMult = foil && foil !== "None" ? (BURN_FOIL_MULTIPLIER[foil] || 1.0) : 1.0;
  return Math.round(baseValue * foilMult);
}

const RARITY_COLORS: Record<string, string> = {
  Common: "border-gray-500/50 bg-gray-900/30",
  Rare: "border-blue-500/50 bg-blue-900/30",
  Epic: "border-purple-500/50 bg-purple-900/30",
  Legendary: "border-yellow-500/50 bg-yellow-900/30",
};

const RARITY_TEXT: Record<string, string> = {
  Common: "text-gray-400",
  Rare: "text-blue-400",
  Epic: "text-purple-400",
  Legendary: "text-yellow-400",
};

export function BurnCardsModal({ isOpen, onClose, cards, address, lockedCardIds = [], onSuccess }: BurnCardsModalProps) {
  const { t } = useLanguage();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isBurning, setIsBurning] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const burnMultipleCards = useMutation(api.cardPacks.burnMultipleCards);

  // Filter cards
  const filteredCards = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter(c => c.rarity === filter);
  }, [cards, filter]);

  // Calculate total VBMS for selected cards (with foil bonus)
  const totalVBMS = useMemo(() => {
    let total = 0;
    for (const cardId of selectedCards) {
      const card = cards.find(c => c._id === cardId);
      if (card) {
        total += calculateBurnValue(card.rarity, card.foil);
      }
    }
    return total;
  }, [selectedCards, cards]);

  // Count by rarity
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { Common: 0, Rare: 0, Epic: 0, Legendary: 0 };
    for (const cardId of selectedCards) {
      const card = cards.find(c => c._id === cardId);
      if (card) {
        counts[card.rarity] = (counts[card.rarity] || 0) + 1;
      }
    }
    return counts;
  }, [selectedCards, cards]);

  // Helper to check if card is locked (in use)
  const isCardLocked = (cardId: string) => lockedCardIds.includes(cardId);

  const toggleCard = (cardId: string) => {
    // Prevent selecting locked cards
    if (isCardLocked(cardId)) return;

    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      if (newSelected.size < 50) {
        newSelected.add(cardId);
      }
    }
    setSelectedCards(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    filteredCards
      .filter(card => !isCardLocked(card._id))
      .slice(0, 50)
      .forEach(card => {
        newSelected.add(card._id);
      });
    setSelectedCards(newSelected);
  };

  const selectNone = () => {
    setSelectedCards(new Set());
  };

  const selectByRarity = (rarity: string) => {
    const newSelected = new Set<string>();
    cards
      .filter(c => c.rarity === rarity && !isCardLocked(c._id))
      .slice(0, 50)
      .forEach(card => {
        newSelected.add(card._id);
      });
    setSelectedCards(newSelected);
  };

  // Smart select: Cards without foil (safe to burn) - skip locked
  const selectNoFoil = () => {
    const newSelected = new Set<string>();
    cards
      .filter(c => (!c.foil || c.foil === "None") && !isCardLocked(c._id))
      .slice(0, 50)
      .forEach(card => newSelected.add(card._id));
    setSelectedCards(newSelected);
  };

  // Smart select: Lowest power cards first - skip locked
  const selectLowestPower = () => {
    const newSelected = new Set<string>();
    [...cards]
      .filter(c => !isCardLocked(c._id))
      .sort((a, b) => a.power - b.power)
      .slice(0, 50)
      .forEach(card => newSelected.add(card._id));
    setSelectedCards(newSelected);
  };

  const handleBurn = async () => {
    if (selectedCards.size === 0) return;

    setIsBurning(true);
    try {
      const result = await burnMultipleCards({
        address,
        cardIds: Array.from(selectedCards) as Id<"cardInventory">[],
      });

      onSuccess?.({ totalVBMS: result.totalVBMS, cardsBurned: result.cardsBurned });
      setSelectedCards(new Set());
      onClose();
    } catch (error) {
      console.error("Burn error:", error);
    } finally {
      setIsBurning(false);
    }
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-red-600/50 rounded-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 border-b border-red-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <h2 className="text-2xl font-display font-bold text-red-400">{t('burnTitle')}</h2>
                <p className="text-red-300/70 text-sm">{t('burnSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/30 text-red-400 hover:bg-red-600 hover:text-white transition-all text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Burn Values Reference - Mobile Compact */}
        <div className="bg-black/30 px-3 py-2 border-b border-red-600/20">
          <div className="flex items-center justify-between text-[10px] gap-1">
            <span className="text-gray-400">C:<span className="text-green-400 font-bold">200</span></span>
            <span className="text-blue-400">R:<span className="text-green-400 font-bold">1.1k</span></span>
            <span className="text-purple-400">E:<span className="text-green-400 font-bold">4k</span></span>
            <span className="text-yellow-400">L:<span className="text-green-400 font-bold">40k</span></span>
            <span className="text-cyan-400">Std:<span className="text-green-400 font-bold">2x</span></span>
            <span className="text-yellow-300">Prize:<span className="text-green-400 font-bold">10x</span></span>
          </div>
        </div>

        {/* Combined Select & Filter - Mobile Optimized */}
        <div className="bg-black/20 px-3 py-2 border-b border-red-600/20">
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded bg-red-600/30 text-red-400 active:bg-red-600/50 text-xs font-bold"
            >
              All
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1.5 rounded bg-gray-600/30 text-gray-400 active:bg-gray-600/50 text-xs font-bold"
            >
              None
            </button>
            <div className="w-px h-5 bg-red-600/30" />
            {/* Smart Select */}
            <button
              onClick={selectNoFoil}
              className="px-3 py-1.5 rounded bg-green-600/30 text-green-400 active:bg-green-600/50 text-xs font-bold"
            >
              No Foil
            </button>
            <button
              onClick={selectLowestPower}
              className="px-3 py-1.5 rounded bg-emerald-600/30 text-emerald-400 active:bg-emerald-600/50 text-xs font-bold"
            >
              Weak
            </button>
          </div>
        </div>

        {/* Filter by Rarity - Mobile Optimized */}
        <div className="bg-black/30 px-2 py-1.5 border-b border-red-600/20 flex gap-1">
          {["all", "Common", "Rare", "Epic", "Legendary"].map((f) => {
            const count = f === "all" ? cards.length : cards.filter(c => c.rarity === f).length;
            const colors: Record<string, string> = {
              all: "bg-red-600",
              Common: "bg-gray-600",
              Rare: "bg-blue-600",
              Epic: "bg-purple-600",
              Legendary: "bg-yellow-600",
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-1 py-1.5 rounded text-[10px] font-bold transition-all ${
                  filter === f
                    ? `${colors[f]} text-white`
                    : "bg-black/30 text-white/50 active:bg-black/50"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0)} {count}
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredCards.map((card) => {
                const isSelected = selectedCards.has(card._id);
                const burnValue = calculateBurnValue(card.rarity, card.foil);
                const hasFoil = card.foil && card.foil !== "None";
                const isLocked = isCardLocked(card._id);

                return (
                  <div
                    key={card._id}
                    onClick={() => toggleCard(card._id)}
                    className={`relative rounded-lg overflow-hidden transition-all transform ${
                      isLocked
                        ? "cursor-not-allowed opacity-60 ring-2 ring-amber-500/50"
                        : "cursor-pointer hover:scale-105"
                    } ${
                      RARITY_COLORS[card.rarity] || RARITY_COLORS.Common
                    } ${isSelected ? "ring-4 ring-red-500 scale-105" : !isLocked ? "opacity-70 hover:opacity-100" : ""} ${
                      hasFoil && !isLocked ? "ring-2 ring-cyan-400/50" : ""
                    }`}
                  >
                    {/* Selection Checkbox / Lock Badge */}
                    <div className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isLocked
                        ? "bg-amber-600/90 text-white"
                        : isSelected
                          ? "bg-red-600 text-white"
                          : "bg-black/60 text-white/70"
                    }`}>
                      {isLocked ? "🔒 IN USE" : isSelected ? "✓" : ""}
                    </div>

                    {/* Card Image */}
                    <div className="aspect-[3/4] relative">
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Foil Badge */}
                      {hasFoil && (
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full font-bold text-xs ${
                          card.foil === "Prize"
                            ? "bg-yellow-500 text-black"
                            : "bg-cyan-500 text-black"
                        }`}>
                          {card.foil}
                        </div>
                      )}

                      {/* Quantity Badge (if no foil) */}
                      {card.quantity > 1 && !hasFoil && (
                        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          x{card.quantity}
                        </div>
                      )}

                      {/* VBMS Value */}
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 ${
                        isSelected ? "from-red-900/90" : ""
                      }`}>
                        <div className={`text-xs font-bold ${RARITY_TEXT[card.rarity] || "text-gray-400"}`}>
                          {card.rarity} {hasFoil && <span className="text-cyan-400">({card.foil})</span>}
                        </div>
                        <div className={`font-bold text-sm ${hasFoil ? "text-cyan-400" : "text-green-400"}`}>
                          +{burnValue.toLocaleString()} VBMS
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-red-400/60">
              <span className="text-4xl block mb-4">🔥</span>
              <p className="text-lg">{t('burnNoCards')}</p>
              <p className="text-sm mt-1">{t('burnBuyPacks')}</p>
            </div>
          )}
        </div>

        {/* Footer - Summary & Burn Button */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 border-t border-red-600/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Summary */}
            <div className="text-center sm:text-left">
              <div className="text-sm text-red-300/70 mb-1">
                Selected: <span className="text-white font-bold">{selectedCards.size}</span> cards
                {selectedCards.size >= 50 && <span className="text-yellow-400 ml-2">(max 50)</span>}
              </div>
              {selectedCards.size > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {rarityCounts.Common > 0 && (
                    <span className="text-gray-400">{rarityCounts.Common} Common</span>
                  )}
                  {rarityCounts.Rare > 0 && (
                    <span className="text-blue-400">{rarityCounts.Rare} Rare</span>
                  )}
                  {rarityCounts.Epic > 0 && (
                    <span className="text-purple-400">{rarityCounts.Epic} Epic</span>
                  )}
                  {rarityCounts.Legendary > 0 && (
                    <span className="text-yellow-400">{rarityCounts.Legendary} Legendary</span>
                  )}
                </div>
              )}
            </div>

            {/* Total & Burn Button */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-red-300/70">{t('burnTotal')}</div>
                <div className="text-2xl font-display font-bold text-green-400">
                  +{totalVBMS.toLocaleString()}
                </div>
              </div>

              <button
                onClick={handleBurn}
                disabled={selectedCards.size === 0 || isBurning}
                className={`px-8 py-4 rounded-xl font-display font-bold text-lg transition-all ${
                  selectedCards.size > 0 && !isBurning
                    ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isBurning ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🔥</span>
                    Burning...
                  </span>
                ) : (
                  `🔥 BURN ${selectedCards.size} Cards`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
