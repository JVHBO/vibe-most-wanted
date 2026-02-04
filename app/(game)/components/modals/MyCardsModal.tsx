"use client";

import { CardMedia } from '@/components/CardMedia';
import { getCardUniqueId } from '@/lib/collections/index';
import { AudioManager } from '@/lib/audio-manager';
import Link from 'next/link';

interface CardNft {
  imageUrl?: string;
  tokenId: string;
  name?: string;
  rarity?: string;
  [key: string]: any;
}

interface MyCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: CardNft[];
  soundEnabled: boolean;
}

export function MyCardsModal({ isOpen, onClose, nfts, soundEnabled }: MyCardsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 pt-14 pb-20"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold/50 w-full max-h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-3 border-b border-vintage-gold/30">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display font-bold text-vintage-gold">
              My Cards ({nfts.length})
            </h2>
            <button
              onClick={onClose}
              className="text-vintage-gold hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {nfts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {nfts.map((nft) => (
                <div
                  key={getCardUniqueId(nft)}
                  className={`aspect-[2/3] rounded-lg overflow-hidden border-2 ${
                    nft.rarity === 'Mythic' ? 'border-pink-400' :
                    nft.rarity === 'Legendary' ? 'border-yellow-400' :
                    nft.rarity === 'Epic' ? 'border-purple-400' :
                    nft.rarity === 'Rare' ? 'border-blue-400' :
                    'border-vintage-gold/30'
                  }`}
                >
                  <CardMedia
                    src={nft.imageUrl || ''}
                    alt={nft.name || 'Card'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-vintage-gold/50 text-sm">No cards yet</span>
              <Link
                href="/shop"
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  onClose();
                }}
                className="mt-4 px-4 py-2 bg-vintage-gold text-vintage-black rounded-lg font-semibold text-sm"
              >
                Get Cards
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
