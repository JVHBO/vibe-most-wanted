'use client';

import { useState, useMemo, useRef } from 'react';
import { shareToFarcaster } from "@/lib/fid/share-utils";
import { useLanguage } from '@/contexts/LanguageContext';
import FoilCardEffect from './FoilCardEffect';
import TypewriterText from './TypewriterText';
import { CardMedia } from './CardMedia';
import { generateCriminalBackstory } from "@/lib/fid/generateCriminalBackstory";
import type { CriminalBackstoryData } from "@/lib/fid/generateCriminalBackstory";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import type { SupportedLanguage } from "@/lib/translations";
import { AudioManager } from "@/lib/fid/audio-manager";

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
  mintingStep?: string | null;
  mintError?: string | null;
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
  mintingStep,
  mintError,
  fid,
  onShare,
  username,
  walletAddress,
  onConnectWallet,
}: FidGenerationModalProps) {
  const { lang } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = backstory, 1 = card
  const [showShareLangModal, setShowShareLangModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const storyScrollRef = useRef<HTMLDivElement>(null);

  // Simple share to Farcaster (just text, no image generation)
  const handleShareFarcasterSimple = () => {
    if (!fid || !generatedTraits) return;

    const rarityEmojis: Record<string, string> = {
      'Mythic': '',
      'Legendary': '',
      'Epic': '',
      'Rare': '',
      'Common': ''
    };

    const emoji = rarityEmojis[generatedTraits.rarity] || '';
    const shareUrl = `https://vibefid.xyz/share/fid/${fid}`;
    const text = `Just minted my VibeFID!

${generatedTraits.rarity}
Power: ${generatedTraits.power}
FID #${fid}

Play Poker Battles
Fight in PvE
Earn coins

Mint yours! @jvhbo`;

    shareToFarcaster(text, shareUrl);
  };

  // Share to Farcaster with image generation (called after language selection)
  const handleShareFarcasterWithLang = async (selectedLang: SupportedLanguage) => {
    if (!fid || !generatedTraits || !backstoryData || !onShare) return;

    setIsGeneratingShare(true);
    setShowShareLangModal(false);

    try {
      // Call the onShare prop to generate and upload the share image
      await onShare(selectedLang);

      // Get translations for selected language
      const shareT = fidTranslations[selectedLang];

      // After image is generated and uploaded, share to Farcaster
      const foilText = generatedTraits.foil !== 'None' ? ` ${generatedTraits.foil} Foil` : '';

      const text = `${shareT.shareTextMinted}

${generatedTraits.rarity}${foilText}
Power: ${generatedTraits.power}
FID #${fid}

${shareT.shareTextPlayPoker}
${shareT.shareTextFightPvE}
${shareT.shareTextEarnCoins}

${shareT.shareTextMintYours}`;

      const shareUrl = `https://vibefid.xyz/share/fid/${fid}?lang=${selectedLang}&v=${Date.now()}`;
      shareToFarcaster(text, shareUrl);
    } catch (error) {
      console.error('Share failed:', error);
      // Fall back to simple share
      handleShareFarcasterSimple();
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Get translations for current language
  const t = fidTranslations[lang];

  // Minting step labels  
  const mintingSteps: Record<string, { label: string; progress: number }> = {
    uploading_card: { label: 'Uploading card...', progress: 15 },
    generating_share: { label: 'Generating share...', progress: 30 },
    uploading_share: { label: 'Uploading share...', progress: 45 },
    generating_video: { label: 'Generating video...', progress: 60 },
    uploading_video: { label: 'Uploading video...', progress: 75 },
    getting_signature: { label: 'Verifying...', progress: 85 },
    confirming_tx: { label: 'Confirm wallet...', progress: 95 },
  };
  const currentStepInfo = mintingStep ? mintingSteps[mintingStep] : null;

  // Regenerate backstory whenever language changes
  const backstory = useMemo(() => {
    if (!backstoryData) return null;
    return generateCriminalBackstory(backstoryData, lang);
  }, [backstoryData, lang]);

  if (!isOpen || !backstory) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-40 overflow-hidden" style={{ top: '56px', bottom: '64px' }}>
      <div className="bg-vintage-charcoal w-full h-full relative flex flex-col overflow-hidden">
        {/* Close button - top right */}
        <button
          onClick={() => {
            AudioManager.buttonClick();
            onClose();
          }}
          className="absolute top-2 right-2 text-vintage-ice hover:text-vintage-gold text-2xl leading-none z-10 bg-vintage-black/70 rounded-full w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >
          x
        </button>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {currentSlide === 0 ? (
            // Slide 1: Criminal Backstory
            <div className="space-y-3 w-full max-w-2xl mx-auto">
              <div className="bg-vintage-charcoal/80 rounded-lg border-2 border-vintage-gold/50 p-3 sm:p-4 shadow-2xl">
                <div className="text-center mb-3 pb-2 border-b-2 border-vintage-gold/30">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-vintage-gold mb-1">
                    {t.criminalRecord}
                  </h3>
                  <p className="text-vintage-ice text-sm">{displayName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                  {/* Left column */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs font-bold">{t.wantedFor}</p>
                      <p className="text-vintage-gold font-bold text-xs sm:text-sm break-words">{backstory.wantedFor}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs font-bold">{t.dangerLevel}</p>
                      <p className={`font-bold text-xs sm:text-sm break-words ${
                        backstory.dangerLevel.includes('EXTREME') || backstory.dangerLevel.includes('EXTREMO') ? 'text-red-500' :
                        backstory.dangerLevel.includes('HIGH') || backstory.dangerLevel.includes('ALTO') ? 'text-orange-500' :
                        backstory.dangerLevel.includes('MEDIUM') || backstory.dangerLevel.includes('MEDIO') ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {backstory.dangerLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs font-bold">{t.dateOfCrime}</p>
                      <p className="text-vintage-ice text-xs break-words">{backstory.dateOfCrime}</p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-vintage-burnt-gold text-xs font-bold">{t.knownAssociates}</p>
                      <p className="text-vintage-ice text-xs break-words">{backstory.associates}</p>
                    </div>
                    <div>
                      <p className="text-vintage-burnt-gold text-xs font-bold">{t.lastSeen}</p>
                      <p className="text-vintage-ice text-xs break-words">{backstory.lastSeen}</p>
                    </div>
                  </div>
                </div>

                {/* Story text with scroll area */}
                <div
                  ref={storyScrollRef}
                  className="bg-vintage-black/40 rounded-lg p-3 border border-vintage-gold/20 h-32 sm:h-40 overflow-y-auto"
                >
                  <TypewriterText
                    text={backstory.story}
                    speed={35}
                    className="text-vintage-ice text-xs sm:text-sm leading-relaxed block"
                    scrollContainerRef={storyScrollRef}
                  />
                </div>

                <div className="mt-3 p-2 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <p className="text-red-300 text-xs text-center font-bold">
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
                className="w-full px-4 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-sm"
              >
                {t.viewCard}
              </button>
            </div>
          ) : (
            // Slide 2: Card Preview
            <div className="space-y-3 w-full max-w-md mx-auto">
              <h2 className="text-lg sm:text-xl font-display font-bold text-vintage-gold text-center">
                {t.yourVibeFidCard}
              </h2>

              {/* Card + Stats */}
              <div className="flex flex-col items-center gap-3 w-full">
                {/* Card Image with Foil Effect */}
                {previewImage && generatedTraits && (
                  <div className="relative w-full max-w-[200px] sm:max-w-[250px]">
                    <FoilCardEffect
                      foilType={generatedTraits.foil === 'None' ? null : (generatedTraits.foil as 'Standard' | 'Prize')}
                      className="w-full rounded-lg shadow-2xl border-2 border-vintage-gold overflow-hidden box-border"
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
                      <div className="bg-vintage-black/80 border border-vintage-gold rounded px-4 py-2 backdrop-blur-sm">
                        <p className="text-vintage-gold font-bold text-sm text-center">
                          {t.mintToReveal || 'Mint to Reveal'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated Traits */}
                {generatedTraits && (
                  <div className="w-full max-w-[200px] sm:max-w-[250px] bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-2" style={{ filter: 'blur(4px)' }}>
                    <div className="grid grid-cols-2 gap-1 text-xs">
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

              {/* Action Buttons */}
              {!isMintedSuccessfully ? (
                <div className="flex flex-col gap-2 w-full">
                  {/* Mint Price */}
                  <div className="text-center py-2 bg-vintage-black/30 rounded border border-vintage-gold/20">
                    <p className="text-vintage-gold font-bold text-sm">
                      {t.mintPrice || 'Mint Price'}: 0.0003 ETH <span className="text-vintage-ice/50 text-xs">~$0.90</span>
                    </p>
                  </div>

                  {/* Wallet status */}
                  {walletAddress ? (
                    <p className="text-center text-xs text-green-400">
                      Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-center text-xs text-yellow-400">
                      Wallet not connected
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        AudioManager.buttonClick();
                        setCurrentSlide(0);
                      }}
                      className="flex-1 px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/20 transition-colors text-sm"
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
                        className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Connect Wallet
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          console.log('🔴 MINT BUTTON CLICKED');
                          AudioManager.buttonClick();
                          onMint();
                        }}
                        disabled={isMinting || !walletAddress}
                        className="flex-1 px-4 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50 text-sm"
                      >
                        {isMinting ? t.minting : t.mintCard}
                      </button>
                    )}
                  </div>

                  {/* Error Display */}
                  {mintError && !isMinting && (
                    <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded-lg">
                      <p className="text-red-300 text-sm text-center">{mintError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 w-full">
                  <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 text-center">
                    <p className="text-green-300 font-bold text-sm">Card minted successfully!</p>
                    {fid && <p className="text-vintage-ice text-xs">FID: {fid}</p>}
                  </div>

                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => {
                        AudioManager.buttonClick();
                        setShowShareLangModal(true);
                      }}
                      disabled={isGeneratingShare}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors text-xs disabled:opacity-50"
                    >
                      {isGeneratingShare ? 'Generating...' : 'Share to Farcaster'}
                    </button>
                  </div>

                  {fid && (
                    <a
                      href={`/fid/${fid}`}
                      className="block w-full px-4 py-2 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors text-center text-sm"
                    >
                      View Card Page
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
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 max-w-sm w-full">
              <h2 className="text-lg font-bold text-vintage-gold mb-3 text-center">
                {t.shareToFarcaster || 'Share to Farcaster'}
              </h2>

              <p className="text-vintage-ice text-xs mb-4 text-center">
                {t.selectLanguageForShare || 'Select language for image:'}
              </p>

              {/* Language Options */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { code: 'en', name: 'EN' },
                  { code: 'pt-BR', name: 'PT' },
                  { code: 'es', name: 'ES' },
                  { code: 'ja', name: 'JP' },
                  { code: 'zh-CN', name: 'CN' },
                  { code: 'ru', name: 'RU' },
                  { code: 'hi', name: 'HI' },
                  { code: 'fr', name: 'FR' },
                  { code: 'id', name: 'ID' },
                ].map((langOption) => (
                  <button
                    key={langOption.code}
                    onClick={() => {
                      AudioManager.buttonClick();
                      setShowShareLangModal(false);
                      handleShareFarcasterWithLang(langOption.code as any);
                    }}
                    className="p-2 rounded-lg border-2 transition-all hover:border-vintage-gold hover:bg-vintage-gold/10 border-vintage-gold/30 bg-vintage-black/50"
                  >
                    <span className="text-vintage-gold font-semibold text-sm">{langOption.name}</span>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowShareLangModal(false);
                }}
                className="w-full px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"
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
