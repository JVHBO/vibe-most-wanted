'use client';

import { useState, useMemo } from 'react';
import { shareToFarcaster } from '@/lib/share-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import FoilCardEffect from './FoilCardEffect';
import TypewriterText from './TypewriterText';
import { CardMedia } from './CardMedia';
import { generateCriminalBackstory } from '@/lib/generateCriminalBackstory';
import type { CriminalBackstoryData } from '@/lib/generateCriminalBackstory';
import { fidTranslations } from '@/lib/fidTranslations';
import type { SupportedLanguage } from '@/lib/translations';
import { AudioManager } from '@/lib/audio-manager';

interface FidGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  backstoryData: CriminalBackstoryData | null;
  displayName: string;
  previewImage: string | null;
  generatedTraits: any;
  onMint: () => void;
  isMinting: boolean;
  isMintedSuccessfully?: boolean;
  fid?: number;
  onShare?: (lang: SupportedLanguage) => void;
  username?: string;
  walletAddress?: string;
  onConnectWallet?: () => void;
}

export default function FidGenerationModal({
  isOpen,
  onClose,
  backstoryData,
  displayName,
  previewImage,
  generatedTraits,
  onMint,
  isMinting,
  isMintedSuccessfully = false,
  fid,
  onShare,
  username,
  walletAddress,
  onConnectWallet,
}: FidGenerationModalProps) {
  const { lang, setLang } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = backstory, 1 = card
  const [showShareLangModal, setShowShareLangModal] = useState(false);

  const handleShareFarcaster = () => {
    if (!fid || !generatedTraits) return;

    const rarityEmojis: Record<string, string> = {
      'Mythic': '🌟',
      'Legendary': '💎',
      'Epic': '💎',
      'Rare': '💜',
      'Common': '⚪'
    };

    const emoji = rarityEmojis[generatedTraits.rarity] || '💎';
    const shareUrl = `https://www.vibemostwanted.xyz/share/fid/${fid}`;
    const text = `🃏 Just minted my VibeFID!

${emoji} ${generatedTraits.rarity}
⚡ ${generatedTraits.power} Power
🎯 FID #${fid}

🎲 Play Poker Battles
🗡️ Fight in PvE
💰 Earn coins

🎮 Mint yours! @jvhbo`;

    shareToFarcaster(text, shareUrl);
  };

  // Get translations for current language
  const t = fidTranslations[lang];

  // Regenerate backstory whenever language changes
  const backstory = useMemo(() => {
    if (!backstoryData) return null;
    return generateCriminalBackstory(backstoryData, lang);
  }, [backstoryData, lang]);

  if (!isOpen || !backstory) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-0 sm:p-2 md:p-4 z-50 overflow-hidden">
      <div className="bg-vintage-charcoal rounded-none sm:rounded-xl border-2 border-vintage-gold w-screen h-screen sm:w-full sm:h-auto sm:max-w-lg md:max-w-2xl lg:max-w-4xl relative sm:max-h-[95vh] overflow-y-auto overflow-x-hidden box-border flex flex-col">
        {/* Close button */}
        <button
          onClick={() => {
            AudioManager.buttonClick();
            onClose();
          }}
          className="sticky top-2 right-2 float-right text-vintage-ice hover:text-vintage-gold text-xl sm:text-2xl md:text-3xl leading-none z-10 bg-vintage-black/70 rounded-full w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        {/* Language Selector - Top Left (mobile friendly) */}
        <div className="sticky top-2 left-2 float-left z-10">
          <select
            value={lang}
            onChange={(e) => {
              AudioManager.toggleOn();
              setLang(e.target.value as any);
            }}
            className="px-2 py-1 sm:px-3 sm:py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-md sm:rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-xs sm:text-sm"
          >
            <option value="en">🇺🇸</option>
            <option value="pt-BR">🇧🇷</option>
            <option value="es">🇪🇸</option>
            <option value="hi">🇮🇳</option>
            <option value="ru">🇷🇺</option>
            <option value="zh-CN">🇨🇳</option>
            <option value="id">🇮🇩</option>
            <option value="fr">🇫🇷</option>
            <option value="ja">🇯🇵</option>
          </select>
        </div>

        {/* Content */}
        <div className="p-2 sm:p-4 md:p-6 lg:p-8 pt-2 sm:pt-4 md:pt-6 clear-both w-full max-w-full box-border overflow-x-hidden flex-1 overflow-y-auto">
          {currentSlide === 0 ? (
            // Slide 1: Criminal Backstory
            <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
              <div className="bg-vintage-charcoal/80 rounded-lg sm:rounded-xl border-2 border-vintage-gold/50 p-2 sm:p-4 md:p-6 shadow-2xl w-full max-w-full box-border">
                <div className="text-center mb-3 sm:mb-6 pb-2 sm:pb-4 border-b-2 border-vintage-gold/30">
                  <h3 className="text-base sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold mb-1">
                    {t.criminalRecord}
                  </h3>
                  <p className="text-vintage-ice text-sm sm:text-base md:text-lg break-words px-2">{displayName}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 md:gap-6 mb-3 sm:mb-6 w-full max-w-full overflow-x-hidden">
                  {/* Left column */}
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">{t.wantedFor}</p>
                      <p className="text-vintage-gold font-bold text-xs sm:text-base md:text-lg break-words">{backstory.wantedFor}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">{t.dangerLevel}</p>
                      <p className={`font-bold text-xs sm:text-base md:text-lg break-words ${
                        backstory.dangerLevel.includes('EXTREME') || backstory.dangerLevel.includes('ЭКСТРЕМАЛЬНЫЙ') || backstory.dangerLevel.includes('极端') || backstory.dangerLevel.includes('अत्यधिक') || backstory.dangerLevel.includes('EXTREMO') ? 'text-red-500' :
                        backstory.dangerLevel.includes('HIGH') || backstory.dangerLevel.includes('ВЫСОКИЙ') || backstory.dangerLevel.includes('高') || backstory.dangerLevel.includes('उच्च') || backstory.dangerLevel.includes('ALTO') ? 'text-orange-500' :
                        backstory.dangerLevel.includes('MEDIUM') || backstory.dangerLevel.includes('СРЕДНИЙ') || backstory.dangerLevel.includes('中') || backstory.dangerLevel.includes('मध्यम') || backstory.dangerLevel.includes('MEDIO') || backstory.dangerLevel.includes('MÉDIO') ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {backstory.dangerLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">{t.dateOfCrime}</p>
                      <p className="text-vintage-ice text-xs sm:text-sm break-words">{backstory.dateOfCrime}</p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">{t.knownAssociates}</p>
                      <p className="text-vintage-ice text-xs sm:text-sm break-words">{backstory.associates}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs sm:text-sm font-bold mb-1">{t.lastSeen}</p>
                      <p className="text-vintage-ice text-xs sm:text-sm break-words">{backstory.lastSeen}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-vintage-black/40 rounded-lg p-3 sm:p-4 border border-vintage-gold/20">
                  <TypewriterText
                    text={backstory.story}
                    speed={35}
                    className="text-vintage-ice text-xs sm:text-base leading-relaxed text-justify block"
                  />
                </div>

                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <p className="text-red-300 text-xs sm:text-sm text-center font-bold">
                    {t.warningCaution}
                  </p>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setCurrentSlide(1);
                }}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-sm sm:text-base"
              >
                {t.viewCard}
              </button>
            </div>
          ) : (
            // Slide 2: Card Preview - Stacked layout, compact to avoid scroll
            <div className="space-y-2 sm:space-y-3 w-full max-w-full overflow-x-hidden pb-32 sm:pb-0">
              <h2 className="text-base sm:text-xl md:text-2xl font-display font-bold text-vintage-gold text-center px-1 break-words">
                {t.yourVibeFidCard}
              </h2>

              {/* Card + Stats stacked */}
              <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
                {/* Card Image with Foil Effect - Compact size */}
                {previewImage && generatedTraits && (
                  <div className="relative w-full max-w-[180px] sm:max-w-[280px] md:max-w-sm">
                    <FoilCardEffect
                      foilType={generatedTraits.foil === 'None' ? null : (generatedTraits.foil as 'Standard' | 'Prize')}
                      className="w-full rounded-lg shadow-2xl border-2 sm:border-4 border-vintage-gold overflow-hidden box-border"
                      style={{ filter: 'blur(8px)' }}
                    >
                      <CardMedia
                        src={previewImage}
                        alt="Card Preview"
                        className="w-full h-full object-cover"
                      />
                    </FoilCardEffect>

                    {/* Overlay text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-vintage-black/80 border border-vintage-gold rounded px-3 py-1.5 sm:px-6 sm:py-3 backdrop-blur-sm">
                        <p className="text-vintage-gold font-bold text-xs sm:text-base text-center">
                          {t.mintToReveal || 'Mint to Reveal'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated Traits - Compact */}
                {generatedTraits && (
                  <div className="w-full max-w-[180px] sm:max-w-[280px] bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-2 sm:p-3 box-border" style={{ filter: 'blur(4px)' }}>
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[11px] sm:text-sm">
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">{t.card}:</span>{" "}
                        <span className={`font-bold ${generatedTraits.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                          {generatedTraits.rank}{generatedTraits.suitSymbol}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">{t.rarity}:</span>{" "}
                        <span className="text-vintage-ice">{generatedTraits.rarity}</span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">{t.foil}:</span>{" "}
                        <span className={`font-bold ${
                          generatedTraits.foil === 'Prize' ? 'text-purple-400' :
                          generatedTraits.foil === 'Standard' ? 'text-blue-400' :
                          'text-vintage-ice'
                        }`}>
                          {generatedTraits.foil}
                        </span>
                      </div>
                      <div>
                        <span className="text-vintage-burnt-gold font-semibold">{t.power}:</span>{" "}
                        <span className="text-vintage-gold font-bold">{generatedTraits.power}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Fixed on mobile with Mint Price inside */}
              {!isMintedSuccessfully ? (
                <div className="fixed sm:relative bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto flex flex-col gap-1 sm:gap-3 w-full max-w-full box-border p-2 sm:p-0 bg-vintage-charcoal sm:bg-transparent border-t-2 sm:border-t-0 border-vintage-gold/30">
                  {/* Mint Price - Inside fixed bar on mobile */}
                  <div className="text-center py-1 bg-vintage-black/30 rounded border border-vintage-gold/20">
                    <p className="text-vintage-gold font-bold text-sm sm:text-xl">
                      {t.mintPrice || 'Mint Price'}: 0.0003 ETH <span className="text-vintage-ice/50 text-xs">~$0.90</span>
                    </p>
                  </div>
                  {/* Show wallet status */}
                  {walletAddress ? (
                    <p className="text-center text-xs text-green-400">
                      ✅ Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-center text-xs text-yellow-400">
                      ⚠️ Wallet not connected
                    </p>
                  )}

                  <div className="flex gap-2 sm:gap-4">
                    <button
                      onClick={() => {
                        AudioManager.buttonClick();
                        setCurrentSlide(0);
                      }}
                      className="flex-1 px-3 sm:px-6 py-3 sm:py-4 bg-vintage-charcoal border-2 border-vintage-gold text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/20 transition-colors text-xs sm:text-sm md:text-base"
                    >
                      {t.back}
                    </button>

                    {/* Show Connect Wallet button if not connected, otherwise show Mint */}
                    {!walletAddress && onConnectWallet ? (
                      <button
                        onClick={() => {
                          AudioManager.buttonClick();
                          onConnectWallet();
                        }}
                        className="flex-1 px-3 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm md:text-base"
                      >
                        🔗 Connect Wallet
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          AudioManager.buttonClick();
                          onMint();
                        }}
                        disabled={isMinting || !walletAddress}
                        className="flex-1 px-3 sm:px-6 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50 text-xs sm:text-sm md:text-base"
                      >
                        {isMinting ? t.minting : t.mintCard}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 w-full">
                  <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-green-300 font-bold text-sm sm:text-base">✅ Card minted successfully!</p>
                    {fid && <p className="text-vintage-ice text-xs sm:text-sm">FID: {fid}</p>}
                  </div>

                  <div className="flex gap-2 sm:gap-3 w-full">
                    {onShare && (
                      <button
                        onClick={() => {
                          AudioManager.buttonClick();
                          setShowShareLangModal(true);
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                      >
                        📤 Download
                      </button>
                    )}

                    <button
                      onClick={() => {
                        AudioManager.buttonClick();
                        handleShareFarcaster();
                      }}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm"
                    >
                      🎭 Share
                    </button>
                  </div>

                  {fid && (
                    <a
                      href={`/fid/${fid}`}
                      className="block w-full px-3 sm:px-6 py-2 sm:py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-center text-xs sm:text-sm"
                    >
                      View Card Page →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Language Selection Modal */}
        {showShareLangModal && onShare && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 sm:p-6 max-w-sm w-full">
              <h2 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 text-center">
                📤 {t.download || 'Download'}
              </h2>

              <p className="text-vintage-ice text-xs sm:text-sm mb-4 text-center">
                {t.selectLanguageForShare || 'Select language for image:'}
              </p>

              {/* Language Options */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { code: 'en', flag: '🇺🇸', name: 'EN' },
                  { code: 'pt-BR', flag: '🇧🇷', name: 'PT' },
                  { code: 'es', flag: '🇪🇸', name: 'ES' },
                  { code: 'ja', flag: '🇯🇵', name: 'JP' },
                  { code: 'zh-CN', flag: '🇨🇳', name: 'CN' },
                  { code: 'ru', flag: '🇷🇺', name: 'RU' },
                  { code: 'hi', flag: '🇮🇳', name: 'HI' },
                  { code: 'fr', flag: '🇫🇷', name: 'FR' },
                  { code: 'id', flag: '🇮🇩', name: 'ID' },
                ].map((langOption) => (
                  <button
                    key={langOption.code}
                    onClick={() => {
                      AudioManager.buttonClick();
                      setShowShareLangModal(false);
                      onShare(langOption.code as any);
                    }}
                    className="p-2 sm:p-3 rounded-lg border-2 transition-all hover:border-vintage-gold hover:bg-vintage-gold/10 border-vintage-gold/30 bg-vintage-black/50"
                  >
                    <span className="text-xl sm:text-2xl block">{langOption.flag}</span>
                    <span className="text-vintage-gold font-semibold text-[10px] sm:text-xs">{langOption.name}</span>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowShareLangModal(false);
                }}
                className="w-full px-4 py-2 sm:py-3 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"
              >
                {t.back || 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
