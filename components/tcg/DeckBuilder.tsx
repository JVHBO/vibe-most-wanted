import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TCG_CONFIG, CARD_NAME_ALIASES, CARD_COMBOS, type DeckCard } from "@/lib/tcgRules";
import { getCharacterFromImage } from "@/lib/vmw-image-mapping";
import { CardMedia } from "@/components/CardMedia";
import { CardDetailModal } from "@/components/tcg/CardDetailModal";
import { getCardAbility } from "@/lib/tcg/abilities";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";
import { detectCombos } from "@/lib/tcg/combos";
import type { SupportedLanguage } from "@/lib/translations";

const OTHER_TCG_COLLECTIONS = ["gmvbrs", "cumioh", "viberotbangers", "meowverse", "teampothead", "tarot", "baseballcabal", "poorlydrawnpepes", "viberuto", "vibefx", "historyofcomputer"];

const RARITY_COLORS: Record<string, string> = {
  Common: "border-gray-500 text-gray-400",
  Rare: "border-blue-500 text-blue-400",
  Epic: "border-purple-500 text-purple-400",
  Legendary: "border-yellow-500 text-yellow-400",
  Mythic: "border-red-500 text-red-400",
};

const CARDS_PER_PAGE = 12;

interface DeckBuilderProps {
  nfts: any[];
  cardsLoading: boolean;
  status: string;
  address: string | undefined;
  onBack: () => void;
  t: (key: string) => string;
  lang: SupportedLanguage;
}

