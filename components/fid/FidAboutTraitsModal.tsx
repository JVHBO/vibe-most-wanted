"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { AudioManager } from "@/lib/fid/audio-manager";

interface FidAboutTraitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FidAboutTraitsModal({ isOpen, onClose }: FidAboutTraitsModalProps) {
  const { lang, setLang } = useLanguage();
  const t = fidTranslations[lang];
  const [currentPage, setCurrentPage] = useState(0);

  if (!isOpen) return null;

  const pages = [
    // Page 0: Benefits
    {
      title: t.vibeFidBenefits || "VibeFID Benefits",
      content: (
        <div className="space-y-4">
          <p className="text-vintage-ice/80 text-sm mb-4">
            {t.vibeFidBenefitsIntro}
          </p>
          <div className="space-y-3">
            <div className="bg-vintage-black/40 p-4 rounded border border-vintage-gold/30">
              <span className="text-vintage-gold font-bold text-lg">{t.powerBoost}</span>
              <p className="text-vintage-ice/70 text-sm mt-1">{t.powerBoostDesc}</p>
            </div>
            <div className="bg-vintage-black/40 p-4 rounded border border-vintage-gold/30">
              <span className="text-vintage-gold font-bold text-lg">{t.infiniteEnergy}</span>
              <p className="text-vintage-ice/70 text-sm mt-1">{t.infiniteEnergyDesc}</p>
            </div>
            <div className="bg-vintage-black/40 p-4 rounded border border-vintage-gold/30">
              <span className="text-vintage-gold font-bold text-lg">{t.noDeckRestriction}</span>
              <p className="text-vintage-ice/70 text-sm mt-1">{t.noDeckRestrictionDesc}</p>
            </div>
          </div>
        </div>
      ),
    },
    // Page 1: Neynar Score → Rarity
    {
      title: t.neynarScoreSection || "Neynar Score",
      content: (
        <div className="space-y-4">
          <p className="text-vintage-ice/80 text-sm mb-4">
            {t.neynarScoreDescription}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
              <div>
                <span className="text-purple-400 font-bold">{t.mythic}</span>
                <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.99)</span>
              </div>
              <span className="text-vintage-gold font-bold">600 {t.basePower}</span>
            </div>
            <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
              <div>
                <span className="text-orange-400 font-bold">{t.legendary}</span>
                <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.90)</span>
              </div>
              <span className="text-vintage-gold font-bold">100 {t.basePower}</span>
            </div>
            <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
              <div>
                <span className="text-pink-400 font-bold">{t.epic}</span>
                <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.79)</span>
              </div>
              <span className="text-vintage-gold font-bold">50 {t.basePower}</span>
            </div>
            <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
              <div>
                <span className="text-blue-400 font-bold">{t.rare}</span>
                <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.70)</span>
              </div>
              <span className="text-vintage-gold font-bold">20 {t.basePower}</span>
            </div>
            <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
              <div>
                <span className="text-gray-400 font-bold">{t.common}</span>
                <span className="text-vintage-ice/60 text-sm ml-2">(&lt; 0.70)</span>
              </div>
              <span className="text-vintage-gold font-bold">10 {t.basePower}</span>
            </div>
          </div>
        </div>
      ),
    },
    // Page 2: FID → Foil & Wear
    {
      title: t.fidSection || "FID Bonuses",
      content: (
        <div className="space-y-4">
          <p className="text-vintage-ice/80 text-sm mb-4">
            {t.fidDescription}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-vintage-gold/30">
                  <th className="text-left p-2 text-vintage-gold">{t.fidRange}</th>
                  <th className="text-left p-2 text-purple-300">{t.foilChances}</th>
                  <th className="text-left p-2 text-green-300">{t.wearChances}</th>
                </tr>
              </thead>
              <tbody className="text-vintage-ice/80">
                <tr className="border-b border-vintage-ice/10 bg-gradient-to-r from-yellow-900/20 to-transparent">
                  <td className="p-2 font-bold text-yellow-400">≤ 5,000 (OG)</td>
                  <td className="p-2 text-purple-400">100% {t.prizeFoil}</td>
                  <td className="p-2 text-green-400">100% {t.pristine}</td>
                </tr>
                <tr className="border-b border-vintage-ice/10">
                  <td className="p-2">5,001 - 20,000</td>
                  <td className="p-2">80% Prize / 20% Standard</td>
                  <td className="p-2">90% Pristine / 10% Mint</td>
                </tr>
                <tr className="border-b border-vintage-ice/10">
                  <td className="p-2">20,001 - 100,000</td>
                  <td className="p-2">30% Prize / 60% Standard</td>
                  <td className="p-2">50% Pristine / 40% Mint</td>
                </tr>
                <tr className="border-b border-vintage-ice/10">
                  <td className="p-2">100,001 - 250,000</td>
                  <td className="p-2">5% Prize / 35% Standard</td>
                  <td className="p-2">Mixed conditions</td>
                </tr>
                <tr>
                  <td className="p-2">&gt; 250,000</td>
                  <td className="p-2">Low foil chance</td>
                  <td className="p-2">Varied wear</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    // Page 3: Power Multipliers
    {
      title: t.powerMultipliers || "Power Multipliers",
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-vintage-black/40 p-4 rounded border border-vintage-gold/30">
              <h4 className="text-purple-300 font-bold mb-3">{t.foilMultipliers}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.prizeFoil}</span>
                  <span className="text-vintage-gold font-bold">×6.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.standardFoil}</span>
                  <span className="text-vintage-gold font-bold">×2.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.noFoil}</span>
                  <span className="text-vintage-gold font-bold">×1.0</span>
                </div>
              </div>
            </div>
            <div className="bg-vintage-black/40 p-4 rounded border border-vintage-gold/30">
              <h4 className="text-green-300 font-bold mb-3">{t.wearMultipliers}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.pristine}</span>
                  <span className="text-vintage-gold font-bold">×1.8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.mint}</span>
                  <span className="text-vintage-gold font-bold">×1.4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vintage-ice">{t.lightlyPlayed}</span>
                  <span className="text-vintage-gold font-bold">×1.0</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-vintage-black/40 rounded border border-vintage-gold/30">
            <div className="text-center text-sm sm:text-base">
              {t.powerFormula} <span className="text-vintage-gold font-bold">{t.basePowerLabel}</span> × <span className="text-purple-400 font-bold">{t.foilLabel}</span> × <span className="text-green-400 font-bold">{t.wearLabel}</span>
            </div>
            <div className="text-center text-xs sm:text-sm mt-2 text-vintage-ice/60">
              {t.example} Mythic (600) × Prize (6.0) × Pristine (1.8) = <span className="text-vintage-gold font-bold">6,480</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    AudioManager.buttonClick();
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    AudioManager.buttonClick();
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-vintage-gold/30 p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-vintage-gold">
              {pages[currentPage].title}
            </h2>
            <p className="text-vintage-ice/50 text-xs mt-1">
              {currentPage + 1} / {pages.length}
            </p>
          </div>
          <button
            onClick={() => {
              AudioManager.buttonClick();
              onClose();
            }}
            className="text-vintage-ice hover:text-vintage-gold text-2xl leading-none bg-vintage-black/70 rounded-full w-10 h-10 flex items-center justify-center border border-vintage-gold/30"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {pages[currentPage].content}
        </div>

        {/* Footer with Navigation */}
        <div className="border-t-2 border-vintage-gold/30 p-4 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold"
          >
            Prev
          </button>

          {/* Page Dots */}
          <div className="flex gap-2">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  AudioManager.buttonClick();
                  setCurrentPage(idx);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentPage
                    ? "bg-vintage-gold"
                    : "bg-vintage-gold/30 hover:bg-vintage-gold/50"
                }`}
              />
            ))}
          </div>

          {currentPage === pages.length - 1 ? (
            <button
              onClick={() => {
                AudioManager.buttonClick();
                onClose();
              }}
              className="px-4 py-2 bg-vintage-gold text-vintage-black rounded-lg hover:bg-vintage-burnt-gold transition-all font-bold"
            >
              {t.gotIt || "Got it"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-vintage-gold text-vintage-black rounded-lg hover:bg-vintage-burnt-gold transition-all font-bold"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
