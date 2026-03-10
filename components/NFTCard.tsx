"use client";

import { memo, useState, useMemo, useCallback } from "react";
import FoilCardEffect from "@/components/FoilCardEffect";
import { CardMedia } from "@/components/CardMedia";
import { getCardDisplayPower } from "@/lib/power-utils";
import { convertIpfsUrl } from "@/lib/ipfs-url-converter";

export const NFTCard = memo(({ nft, selected, onSelect, locked = false, lockedReason }: { nft: any; selected: boolean; onSelect: (nft: any) => void; locked?: boolean; lockedReason?: string }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);

  const getRarityColor = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'from-orange-500 to-yellow-400';
    if (r.includes('epic')) return 'from-purple-500 to-pink-500';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-400';
    return 'from-gray-600 to-gray-500';
  };

  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const fallbacks = useMemo(() => {
    const allUrls = [];
    if (nft.imageUrl) allUrls.push(nft.imageUrl);
    if (nft?.raw?.metadata?.image) allUrls.push(String(nft.raw.metadata.image));
    [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl].forEach((url) => {
      if (url) allUrls.push(String(url));
    });
    if (nft?.metadata?.image) allUrls.push(String(nft.metadata.image));
    allUrls.push(`https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`);
    return [...new Set(allUrls)]
      .filter(url => url && !url.includes('undefined') && (url.startsWith('http') || url.startsWith('/')))
      .map(url => convertIpfsUrl(url) || url);
  }, [nft, tid]);

  const currentSrc = fallbacks[imgError] || fallbacks[fallbacks.length - 1];
  const foilValue = (nft.foil || '').trim();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;
    onSelect(nft);
  }, [nft, onSelect, locked]);

  return (
    <>
      <style>{`
        @keyframes holographic {
          0% { background-position: 0% 50%; filter: hue-rotate(0deg) brightness(1.2) saturate(1.5); }
          25% { background-position: 50% 100%; filter: hue-rotate(90deg) brightness(1.3) saturate(1.6); }
          50% { background-position: 100% 50%; filter: hue-rotate(180deg) brightness(1.4) saturate(1.7); }
          75% { background-position: 50% 0%; filter: hue-rotate(270deg) brightness(1.3) saturate(1.6); }
          100% { background-position: 0% 50%; filter: hue-rotate(360deg) brightness(1.2) saturate(1.5); }
        }
        @keyframes prizePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }
        @keyframes prizeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 140, 0, 0.4), 0 0 60px rgba(255, 0, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 140, 0, 0.6), 0 0 90px rgba(255, 0, 255, 0.5); }
        }
        @keyframes cardReflection {
          0% { transform: translateX(-200%) translateY(-200%) rotate(45deg); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: translateX(200%) translateY(200%) rotate(45deg); opacity: 0; }
        }
        @keyframes rainbowShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        .prize-card-ring { animation: prizeGlow 2s ease-in-out infinite; }
      `}</style>

      <div
        className={`relative group transition-all duration-300 ${locked ? 'opacity-50 cursor-not-allowed' : selected ? 'scale-95' : 'hover:scale-105'} ${locked ? '' : 'cursor-pointer'}`}
        onClick={handleClick}
        title={locked ? lockedReason : undefined}
        style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))' }}
      >
        <div className={`rounded-lg ${
          locked ? 'ring-2 ring-red-500/50' :
          selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
          'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
        }`}>
          <FoilCardEffect
            foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
            className="relative rounded-lg"
          >
            <div style={{ boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)' }} className="rounded-lg overflow-hidden">
              <CardMedia src={currentSrc} alt={`#${tid}`} className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none" loading="lazy" />

              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-1.5 pointer-events-none z-20">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}>{getCardDisplayPower(nft)}</span>
                  {selected && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                      <path d="M20 6L9 17L4 12" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pointer-events-none z-20">
                {nft.rarity && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow-lg">
                    {nft.rarity}
                  </div>
                )}
              </div>
              {locked && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30 rounded-lg">
                  <div className="text-3xl mb-1">⚔️</div>
                  <div className="text-[10px] text-white font-bold bg-red-600/80 px-2 py-0.5 rounded">
                    IN RAID
                  </div>
                </div>
              )}
            </div>
          </FoilCardEffect>
        </div>
      </div>
    </>
  );
});

NFTCard.displayName = 'NFTCard';
