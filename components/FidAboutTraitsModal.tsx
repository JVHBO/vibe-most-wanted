"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { fidTranslations } from "@/lib/fidTranslations";
import { AudioManager } from "@/lib/audio-manager";

interface FidAboutTraitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FidAboutTraitsModal({ isOpen, onClose }: FidAboutTraitsModalProps) {
  const { lang, setLang } = useLanguage();
  const t = fidTranslations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-4 sm:p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold">
              {t.aboutTraitsModalTitle}
            </h2>
            <button
              onClick={() => {
                AudioManager.buttonClick();
                onClose();
              }}
              className="text-vintage-ice hover:text-vintage-gold text-2xl sm:text-3xl leading-none bg-vintage-black/70 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Language Selector */}
          <select
            value={lang}
            onChange={(e) => {
              AudioManager.toggleOn();
              setLang(e.target.value as any);
            }}
            className="px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm"
          >
            <option value="en">🇺🇸 English</option>
            <option value="pt-BR">🇧🇷 Português</option>
            <option value="es">🇪🇸 Español</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="ru">🇷🇺 Русский</option>
            <option value="zh-CN">🇨🇳 中文</option>
            <option value="id">🇮🇩 Bahasa</option>
            <option value="fr">🇫🇷 Français</option>
          </select>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          <p className="text-vintage-ice text-sm sm:text-base leading-relaxed">
            {t.aboutTraitsModalIntro}
          </p>

          {/* VibeFID Benefits */}
          <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 rounded-lg border-2 border-vintage-gold p-4">
            <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
              <span>⭐</span> {t.vibeFidBenefits}
            </h3>
            <p className="text-vintage-ice/80 text-sm mb-4">
              {t.vibeFidBenefitsIntro}
            </p>
            <div className="space-y-3">
              {/* Power Boost */}
              <div className="bg-vintage-black/40 p-3 rounded border border-vintage-gold/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">⚡</span>
                  <span className="text-vintage-gold font-bold">{t.powerBoost}</span>
                </div>
                <p className="text-vintage-ice/70 text-sm ml-7">{t.powerBoostDesc}</p>
              </div>

              {/* Infinite Energy */}
              <div className="bg-vintage-black/40 p-3 rounded border border-vintage-gold/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">♾️</span>
                  <span className="text-vintage-gold font-bold">{t.infiniteEnergy}</span>
                </div>
                <p className="text-vintage-ice/70 text-sm ml-7">{t.infiniteEnergyDesc}</p>
              </div>

              {/* No Deck Restriction */}
              <div className="bg-vintage-black/40 p-3 rounded border border-vintage-gold/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🃏</span>
                  <span className="text-vintage-gold font-bold">{t.noDeckRestriction}</span>
                </div>
                <p className="text-vintage-ice/70 text-sm ml-7">{t.noDeckRestrictionDesc}</p>
              </div>
            </div>
          </div>

