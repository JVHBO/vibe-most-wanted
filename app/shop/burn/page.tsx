"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import LoadingSpinner from "@/components/LoadingSpinner";

// Pack prices for burn value calculation
const PACK_PRICES: Record<string, number> = {
  starter: 1000,
  basic: 1000,
  premium: 10000,
  elite: 100000,
  boosted: 5000,
  mission: 1000,
  achievement: 1000,
  dailyFree: 1000,
};

const BURN_RARITY_MULTIPLIER: Record<string, number> = {
  Common: 0.2,
  Rare: 1.1,
  Epic: 4.0,
  Legendary: 40.0,
};

const BURN_FOIL_MULTIPLIER: Record<string, number> = {
  Prize: 5.0,
  Standard: 1.5,
  None: 1.0,
};

function calculateBurnValue(rarity: string, foil?: string, sourcePackType?: string): number {
  const packPrice = sourcePackType ? (PACK_PRICES[sourcePackType] || 1000) : 1000;
  const rarityMult = BURN_RARITY_MULTIPLIER[rarity] || 0.2;
  const foilMult = foil && foil !== "None" ? (BURN_FOIL_MULTIPLIER[foil] || 1.0) : 1.0;
  return Math.round(packPrice * rarityMult * foilMult);
}

const RARITY_TEXT: Record<string, string> = {
  Common: "text-gray-400",
  Rare: "text-blue-400",
  Epic: "text-purple-400",
  Legendary: "text-yellow-400",
};

