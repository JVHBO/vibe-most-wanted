import React from "react";
import type { CardCombo } from "@/lib/tcg/types";

interface ComboDetailModalProps {
  combo: CardCombo;
  onClose: () => void;
  t: (key: string) => string;
}

export function ComboDetailModal({ combo, onClose, t }: ComboDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-yellow-900 via-amber-900 to-orange-950 rounded-2xl p-6 max-w-sm w-full border-2 border-yellow-500 shadow-2xl shadow-yellow-500/30" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{combo.emoji}</div>
          <h2 className="text-2xl font-black text-yellow-400">{combo.name}</h2>
        </div>

        {/* Cards in Combo */}
        <div className="mb-4">
          <p className="text-xs text-yellow-300/70 mb-2 uppercase tracking-wider">{t('tcgCardsRequired')}</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {combo.cards.map((cardName, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-black/40 rounded text-sm text-white capitalize">
                {cardName}
              </span>
            ))}
          </div>
          {combo.minCards && (
            <p className="text-xs text-yellow-400/60 mt-1 text-center">
              (Need at least {combo.minCards} of these)
            </p>
          )}
        </div>

        {/* Effect */}
        <div className="bg-black/30 rounded-xl p-4 mb-4">
          <p className="text-xs text-yellow-300/70 mb-1 uppercase tracking-wider">{t('tcgBonusEffect')}</p>
          <p className="text-yellow-100 font-bold">{combo.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              combo.bonus.type === "power" ? "bg-green-600" :
              combo.bonus.type === "power_percent" ? "bg-purple-600" :
              combo.bonus.type === "steal" ? "bg-red-600" : "bg-blue-600"
            }`}>
              {combo.bonus.type === "power" ? `+${combo.bonus.value} Power` :
               combo.bonus.type === "power_percent" ? `+${combo.bonus.value}% Power` :
               combo.bonus.type === "steal" ? `-${combo.bonus.value} Enemy` :
               combo.bonus.type}
            </span>
            <span className="text-xs text-yellow-400/60">
              to {combo.bonus.target === "self" ? "combo cards" : combo.bonus.target}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
