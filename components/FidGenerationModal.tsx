'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FoilCardEffect from './FoilCardEffect';
import TypewriterText from './TypewriterText';
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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-vintage-ice hover:text-vintage-gold text-3xl leading-none z-10"
        >
          ×
        </button>

        {/* Language Selector - Top Right */}
        <div className="absolute top-4 left-4 z-10">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm"
          >
            <option value="en">🇺🇸 English</option>
            <option value="pt-BR">🇧🇷 Português</option>
            <option value="es">🇪🇸 Español</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="ru">🇷🇺 Русский</option>
            <option value="zh-CN">🇨🇳 中文</option>
          </select>
        </div>

        {/* Content */}
        <div className="p-8 pt-16">
          {currentSlide === 0 ? (
            // Slide 1: Criminal Backstory
            <div className="space-y-6">
              <h2 className="text-3xl font-display font-bold text-vintage-gold text-center mb-6">
                Criminal Record Generated
              </h2>

              <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/50 p-6 shadow-2xl">
                <div className="text-center mb-6 pb-4 border-b-2 border-vintage-gold/30">
                  <h3 className="text-3xl font-display font-bold text-vintage-gold mb-1">
                    CRIMINAL RECORD
                  </h3>
                  <p className="text-vintage-ice text-lg">{displayName}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-sm font-bold mb-1">WANTED FOR</p>
                      <p className="text-vintage-gold font-bold text-lg">{backstory.wantedFor}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-sm font-bold mb-1">DANGER LEVEL</p>
                      <p className={`font-bold text-lg ${
                        backstory.dangerLevel.includes('EXTREME') ? 'text-red-500' :
                        backstory.dangerLevel.includes('HIGH') ? 'text-orange-500' :
                        backstory.dangerLevel.includes('MEDIUM') ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {backstory.dangerLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-sm font-bold mb-1">DATE OF CRIME</p>
                      <p className="text-vintage-ice">{backstory.dateOfCrime}</p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-sm font-bold mb-1">KNOWN ASSOCIATES</p>
                      <p className="text-vintage-ice">{backstory.associates}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-sm font-bold mb-1">LAST SEEN</p>
                      <p className="text-vintage-ice">{backstory.lastSeen}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-vintage-black/40 rounded-lg p-4 border border-vintage-gold/20 min-h-[120px]">
                  <TypewriterText
                    text={backstory.story}
                    speed={15}
                    className="text-vintage-ice leading-relaxed text-justify block"
                  />
                </div>

                <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <p className="text-red-300 text-sm text-center font-bold">
                    ⚠️ WARNING: Approach with extreme caution
                  </p>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentSlide(1)}
                className="w-full px-6 py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-lg"
              >
                View Card →
              </button>
            </div>
          ) : (
            // Slide 2: Card Preview
            <div className="space-y-6">
              <h2 className="text-3xl font-display font-bold text-vintage-gold text-center mb-6">
                Your VibeFID Card
              </h2>

              <div className="flex flex-col items-center gap-6">
                {/* Card Image with Foil Effect */}
                {previewImage && generatedTraits && (
                  <FoilCardEffect
                    foilType={generatedTraits.foil === 'None' ? null : (generatedTraits.foil as 'Standard' | 'Prize')}
                    className="w-full max-w-md rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                  >
                    <img
                      src={previewImage}
                      alt="Card Preview"
                      className="w-full h-full object-cover"
                    />
                  </FoilCardEffect>
                )}

                {/* Generated Traits */}
                {generatedTraits && (
                  <div className="w-full max-w-md bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-6">
                    <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                      Card Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">Card:</span>{" "}
                        <span className={`font-bold ${generatedTraits.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                          {generatedTraits.rank}{generatedTraits.suitSymbol}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">Rarity:</span>{" "}
                        <span className="text-vintage-ice">{generatedTraits.rarity}</span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">Foil:</span>{" "}
                        <span className={`font-bold ${
                          generatedTraits.foil === 'Prize' ? 'text-purple-400' :
                          generatedTraits.foil === 'Standard' ? 'text-blue-400' :
                          'text-vintage-ice'
                        }`}>
                          {generatedTraits.foil}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">Wear:</span>{" "}
                        <span className="text-vintage-ice">{generatedTraits.wear}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-vintage-burnt-gold font-semibold">Power:</span>{" "}
                        <span className="text-vintage-gold font-bold text-lg">{generatedTraits.power}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentSlide(0)}
                  className="flex-1 px-6 py-4 bg-vintage-charcoal border-2 border-vintage-gold text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/20 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={onMint}
                  disabled={isMinting}
                  className="flex-1 px-6 py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50 text-lg"
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