export default function BurnCardsPage() {
  const router = useRouter();
  const { address, isConnecting } = useAccount();

  const playerCards = useQuery(api.cardPacks.getPlayerCards, address ? { address } : "skip");
  const lockedCardIds = useQuery(api.cardPacks.getLockedFreeCardIds, address ? { address } : "skip") || [];
  const burnMultipleCards = useMutation(api.cardPacks.burnMultipleCards);

  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isBurning, setIsBurning] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const cards = playerCards || [];

  // Calculate total quantity (including stacked duplicates)
  const totalQuantity = useMemo(() => {
    return cards.reduce((sum: number, card: any) => sum + (card.quantity || 1), 0);
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c: any) => c.rarity === filter);
  }, [cards, filter]);

  // Calculate filtered quantity
  const filteredQuantity = useMemo(() => {
    return filteredCards.reduce((sum: number, card: any) => sum + (card.quantity || 1), 0);
  }, [filteredCards]);

  const totalVBMS = useMemo(() => {
    let total = 0;
    for (const cardId of selectedCards) {
      const card = cards.find((c: any) => c._id === cardId);
      if (card) {
        total += calculateBurnValue(card.rarity, card.foil, card.sourcePackType);
      }
    }
    return total;
  }, [selectedCards, cards]);

  const isCardLocked = (cardId: string) => lockedCardIds.includes(cardId);

  const toggleCard = (cardId: string) => {
    if (isCardLocked(cardId)) return;
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else if (newSelected.size < 50) {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    filteredCards
      .filter((card: any) => !isCardLocked(card._id))
      .slice(0, 50)
      .forEach((card: any) => newSelected.add(card._id));
    setSelectedCards(newSelected);
  };

  const selectNone = () => setSelectedCards(new Set());

  const selectByRarity = (rarity: string) => {
    const newSelected = new Set<string>();
    cards
      .filter((card: any) => card.rarity === rarity && !isCardLocked(card._id))
      .slice(0, 50)
      .forEach((card: any) => newSelected.add(card._id));
    setSelectedCards(newSelected);
  };

  const addToSelection = (rarity: string) => {
    const newSelected = new Set(selectedCards);
    cards
      .filter((card: any) => card.rarity === rarity && !isCardLocked(card._id))
      .forEach((card: any) => {
        if (newSelected.size < 50) newSelected.add(card._id);
      });
    setSelectedCards(newSelected);
  };

  const handleBurn = async () => {
    if (selectedCards.size === 0 || !address) return;
    setIsBurning(true);
    try {
      await burnMultipleCards({
        address,
        cardIds: Array.from(selectedCards) as Id<"cardInventory">[],
      });
      setSelectedCards(new Set());
      router.push("/shop");
    } catch (error) {
      console.error("Burn error:", error);
    } finally {
      setIsBurning(false);
    }
  };

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-vintage-deep-black to-black" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-red-400 mb-4">BURN CARDS</h2>
            <p className="text-vintage-ice/70">Connect wallet to access</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-vintage-deep-black to-black" />

      {/* TOP HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-vintage-charcoal/80 border-b border-red-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/shop")}
            className="group px-3 py-2 bg-black/50 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform">←</span> Shop
          </button>

          <h1 className="text-xl font-display font-bold text-red-400">BURN CARDS</h1>

          <div className="text-right">
            <p className="text-xs text-vintage-ice/50">{totalQuantity} cards</p>
            {totalQuantity !== cards.length && (
              <p className="text-[10px] text-vintage-ice/30">({cards.length} stacks)</p>
            )}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="absolute top-14 left-0 right-0 z-20 px-3 py-2 bg-vintage-charcoal/60 border-b border-red-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["all", "Common", "Rare", "Epic", "Legendary"].map((f) => {
            const count = f === "all" ? cards.length : cards.filter((c: any) => c.rarity === f).length;
            if (count === 0 && f !== "all") return null;
            const colors: Record<string, string> = {
              all: "border-red-500 text-red-400",
              Common: "border-gray-500 text-gray-400",
              Rare: "border-blue-500 text-blue-400",
              Epic: "border-purple-500 text-purple-400",
              Legendary: "border-yellow-500 text-yellow-400",
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  filter === f
                    ? `${colors[f]} bg-current/20`
                    : "border-vintage-gold/20 text-vintage-ice/50"
                }`}
              >
                {f === "all" ? "All" : f} ({count})
              </button>
            );
          })}

          <div className="w-px h-5 bg-red-500/30 mx-1" />

          <button
            onClick={selectAll}
            className="px-3 py-1 rounded-full text-xs font-bold border border-red-500/30 text-red-400 whitespace-nowrap"
          >
            All
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1 rounded-full text-xs font-bold border border-vintage-gold/20 text-vintage-ice/50 whitespace-nowrap"
          >
            Clear
          </button>

          <div className="w-px h-5 bg-red-500/30 mx-1" />

          {/* Quick select by rarity */}
          {cards.filter((c: any) => c.rarity === "Common").length > 0 && (
            <button
              onClick={() => selectByRarity("Common")}
              className="px-2 py-1 rounded-full text-xs font-bold border border-gray-500/30 text-gray-400 whitespace-nowrap"
            >
              +C
            </button>
          )}
          {cards.filter((c: any) => c.rarity === "Rare").length > 0 && (
            <button
              onClick={() => selectByRarity("Rare")}
              className="px-2 py-1 rounded-full text-xs font-bold border border-blue-500/30 text-blue-400 whitespace-nowrap"
            >
              +R
            </button>
          )}
          {cards.filter((c: any) => c.rarity === "Epic").length > 0 && (
            <button
              onClick={() => selectByRarity("Epic")}
              className="px-2 py-1 rounded-full text-xs font-bold border border-purple-500/30 text-purple-400 whitespace-nowrap"
            >
              +E
            </button>
          )}
          {cards.filter((c: any) => c.rarity === "Legendary").length > 0 && (
            <button
              onClick={() => selectByRarity("Legendary")}
              className="px-2 py-1 rounded-full text-xs font-bold border border-yellow-500/30 text-yellow-400 whitespace-nowrap"
            >
              +L
            </button>
          )}
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="absolute inset-0 pt-28 pb-24 overflow-y-auto">
        <div className="relative z-10 px-3 py-2">
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredCards.map((card: any) => {
                const isSelected = selectedCards.has(card._id);
                const burnValue = calculateBurnValue(card.rarity, card.foil, card.sourcePackType);
                const hasFoil = card.foil && card.foil !== "None";
                const isLocked = isCardLocked(card._id);

                return (
                  <div
                    key={card._id}
                    onClick={() => toggleCard(card._id)}
                    className={`relative rounded-xl overflow-hidden transition-all ${
                      isLocked
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer active:scale-95"
                    } ${
                      isSelected
                        ? "ring-2 ring-red-500 bg-red-500/20"
                        : "bg-vintage-charcoal/30"
                    }`}
                  >
                    <div className="flex gap-3 p-2">
                      {/* Card Image */}
                      <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={card.imageUrl}
                          alt={card.name || "Card"}
                          className="w-full h-full object-cover"
                        />
                        {/* Quantity badge for stacked cards */}
                        {card.quantity > 1 && (
                          <div className="absolute top-1 right-1 bg-vintage-gold text-vintage-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            x{card.quantity}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-amber-400 text-xs font-bold">IN USE</span>
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <p className={`text-sm font-bold truncate ${RARITY_TEXT[card.rarity]}`}>
                          {card.rarity}
                        </p>
                        {hasFoil && (
                          <p className={`text-xs ${card.foil === "Prize" ? "text-yellow-400" : "text-cyan-400"}`}>
                            {card.foil} Foil
                          </p>
                        )}
                        <p className="text-xs text-vintage-ice/50 truncate mt-1">
                          {card.name || `${card.suit} ${card.rank}`}
                        </p>
                        <p className="text-lg font-display font-bold text-green-400 mt-1">
                          +{burnValue.toLocaleString()}
                        </p>
                        {card.quantity > 1 && (
                          <p className="text-[10px] text-vintage-ice/40">burns 1 of {card.quantity}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-vintage-ice/40">
              <p className="text-lg">No cards to burn</p>
              <p className="text-sm mt-1">Buy packs to get cards</p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-vintage-charcoal/95 border-t border-red-500/30">
        <div className="flex items-center justify-between p-3 gap-3">
          <div className="text-left">
            <p className="text-xs text-vintage-ice/50">Selected</p>
            <p className="text-lg font-display font-bold text-white">
              {selectedCards.size} <span className="text-vintage-ice/50 text-sm">/ 50</span>
            </p>
          </div>

          <div className="text-center flex-1">
            <p className="text-xs text-vintage-ice/50">You'll receive</p>
            <p className="text-xl font-display font-bold text-green-400">
              +{totalVBMS.toLocaleString()} VBMS
            </p>
          </div>

          <button
            onClick={handleBurn}
            disabled={selectedCards.size === 0 || isBurning}
            className={`px-6 py-3 rounded-xl font-display font-bold transition-all ${
              selectedCards.size > 0 && !isBurning
                ? "bg-gradient-to-r from-red-600 to-orange-600 text-white"
                : "bg-vintage-charcoal text-vintage-ice/30 cursor-not-allowed"
            }`}
          >
            {isBurning ? "..." : "BURN"}
          </button>
        </div>
      </div>
    </div>
  );
}
