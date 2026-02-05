import React from "react";
import type { VibeFIDComboModalState } from "@/lib/tcg/types";
import { COMBO_TRANSLATION_KEYS } from "@/lib/tcg/combos";
import { translations } from "@/lib/translations";

interface VibeFIDComboModalProps {
  modal: VibeFIDComboModalState;
  onSelectCombo: (laneIndex: number, cardIndex: number, comboId: string | undefined) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function VibeFIDComboModal({ modal, onSelectCombo, onClose, t }: VibeFIDComboModalProps) {
  const cardIndex = (modal.card as any)._tempCardIndex;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 rounded-2xl p-6 max-w-sm w-full border-2 border-cyan-500 shadow-2xl shadow-cyan-500/30" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{"\uD83C\uDCCF"}</div>
          <h2 className="text-2xl font-black text-cyan-400">{t('tcgChooseCombo') || "Choose Combo"}</h2>
          <p className="text-sm text-cyan-300/70 mt-1">VibeFID = Wildcard {"\uD83C\uDF1F"}</p>
        </div>

        {/* Combo Options */}
        <div className="space-y-3 mb-4">
          {modal.possibleCombos.map(({ combo, partnerCard }) => (
            <button
              key={combo.id}
              onClick={() => {
                onClose();
                onSelectCombo(modal.laneIndex, cardIndex, combo.id);
              }}
              className="w-full bg-black/40 hover:bg-cyan-800/40 border border-cyan-500/40 hover:border-cyan-400 rounded-xl p-4 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{combo.emoji}</span>
                <div>
                  <div className="text-cyan-300 font-bold">
                    {COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as string) : combo.name}
                  </div>
                  <div className="text-xs text-cyan-400/60">
                    VibeFID + {partnerCard}
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    {combo.bonus.type === "power" ? `+${combo.bonus.value} Power` :
                     combo.bonus.type === "steal" ? `Steal ${combo.bonus.value}` :
                     combo.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel / Auto Button */}
        <button
          onClick={() => {
            const firstCombo = modal.possibleCombos[0];
            onClose();
            onSelectCombo(modal.laneIndex, cardIndex, firstCombo?.combo.id);
          }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors text-sm"
        >
          {t('tcgAutoSelect') || "Auto (First Card)"} - {modal.possibleCombos[0]?.combo.emoji} {modal.possibleCombos[0]?.combo.name}
        </button>
      </div>
    </div>
  );
}