export function DeckBuilder({ nfts, cardsLoading, status, address, onBack, t, lang }: DeckBuilderProps) {
  const saveDeck = useMutation(api.tcg.saveDeck);

  // Internal state
  const [selectedCards, setSelectedCards] = useState<DeckCard[]>([]);
  const [deckName, setDeckName] = useState("My Deck");
  const [deckSortBy, setDeckSortBy] = useState<"power" | "rarity">("power");
  const [deckSortDesc, setDeckSortDesc] = useState(true);
  const [vbmsPage, setVbmsPage] = useState(0);
  const [vibefidPage, setVibefidPage] = useState(0);
  const [othersPage, setOthersPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<DeckCard | null>(null);

  // Card selection handler
  const handleCardSelect = (card: DeckCard) => {
    if (selectedCards.find((c: DeckCard) => c.cardId === card.cardId)) {
      setSelectedCards(selectedCards.filter((c: DeckCard) => c.cardId !== card.cardId));
    } else if (selectedCards.length < TCG_CONFIG.DECK_SIZE) {
      const nothingCount = selectedCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other").length;
      if ((card.type === "nothing" || card.type === "other") && nothingCount >= TCG_CONFIG.MAX_NOTHING) {
        setError(`Max ${TCG_CONFIG.MAX_NOTHING} Nothing cards allowed`);
        return;
      }
      const vibefidCount = selectedCards.filter((c: DeckCard) => c.type === "vibefid").length;
      if (card.type === "vibefid" && vibefidCount >= TCG_CONFIG.MAX_VIBEFID) {
        setError(`Max ${TCG_CONFIG.MAX_VIBEFID} VibeFID card allowed`);
        return;
      }
      setSelectedCards([...selectedCards, card]);
      setError(null);
    }
  };

  // Save deck handler
  const handleSaveDeck = async () => {
    if (!address || selectedCards.length !== TCG_CONFIG.DECK_SIZE) return;
    setError(null);
    try {
      await saveDeck({
        address,
        deckName,
        cards: selectedCards.map((c: DeckCard) => ({
          type: c.type,
          cardId: c.cardId,
          name: c.name,
          rarity: c.rarity,
          power: c.power,
          imageUrl: c.imageUrl,
          foil: c.foil,
          wear: c.wear,
          collection: c.collection,
        })),
        setActive: true,
      });
      onBack();
    } catch (err: any) {
      setError(err.message || "Failed to save deck");
    }
  };

  // Get available cards
  const tcgEligibleCards = (nfts || []).filter((card: any) =>
    card.collection === "vibe" ||
    card.collection === "nothing" ||
    card.collection === "vibefid" ||
    OTHER_TCG_COLLECTIONS.includes(card.collection)
  );

  const availableCards: DeckCard[] = tcgEligibleCards.map((card: any) => {
    const characterFromImage = getCharacterFromImage(card.imageUrl || card.image || "");
    const isVibeFID = card.collection === "vibefid";
    const isVbms = card.collection === "vibe";
    const isOtherCollection = OTHER_TCG_COLLECTIONS.includes(card.collection);
    const cardName = card.character || characterFromImage || card.name || (isVibeFID ? card.displayName || card.username : undefined);

    let imageUrl: string;
    if (isVbms && cardName) {
      imageUrl = getVbmsBaccaratImageUrl(cardName) || card.imageUrl || card.image || "/images/card-back.png";
    } else {
      imageUrl = card.imageUrl || card.image || "/images/card-back.png";
    }

    let cardType: "vbms" | "nothing" | "vibefid" | "other";
    if (card.collection === "nothing") cardType = "nothing";
    else if (card.collection === "vibefid") cardType = "vibefid";
    else if (isOtherCollection) cardType = "other";
    else cardType = "vbms";

    return {
      type: cardType,
      cardId: card.tokenId || card.id || `${card.collection}-${card.name}`,
      name: cardName,
      rarity: card.rarity || "Common",
      power: card.power || 50,
      imageUrl,
      foil: card.foil,
      wear: card.wear,
      collection: card.collection,
    };
  });

  // Rarity order for sorting
  const rarityOrder: Record<string, number> = {
    mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1,
  };

  const sortCards = (cards: DeckCard[]) => {
    return [...cards].sort((a, b) => {
      if (deckSortBy === "power") {
        const powerA = a.type === "nothing" || a.type === "other" ? Math.floor(a.power * 0.5) : a.power;
        const powerB = b.type === "nothing" || b.type === "other" ? Math.floor(b.power * 0.5) : b.power;
        return deckSortDesc ? powerB - powerA : powerA - powerB;
      } else {
        const rarityA = rarityOrder[a.rarity?.toLowerCase() || "common"] || 1;
        const rarityB = rarityOrder[b.rarity?.toLowerCase() || "common"] || 1;
        if (rarityA !== rarityB) {
          return deckSortDesc ? rarityB - rarityA : rarityA - rarityB;
        }
        return deckSortDesc ? b.power - a.power : a.power - b.power;
      }
    });
  };

  const vbmsCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "vbms"));
  const vibefidCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "vibefid"));
  const nothingCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other"));

  const selectedVbms = selectedCards.filter((c: DeckCard) => c.type === "vbms").length;
  const selectedVibefid = selectedCards.filter((c: DeckCard) => c.type === "vibefid").length;
  const selectedVbmsOrVibefid = selectedVbms + selectedVibefid;
  const selectedNothing = selectedCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other").length;
  const totalPower = selectedCards.reduce((sum, c) => {
    const power = c.type === "nothing" || c.type === "other" ? Math.floor(c.power * 0.5) : c.power;
    return sum + power;
  }, 0);

  const canSave =
    selectedCards.length === TCG_CONFIG.DECK_SIZE &&
    selectedVbmsOrVibefid >= TCG_CONFIG.MIN_VBMS_OR_VIBEFID;

  // Auto-build: COMBO mode
  const handleAutoBuildCombo = () => {
    const allCards = [...vbmsCards, ...vibefidCards, ...nothingCards];
    const hasVibeFID = vibefidCards.length > 0;

    const resolveName = (name: string): string => {
      const lower = name.toLowerCase();
      return CARD_NAME_ALIASES[lower] || lower;
    };

    const cardsByName = new Map<string, DeckCard>();
    for (const card of allCards) {
      const resolved = resolveName(card.name || "");
      if (!resolved) continue;
      const existing = cardsByName.get(resolved);
      if (!existing || card.power > existing.power) {
        cardsByName.set(resolved, card);
      }
    }

    type ComboOption = {
      combo: typeof CARD_COMBOS[0];
      cards: DeckCard[];
      needsWildcard: boolean;
    };
    const availableCombos: ComboOption[] = [];

    for (const combo of CARD_COMBOS) {
      const minRequired = combo.minCards || combo.cards.length;
      const foundCards: DeckCard[] = [];

      for (const comboCardName of combo.cards) {
        const card = cardsByName.get(comboCardName.toLowerCase());
        if (card) foundCards.push(card);
      }

      const missing = minRequired - foundCards.length;
      if (foundCards.length >= minRequired) {
        availableCombos.push({ combo, cards: foundCards, needsWildcard: false });
      } else if (missing === 1 && hasVibeFID) {
        availableCombos.push({ combo, cards: foundCards, needsWildcard: true });
      }
    }

    availableCombos.sort((a, b) => {
      if (a.cards.length !== b.cards.length) return a.cards.length - b.cards.length;
      return b.combo.bonus.value - a.combo.bonus.value;
    });

    const selectedCombos: ComboOption[] = [];
    const usedCardNames = new Set<string>();
    const cardsToAdd: DeckCard[] = [];

    for (const option of availableCombos) {
      const minRequired = option.combo.minCards || option.combo.cards.length;
      const cardsNeeded = option.needsWildcard ? minRequired - 1 : minRequired;

      const avail = option.cards.filter(c => {
        const resolved = resolveName(c.name || "");
        return !usedCardNames.has(resolved);
      });

      if (avail.length < cardsNeeded) continue;

      const sortedCards = [...avail].sort((a, b) => b.power - a.power);
      const picked = sortedCards.slice(0, cardsNeeded);

      selectedCombos.push(option);
      for (const card of picked) {
        usedCardNames.add(resolveName(card.name || ""));
        cardsToAdd.push(card);
      }
    }

    const newDeck: DeckCard[] = [];
    const usedCardIds = new Set<string>();
    let vbmsOrFidCount = 0;

    const addCard = (card: DeckCard): boolean => {
      if (usedCardIds.has(card.cardId)) return true;
      if (newDeck.length >= TCG_CONFIG.DECK_SIZE) return false;
      newDeck.push(card);
      usedCardIds.add(card.cardId);
      if (card.type === "vbms" || card.type === "vibefid") vbmsOrFidCount++;
      return true;
    };

    for (const vibefid of vibefidCards) {
      addCard(vibefid);
    }
    for (const card of cardsToAdd) {
      addCard(card);
    }
    if (newDeck.length < TCG_CONFIG.DECK_SIZE) {
      const remainingCards = vbmsCards
        .filter(c => !usedCardIds.has(c.cardId))
        .sort((a, b) => b.power - a.power);
      for (const card of remainingCards) {
        if (!addCard(card)) break;
      }
    }

    setSelectedCards(newDeck);
    setError(null);
  };

  // Auto-build: POWER mode
  const handleAutoBuildPower = () => {
    const allCards = [...vbmsCards, ...vibefidCards, ...nothingCards];

    const sortedByPower = [...allCards].sort((a, b) => {
      const powerA = (a.type === "nothing" || a.type === "other") ? Math.floor(a.power * 0.5) : a.power;
      const powerB = (b.type === "nothing" || b.type === "other") ? Math.floor(b.power * 0.5) : b.power;
      return powerB - powerA;
    });

    const newDeck: DeckCard[] = [];
    let vbmsOrFidCount = 0;
    let nothingOrOtherCount = 0;
    let vibefidUsed = false;

    for (const card of sortedByPower) {
      if (newDeck.length >= TCG_CONFIG.DECK_SIZE) break;

      if (card.type === "vibefid") {
        if (vibefidUsed) continue;
        vibefidUsed = true;
        vbmsOrFidCount++;
      } else if (card.type === "vbms") {
        vbmsOrFidCount++;
      } else if (card.type === "nothing" || card.type === "other") {
        if (nothingOrOtherCount >= TCG_CONFIG.MAX_NOTHING) continue;
        nothingOrOtherCount++;
      }

      newDeck.push(card);
    }

    if (vbmsOrFidCount < TCG_CONFIG.MIN_VBMS_OR_VIBEFID) {
      const vbmsNotInDeck = vbmsCards
        .filter(c => !newDeck.find(d => d.cardId === c.cardId))
        .sort((a, b) => b.power - a.power);
      const nothingInDeck = newDeck
        .filter(c => c.type === "nothing" || c.type === "other")
        .sort((a, b) => Math.floor(a.power * 0.5) - Math.floor(b.power * 0.5));

      while (vbmsOrFidCount < TCG_CONFIG.MIN_VBMS_OR_VIBEFID && vbmsNotInDeck.length > 0 && nothingInDeck.length > 0) {
        const toRemove = nothingInDeck.shift();
        const toAdd = vbmsNotInDeck.shift();
        if (toRemove && toAdd) {
          const idx = newDeck.findIndex(c => c.cardId === toRemove.cardId);
          if (idx !== -1) {
            newDeck[idx] = toAdd;
            vbmsOrFidCount++;
            nothingOrOtherCount--;
          }
        }
      }
    }

    setSelectedCards(newDeck);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

      {/* ===== TOP HUD ===== */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black via-black/95 to-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-vintage-burnt-gold/70 hover:text-vintage-gold transition-colors text-[11px] font-medium uppercase tracking-[0.15em]"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform text-vintage-gold/50 group-hover:text-vintage-gold">&larr;</span>
            {t('tcgBack')}
          </button>
          <p className="text-[10px] text-vintage-burnt-gold/50 uppercase tracking-[0.2em]">Select 12 cards</p>
          <button
            onClick={handleSaveDeck}
            disabled={!canSave}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${canSave ? 'bg-vintage-gold text-black hover:bg-yellow-400' : 'bg-black/30 text-vintage-burnt-gold/40 cursor-not-allowed'} transition-colors`}
          >
            {t('tcgSaveDeck')}
          </button>
        </div>
      </div>

      {/* ===== MAIN SCROLLABLE CONTENT ===== */}
      <div className="absolute inset-0 pt-16 pb-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4">

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Loading Status */}
        {cardsLoading && (
          <div className="bg-vintage-neon-blue/10 border border-vintage-neon-blue/30 text-vintage-neon-blue px-4 py-2 rounded-lg mb-4 text-sm">
            {t('tcgLoading')} (Status: {status})
          </div>
        )}

        {/* Debug Info */}
        {!cardsLoading && nfts.length === 0 && (
          <div className="bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-gold px-4 py-2 rounded-lg mb-4 text-sm">
            {t('tcgNoCardsFound')}
            <br />
            <span className="text-xs text-vintage-burnt-gold">Status: {status} | Address: {address || 'not connected'}</span>
          </div>
        )}

        {/* Deck Name */}
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="w-full bg-black/40 border border-vintage-gold/20 rounded px-3 py-2 text-vintage-gold font-bold tracking-wide focus:outline-none focus:border-vintage-gold/50 placeholder:text-vintage-burnt-gold/30 text-sm mb-3"
          placeholder={t('tcgDeckName')}
        />

        {/* Stats Row */}
        <div className="flex items-center justify-between gap-2 mb-3 text-[10px]">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded ${selectedCards.length === TCG_CONFIG.DECK_SIZE ? "bg-green-900/40 text-green-400" : "bg-black/40 text-vintage-burnt-gold"}`}>
              {selectedCards.length}/{TCG_CONFIG.DECK_SIZE}
            </span>
            <span className={`px-2 py-1 rounded ${selectedVbmsOrVibefid >= TCG_CONFIG.MIN_VBMS_OR_VIBEFID ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
              {selectedVbmsOrVibefid}/{TCG_CONFIG.MIN_VBMS_OR_VIBEFID} VBMS
            </span>
            <span className="px-2 py-1 rounded bg-vintage-gold/20 text-vintage-gold font-bold">
              {totalPower} PWR
            </span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 mb-3 text-[10px]">
          <button
            onClick={() => { setDeckSortBy("power"); setDeckSortDesc(!deckSortDesc); }}
            className={`px-3 py-1.5 rounded ${deckSortBy === "power" ? "bg-vintage-gold/20 text-vintage-gold" : "bg-black/40 text-vintage-burnt-gold"}`}
          >
            ⚡ Power {deckSortBy === "power" && (deckSortDesc ? "↓" : "↑")}
          </button>
          <button
            onClick={() => { setDeckSortBy("rarity"); setDeckSortDesc(!deckSortDesc); }}
            className={`px-3 py-1.5 rounded ${deckSortBy === "rarity" ? "bg-purple-900/40 text-purple-400" : "bg-black/40 text-vintage-burnt-gold"}`}
          >
            💎 Rarity {deckSortBy === "rarity" && (deckSortDesc ? "↓" : "↑")}
          </button>
          <div className="flex-1"></div>
            <button
              onClick={handleAutoBuildCombo}
              className="px-2 py-1 rounded transition-all bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/50 hover:border-yellow-500/50"
              title="Auto-build deck - every card in a combo!"
            >
              🎯 COMBO
            </button>
            <button
              onClick={handleAutoBuildPower}
              className="px-2 py-1 rounded transition-all bg-orange-900/30 border border-orange-500/30 text-orange-400 hover:bg-orange-900/50 hover:border-orange-500/50"
              title="Auto-build deck with highest power cards"
            >
              ⚡ POWER
            </button>
        </div>

        {/* Combo Preview */}
        {selectedCards.length >= 2 && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/20 rounded-lg p-2 mb-3">
            <h3 className="text-[9px] font-bold text-yellow-400 mb-1.5 uppercase tracking-[0.2em]">🎯 Combos {selectedVibefid > 0 && <span className="text-cyan-400">(VibeFID = Wildcard!)</span>}</h3>
            {(() => {
              const deckCombos = detectCombos(selectedCards);
              if (deckCombos.length === 0) {
                return <p className="text-[10px] text-gray-500 italic">No combos yet - add more cards!</p>;
              }
              return (
                <div className="flex flex-wrap gap-1.5">
                  {deckCombos.map(({ combo, matchedCards, wildcardsUsed }) => (
                    <div
                      key={combo.name}
                      className={`px-2 py-1 bg-black/40 rounded border text-[10px] ${wildcardsUsed > 0 ? 'border-cyan-500/50' : 'border-yellow-500/30'}`}
                      title={`${combo.description}${wildcardsUsed > 0 ? ` (${wildcardsUsed} VibeFID wildcard)` : ''}`}
                    >
                      <span className="text-yellow-400">{combo.emoji}</span>
                      <span className="text-white ml-1">{combo.name}</span>
                      <span className="text-green-400 ml-1">+{combo.bonus.value}</span>
                      {wildcardsUsed > 0 && <span className="text-cyan-400 ml-1">🃏</span>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Selected Cards */}
        <div className="bg-gradient-to-b from-vintage-charcoal/40 to-black/30 border border-vintage-gold/20 rounded-lg p-3 mb-3">
          <h3 className="text-[9px] font-bold text-vintage-gold mb-2 uppercase tracking-[0.2em]">{t('tcgCurrentDeck')} <span className="text-vintage-burnt-gold/60">({selectedCards.length})</span></h3>
          <div className="flex flex-wrap gap-1.5 min-h-[70px]">
            {selectedCards.map((card: DeckCard) => {
              const ability = getCardAbility(card.name, card, t as (k: string) => string);
              return (
                <div
                  key={card.cardId}
                  className={`relative w-12 h-[68px] rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
                  title={`${card.name} (${card.rarity}) - ${card.power} power`}
                >
                  <CardMedia
                    src={card.imageUrl}
                    alt={card.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                    className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10"
                  >
                    i
                  </button>
                  <div
                    onClick={() => handleCardSelect(card)}
                    className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-end p-0.5"
                  >
                    <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                    <span className="text-[9px] text-yellow-400 font-bold">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                    {ability && (card.type === "vbms" || card.type === "vibefid") && (
                      <span className="text-[5px] text-purple-400">⚡</span>
                    )}
                  </div>
                </div>
              );
            })}
            {selectedCards.length === 0 && (
              <p className="text-vintage-burnt-gold/60 text-sm">{t('tcgClickToAdd')}</p>
            )}
          </div>
        </div>

        {/* Available Cards */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* VBMS Cards */}
          <div className="bg-gradient-to-b from-vintage-charcoal/40 to-black/30 border border-vintage-gold/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[9px] font-bold text-vintage-gold uppercase tracking-[0.2em]">VBMS <span className="text-vintage-burnt-gold/60">({vbmsCards.length})</span></h3>
              {vbmsCards.length > CARDS_PER_PAGE && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setVbmsPage(p => Math.max(0, p - 1))}
                    disabled={vbmsPage === 0}
                    className="w-5 h-5 flex items-center justify-center text-[10px] bg-vintage-gold/20 hover:bg-vintage-gold/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    &larr;
                  </button>
                  <span className="text-[8px] text-vintage-burnt-gold/60 min-w-[40px] text-center">
                    {vbmsPage + 1}/{Math.ceil(vbmsCards.length / CARDS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setVbmsPage(p => Math.min(Math.ceil(vbmsCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                    disabled={vbmsPage >= Math.ceil(vbmsCards.length / CARDS_PER_PAGE) - 1}
                    className="w-5 h-5 flex items-center justify-center text-[10px] bg-vintage-gold/20 hover:bg-vintage-gold/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vbmsCards.slice(vbmsPage * CARDS_PER_PAGE, (vbmsPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                const ability = getCardAbility(card.name, card, t as (k: string) => string);
                return (
                  <div
                    key={card.cardId}
                    className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                      isSelected
                        ? "border-green-500 ring-2 ring-green-500/50"
                        : RARITY_COLORS[card.rarity] || "border-gray-500"
                    }`}
                    title={`${card.name} (${card.rarity}) - ${card.power} power`}
                  >
                    <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                    <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                      <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                      <span className="text-[10px] text-yellow-400 font-bold">{card.power}</span>
                      {ability && <span className="text-[5px] text-purple-400">⚡</span>}
                    </div>
                  </div>
                );
              })}
              {vbmsCards.length === 0 && <p className="text-vintage-burnt-gold/60 text-xs">{t('tcgNoVbmsCards')}</p>}
            </div>
          </div>

          {/* VibeFID Cards */}
          {vibefidCards.length > 0 && (
            <div className="bg-gradient-to-b from-cyan-950/40 to-black/30 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] font-bold text-cyan-400 uppercase tracking-[0.2em]">VibeFID <span className="text-cyan-400/60">({vibefidCards.length})</span> <span className="text-vintage-burnt-gold/50 normal-case tracking-normal">5x</span></h3>
                {vibefidCards.length > CARDS_PER_PAGE && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setVibefidPage(p => Math.max(0, p - 1))}
                      disabled={vibefidPage === 0}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-cyan-500/20 hover:bg-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      &larr;
                    </button>
                    <span className="text-[8px] text-cyan-400/60 min-w-[40px] text-center">
                      {vibefidPage + 1}/{Math.ceil(vibefidCards.length / CARDS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setVibefidPage(p => Math.min(Math.ceil(vibefidCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                      disabled={vibefidPage >= Math.ceil(vibefidCards.length / CARDS_PER_PAGE) - 1}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-cyan-500/20 hover:bg-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      &rarr;
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vibefidCards.slice(vibefidPage * CARDS_PER_PAGE, (vibefidPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                  const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                  const ability = getCardAbility(card.name, card, t as (k: string) => string);
                  return (
                    <div
                      key={card.cardId}
                      className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                        isSelected ? "border-green-500 ring-2 ring-green-500/50" : RARITY_COLORS[card.rarity] || "border-cyan-500"
                      }`}
                      title={`${card.name} (${card.rarity}) - ${card.power} power`}
                    >
                      <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-cyan-600 hover:bg-cyan-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                      <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                        <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                        <span className="text-[10px] text-cyan-400 font-bold">{card.power}</span>
                        {ability && <span className="text-[5px] text-purple-400">⚡</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nothing Cards */}
          <div className="bg-gradient-to-b from-purple-950/40 to-black/30 border border-purple-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.2em]">Others <span className="text-purple-400/60">({nothingCards.length})</span> <span className="text-vintage-burnt-gold/50 normal-case tracking-normal">50% power</span></h3>
              {nothingCards.length > CARDS_PER_PAGE && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOthersPage(p => Math.max(0, p - 1))}
                    disabled={othersPage === 0}
                    className="w-5 h-5 flex items-center justify-center text-[10px] bg-purple-500/20 hover:bg-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    &larr;
                  </button>
                  <span className="text-[8px] text-purple-400/60 min-w-[40px] text-center">
                    {othersPage + 1}/{Math.ceil(nothingCards.length / CARDS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setOthersPage(p => Math.min(Math.ceil(nothingCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                    disabled={othersPage >= Math.ceil(nothingCards.length / CARDS_PER_PAGE) - 1}
                    className="w-5 h-5 flex items-center justify-center text-[10px] bg-purple-500/20 hover:bg-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nothingCards.slice(othersPage * CARDS_PER_PAGE, (othersPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                return (
                  <div
                    key={card.cardId}
                    className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                      isSelected ? "border-green-500 ring-2 ring-green-500/50" : "border-purple-500/50"
                    }`}
                    title={`${card.name} (${card.rarity}) - ${Math.floor(card.power * 0.5)} effective power`}
                  >
                    <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-purple-600 hover:bg-purple-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                    <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                      <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                      <span className="text-[10px] text-purple-400 font-bold">{Math.floor(card.power * 0.5)}</span>
                    </div>
                  </div>
                );
              })}
              {nothingCards.length === 0 && <p className="text-vintage-burnt-gold/60 text-xs">{t('tcgNoNothingCards')}</p>}
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Card Detail Modal */}
      {detailCard && (
        <div key={`detail-modal-${detailCard.cardId}`}>
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
            onSelect={() => handleCardSelect(detailCard)}
            selectedCards={selectedCards}
            t={t}
            lang={lang}
          />
        </div>
      )}
    </div>
  );
}
