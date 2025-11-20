'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FoilCardEffect from './FoilCardEffect';
import TypewriterText from './TypewriterText';
import { CardMedia } from './CardMedia';
import type { CriminalBackstory } from '@/lib/generateCriminalBackstory';

interface FidGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  backstory: CriminalBackstory | null;
  displayName: string;
  previewImage: string | null;
  generatedTraits: any;
  onMint: () => void;
  isMinting: boolean;
}

export default function FidGenerationModal({
  isOpen,
  onClose,
  backstory,
  displayName,
  previewImage,
  generatedTraits,
  onMint,
  isMinting,
}: FidGenerationModalProps) {
  const { lang, setLang } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = backstory, 1 = card

  if (!isOpen || !backstory) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-vintage-charcoal rounded-lg sm:rounded-xl border-2 border-vintage-gold w-full max-w-4xl my-auto relative max-h-[95vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-2 right-2 float-right text-vintage-ice hover:text-vintage-gold text-2xl sm:text-3xl leading-none z-10 bg-vintage-black/50 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        {/* Language Selector - Top Left (mobile friendly) */}
        <div className="sticky top-2 left-2 float-left z-10">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="px-2 py-1 sm:px-3 sm:py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-xs sm:text-sm"
          >
            <option value="en">🇺🇸</option>
            <option value="pt-BR">🇧🇷</option>
            <option value="es">🇪🇸</option>
            <option value="hi">🇮🇳</option>
            <option value="ru">🇷🇺</option>
            <option value="zh-CN">🇨🇳</option>
          </select>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 pt-12 sm:pt-16 clear-both">
          {currentSlide === 0 ? (
            // Slide 1: Criminal Backstory
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-3xl font-display font-bold text-vintage-gold text-center mb-4 sm:mb-6">
                Criminal Record Generated
              </h2>

              <div className="bg-vintage-charcoal/80 rounded-lg sm:rounded-xl border-2 border-vintage-gold/50 p-3 sm:p-6 shadow-2xl">
                <div className="text-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-vintage-gold/30">
                  <h3 className="text-xl sm:text-3xl font-display font-bold text-vintage-gold mb-1">
                    CRIMINAL RECORD
                  </h3>
                  <p className="text-vintage-ice text-sm sm:text-lg">{displayName}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                  {/* Left column */}
                  <div className="space-y-2 sm:space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">WANTED FOR</p>
                      <p className="text-vintage-gold font-bold text-sm sm:text-lg">{backstory.wantedFor}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">DANGER LEVEL</p>
                      <p className={`font-bold text-sm sm:text-lg ${
                        backstory.dangerLevel.includes('EXTREME') ? 'text-red-500' :
                        backstory.dangerLevel.includes('HIGH') ? 'text-orange-500' :
                        backstory.dangerLevel.includes('MEDIUM') ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {backstory.dangerLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">DATE OF CRIME</p>
                      <p className="text-vintage-ice text-sm">{backstory.dateOfCrime}</p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-2 sm:space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">KNOWN ASSOCIATES</p>
                      <p className="text-vintage-ice text-sm">{backstory.associates}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">LAST SEEN</p>
                      <p className="text-vintage-ice text-sm">{backstory.lastSeen}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-vintage-black/40 rounded-lg p-3 sm:p-4 border border-vintage-gold/20">
                  <TypewriterText
                    text={backstory.story}
                    speed={15}
                    className="text-vintage-ice text-xs sm:text-base leading-relaxed text-justify block"
                  />
                </div>

                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <p className="text-red-300 text-xs sm:text-sm text-center font-bold">
                    ⚠️ WARNING: Approach with extreme caution
                  </p>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentSlide(1)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-sm sm:text-lg"
              >
                View Card →
              </button>
            </div>
          ) : (
            // Slide 2: Card Preview
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-3xl font-display font-bold text-vintage-gold text-center mb-4 sm:mb-6">
                Your VibeFID Card
              </h2>

              <div className="flex flex-col items-center gap-4 sm:gap-6">
                {/* Card Image with Foil Effect */}
                {previewImage && generatedTraits && (
                  <FoilCardEffect
                    foilType={generatedTraits.foil === 'None' ? null : (generatedTraits.foil as 'Standard' | 'Prize')}
                    className="w-full max-w-sm sm:max-w-md rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                  >
                    <CardMedia
                      src={previewImage}
                      alt="Card Preview"
                      className="w-full h-full object-cover"
                    />
                  </FoilCardEffect>
                )}

                {/* Generated Traits */}
                {generatedTraits && (
                  <div className="w-full max-w-sm sm:max-w-md bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 sm:mb-4 text-center">
                      Card Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold text-xs sm:text-base">Card:</span>{" "}
                        <span className={`font-bold text-sm sm:text-base ${generatedTraits.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                          {generatedTraits.rank}{generatedTraits.suitSymbol}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold text-xs sm:text-base">Rarity:</span>{" "}
                        <span className="text-vintage-ice text-sm sm:text-base">{generatedTraits.rarity}</span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold text-xs sm:text-base">Foil:</span>{" "}
                        <span className={`font-bold text-sm sm:text-base ${
                          generatedTraits.foil === 'Prize' ? 'text-purple-400' :
                          generatedTraits.foil === 'Standard' ? 'text-blue-400' :
                          'text-vintage-ice'
                        }`}>
                          {generatedTraits.foil}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold text-xs sm:text-base">Wear:</span>{" "}
                        <span className="text-vintage-ice text-sm sm:text-base">{generatedTraits.wear}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-vintage-burnt-gold font-semibold text-xs sm:text-base">Power:</span>{" "}
                        <span className="text-vintage-gold font-bold text-base sm:text-lg">{generatedTraits.power}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={() => setCurrentSlide(0)}
                  className="flex-1 px-3 sm:px-6 py-3 sm:py-4 bg-vintage-charcoal border-2 border-vintage-gold text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/20 transition-colors text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  onClick={onMint}
                  disabled={isMinting}
                  className="flex-1 px-3 sm:px-6 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50 text-sm sm:text-lg"
                >
                  {isMinting ? "Minting..." : "Mint Card"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