          {/* Neynar Score → Rarity */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg border-2 border-purple-500/50 p-4">
            <h3 className="text-lg sm:text-xl font-bold text-purple-300 mb-3 flex items-center gap-2">
              <span>📊</span> {t.neynarScoreSection}
            </h3>
            <p className="text-vintage-ice/80 text-sm mb-4">
              {t.neynarScoreDescription}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
                <div>
                  <span className="text-purple-400 font-bold">{t.mythic}</span>
                  <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.99)</span>
                </div>
                <span className="text-vintage-gold font-bold">800 {t.basePower}</span>
              </div>
              <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
                <div>
                  <span className="text-orange-400 font-bold">{t.legendary}</span>
                  <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.90)</span>
                </div>
                <span className="text-vintage-gold font-bold">240 {t.basePower}</span>
              </div>
              <div className="flex items-center justify-between bg-vintage-black/40 p-3 rounded">
                <div>
                  <span className="text-pink-400 font-bold">{t.epic}</span>
                  <span className="text-vintage-ice/60 text-sm ml-2">(≥ 0.79)</span>
                </div>
                <span className="text-vintage-gold font-bold">80 {t.basePower}</span>
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
                <span className="text-vintage-gold font-bold">5 {t.basePower}</span>
              </div>
            </div>
          </div>

          {/* FID → Foil & Wear */}
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-lg border-2 border-blue-500/50 p-4">
            <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 flex items-center gap-2">
              <span>🆔</span> {t.fidSection}
            </h3>
            <p className="text-vintage-ice/80 text-sm mb-4">
              {t.fidDescription}
            </p>

            {/* FID Ranges Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-blue-500/30">
                    <th className="text-left p-2 text-blue-300">{t.fidRange}</th>
                    <th className="text-left p-2 text-purple-300">{t.foilChances}</th>
                    <th className="text-left p-2 text-green-300">{t.wearChances}</th>
                  </tr>
                </thead>
                <tbody className="text-vintage-ice/80">
                  <tr className="border-b border-vintage-ice/10 bg-gradient-to-r from-yellow-900/20 to-transparent">
                    <td className="p-2 font-bold text-yellow-400">≤ 5,000 (OG)</td>
                    <td className="p-2">
                      <div className="text-purple-400 font-bold">100% {t.prizeFoil}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-green-400 font-bold">100% {t.pristine}</div>
                    </td>
                  </tr>
                  <tr className="border-b border-vintage-ice/10">
                    <td className="p-2">5,001 - 20,000</td>
                    <td className="p-2">
                      <div>80% {t.prizeFoil}</div>
                      <div>20% {t.standardFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>90% {t.pristine}</div>
                      <div>10% {t.mint}</div>
                    </td>
                  </tr>
                  <tr className="border-b border-vintage-ice/10">
                    <td className="p-2">20,001 - 100,000</td>
                    <td className="p-2">
                      <div>30% {t.prizeFoil}</div>
                      <div>60% {t.standardFoil}</div>
                      <div>10% {t.noFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>50% {t.pristine}</div>
                      <div>40% {t.mint}</div>
                      <div>10% {t.lightlyPlayed}</div>
                    </td>
                  </tr>
                  <tr className="border-b border-vintage-ice/10">
                    <td className="p-2">100,001 - 250,000</td>
                    <td className="p-2">
                      <div>5% {t.prizeFoil}</div>
                      <div>35% {t.standardFoil}</div>
                      <div>60% {t.noFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>2% {t.pristine}</div>
                      <div>18% {t.mint}</div>
                      <div>45% {t.lightlyPlayed}</div>
                      <div>30% {t.moderatelyPlayed}</div>
                      <div>5% {t.heavilyPlayed}</div>
                    </td>
                  </tr>
                  <tr className="border-b border-vintage-ice/10">
                    <td className="p-2">250,001 - 500,000</td>
                    <td className="p-2">
                      <div>3% {t.prizeFoil}</div>
                      <div>25% {t.standardFoil}</div>
                      <div>72% {t.noFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>5% {t.mint}</div>
                      <div>30% {t.lightlyPlayed}</div>
                      <div>55% {t.moderatelyPlayed}</div>
                      <div>10% {t.heavilyPlayed}</div>
                    </td>
                  </tr>
                  <tr className="border-b border-vintage-ice/10">
                    <td className="p-2">500,001 - 1,200,000</td>
                    <td className="p-2">
                      <div>1% {t.prizeFoil}</div>
                      <div>10% {t.standardFoil}</div>
                      <div>89% {t.noFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>5% {t.lightlyPlayed}</div>
                      <div>45% {t.moderatelyPlayed}</div>
                      <div>50% {t.heavilyPlayed}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">&gt; 1,200,000</td>
                    <td className="p-2">
                      <div>5% {t.standardFoil}</div>
                      <div>95% {t.noFoil}</div>
                    </td>
                    <td className="p-2">
                      <div>10% {t.moderatelyPlayed}</div>
                      <div className="text-gray-400">90% {t.heavilyPlayed}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Power Multipliers */}
          <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 rounded-lg border-2 border-vintage-gold p-4">
            <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
              <span>⚡</span> {t.powerMultipliers}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Foil Multipliers */}
              <div>
                <h4 className="text-purple-300 font-bold mb-2">{t.foilMultipliers}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t.prizeFoil}</span>
                    <span className="text-vintage-gold font-bold">×15.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.standardFoil}</span>
                    <span className="text-vintage-gold font-bold">×2.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.noFoil}</span>
                    <span className="text-vintage-gold font-bold">×1.0</span>
                  </div>
                </div>
              </div>

              {/* Wear Multipliers */}
              <div>
                <h4 className="text-green-300 font-bold mb-2">{t.wearMultipliers}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t.pristine}</span>
                    <span className="text-vintage-gold font-bold">×1.8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.mint}</span>
                    <span className="text-vintage-gold font-bold">×1.4</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.lightlyPlayed}</span>
                    <span className="text-vintage-gold font-bold">×1.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Power Formula */}
            <div className="mt-4 p-3 bg-vintage-black/40 rounded border border-vintage-gold/30">
              <div className="text-center text-sm sm:text-base">
                {t.powerFormula} <span className="text-vintage-gold font-bold">{t.basePowerLabel}</span> × <span className="text-purple-400 font-bold">{t.foilLabel}</span> × <span className="text-green-400 font-bold">{t.wearLabel}</span>
              </div>
              <div className="text-center text-xs sm:text-sm mt-2 text-vintage-ice/60">
                {t.example} Mythic (800) × Prize (15.0) × Pristine (1.8) = <span className="text-vintage-gold font-bold">21,600 {t.powerWord}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              AudioManager.buttonClick();
              onClose();
            }}
            className="w-full px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors"
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}
