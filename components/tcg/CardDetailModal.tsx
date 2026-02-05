import React from "react";
import { CardMedia } from "@/components/CardMedia";
import { getCardAbility, getFoilEffect, getEnergyCost, getFoilClass, getTranslatedAbility } from "@/lib/tcg/abilities";
import { CARD_COMBOS, CARD_NAME_ALIASES, type DeckCard } from "@/lib/tcgRules";
import { COMBO_TRANSLATION_KEYS } from "@/lib/tcg/combos";
import { translations } from "@/lib/translations";
import type { TranslationKey, SupportedLanguage } from "@/lib/translations";

const RARITY_COLORS: Record<string, string> = {
  Common: "border-gray-500 text-gray-400",
  Rare: "border-blue-500 text-blue-400",
  Epic: "border-purple-500 text-purple-400",
  Legendary: "border-yellow-500 text-yellow-400",
  Mythic: "border-red-500 text-red-400",
};

interface CardDetailModalProps {
  card: DeckCard;
  onClose: () => void;
  onSelect?: () => void;
  selectedCards: DeckCard[];
  t: (key: string) => string;
  lang: SupportedLanguage;
}

function CardDetailModalInner({ card, onClose, onSelect, selectedCards, t, lang }: CardDetailModalProps) {
  const ability = getCardAbility(card.name, card, t as (k: string) => string);
  const foilEffect = getFoilEffect(card.foil);
  const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
  const effectivePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
  const energyCost = getEnergyCost(card);

  // Find combos for this card (apply alias for name matching)
  const cardNameLower = card.name?.toLowerCase() || "";
  const resolvedName = CARD_NAME_ALIASES[cardNameLower] || cardNameLower;
  const cardCombos = CARD_COMBOS.filter(combo =>
    combo.cards.map(c => c.toLowerCase()).includes(cardNameLower) ||
    combo.cards.map(c => c.toLowerCase()).includes(resolvedName)
  );

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
      onClick={onClose}
    >
      <div
        className="bg-vintage-deep-black border border-vintage-gold/30 rounded-2xl p-4 max-w-sm w-full max-h-[90vh] overflow-y-auto backdrop-blur-sm overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Card Image/Video */}
        <div className="flex justify-center mb-4">
          <div
            className={`relative w-32 h-48 rounded-xl border-4 overflow-hidden bg-gray-800 ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
          >
            <CardMedia
              src={card.imageUrl}
              alt={card.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {card.foil && card.foil !== "None" && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-lg" />
            )}
          </div>
        </div>

        {/* Card Info */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-vintage-gold">{card.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
            {card.foil && card.foil !== "None" && (
              <span className="text-sm text-vintage-gold">{card.foil}</span>
            )}
            {(card.type === "nothing" || card.type === "other") && (
              <span className="text-sm text-purple-400">(Nothing)</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-4">
            <div>
              <span className="text-vintage-gold font-bold text-2xl">{effectivePower}</span>
              <span className="text-vintage-burnt-gold text-sm ml-1">power</span>
            </div>
            <div>
              <span className={`font-bold text-2xl ${energyCost === 0 ? "text-green-400" : "text-vintage-neon-blue"}`}>
                {energyCost === 0 ? "FREE" : energyCost}
              </span>
              <span className="text-vintage-burnt-gold text-sm ml-1">{energyCost === 0 ? "" : "\u26A1"}</span>
            </div>
          </div>
        </div>

        {/* Ability Section - Show for VBMS and VibeFID */}
        {ability && (card.type === "vbms" || card.type === "vibefid") && (() => {
          const translatedAbility = getTranslatedAbility(card.name, t as (k: string) => string, translations, lang);
          const catConfig: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
            offensive: { emoji: "\u2694\uFE0F", color: "text-red-400", bg: "bg-red-500/20 border-red-500/40", label: "OFFENSIVE" },
            support: { emoji: "\uD83D\uDC9A", color: "text-green-400", bg: "bg-green-500/20 border-green-500/40", label: "SUPPORT" },
            control: { emoji: "\uD83C\uDFAD", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/40", label: "CONTROL" },
            economy: { emoji: "\u26A1", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40", label: "ECONOMY" },
            wildcard: { emoji: "\uD83C\uDCCF", color: "text-cyan-400", bg: "bg-cyan-500/20 border-cyan-500/40", label: "WILDCARD" },
          };
          const abilityCat = (ability as any).category as string | undefined;
          const catInfo = abilityCat ? catConfig[abilityCat] : null;
          return (
            <div className={`${card.type === "vibefid" ? "bg-cyan-900/20 border-cyan-500/20" : "bg-vintage-charcoal/30 border-vintage-gold/10"} border rounded-lg p-3 mb-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400">{"\u26A1"}</span>
                <span className={`${card.type === "vibefid" ? "text-cyan-400" : "text-vintage-gold"} font-bold text-sm`}>{translatedAbility?.name || ability.name}</span>
                {catInfo && (
                  <span className={`${catInfo.bg} ${catInfo.color} border rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider`}>
                    {catInfo.emoji} {catInfo.label}
                  </span>
                )}
              </div>
              <p className="text-vintage-burnt-gold text-sm">{translatedAbility?.description || ability.description}</p>
            </div>
          );
        })()}

        {/* Combo Section - Compact for mobile */}
        {cardCombos.length > 0 && card.type === "vbms" && (
          <div className="mb-3 space-y-2">
            {cardCombos.map((combo) => (
              <div
                key={combo.id}
                className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-vintage-gold font-bold text-sm">{COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as string) : combo.name}</span>
                  {combo.minCards && (
                    <span className="text-vintage-burnt-gold/60 text-[10px]">({combo.minCards}+)</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {combo.cards.map((comboCard) => {
                    const isCurrentCard = comboCard.toLowerCase() === cardNameLower || comboCard.toLowerCase() === resolvedName;
                    return (
                      <span
                        key={comboCard}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCurrentCard
                            ? "bg-vintage-gold text-black"
                            : "bg-vintage-charcoal/50 text-vintage-burnt-gold"
                        }`}
                      >
                        {comboCard}
                      </span>
                    );
                  })}
                </div>
                <p className="text-green-400 text-xs font-bold">
                  {"\u26A1"} {COMBO_TRANSLATION_KEYS[combo.id] ? t((COMBO_TRANSLATION_KEYS[combo.id] + "Desc") as string) : combo.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* VibeFID Wildcard Info */}
        {card.type === "vibefid" && (
          <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3 mb-3">
            <p className="text-cyan-400 text-sm font-bold">{"\uD83C\uDCCF"} Completes ANY combo!</p>
          </div>
        )}

        {/* Nothing/Other Card Info */}
        {(card.type === "nothing" || card.type === "other") && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-3">
            <p className="text-purple-300 text-xs font-bold mb-1">{t('tcgNothingCardTitle')}</p>
            <p className="text-vintage-burnt-gold text-xs">• 50% base power penalty</p>
            <p className="text-vintage-burnt-gold text-xs">• Can be sacrificed from hand (draw new card)</p>
          </div>
        )}

        {/* Foil Effect Section */}
        {foilEffect && (
          <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3 mb-3">
            <p className="text-vintage-gold text-xs font-bold mb-1">{"\u2728"} {t('tcgFoilBonus')}</p>
            <p className="text-vintage-burnt-gold text-sm">{foilEffect.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-vintage-charcoal/50 hover:bg-vintage-charcoal border border-vintage-gold/20 hover:border-vintage-gold/40 text-vintage-burnt-gold hover:text-vintage-gold py-2 px-4 rounded-lg transition-all"
          >
            {t('tcgClose')}
          </button>
          {onSelect && (
            <button
              onClick={() => {
                onSelect();
                onClose();
              }}
              className={`flex-1 py-2 px-4 rounded-lg transition-all font-bold ${
                isSelected
                  ? "bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
                  : "bg-green-600/20 hover:bg-green-500/30 border border-green-500/50 text-green-400"
              }`}
            >
              {isSelected ? t('tcgRemove') : t('tcgAddToDeck')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const CardDetailModal = React.memo(CardDetailModalInner);
