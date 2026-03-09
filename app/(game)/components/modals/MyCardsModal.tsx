"use client";

import { useState } from 'react';
import { CardMedia } from '@/components/CardMedia';
import { getCardUniqueId } from '@/lib/collections/index';
import { AudioManager } from '@/lib/audio-manager';
import Link from 'next/link';

const CARDS_PER_PAGE = 6;

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
  const [page, setPage] = useState(0);

  if (!isOpen) return null;

  const totalPages = Math.ceil(nfts.length / CARDS_PER_PAGE);
  const pageCards = nfts.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  const goTo = (p: number) => {
    if (soundEnabled) AudioManager.buttonClick();
    setPage(p);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-2 pt-14 pb-20"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold/50 w-full flex flex-col shadow-2xl"
        style={{ maxHeight: 'calc(100dvh - 140px)' }}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {nfts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {pageCards.map((nft) => (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 p-3 border-t border-vintage-gold/30 flex items-center justify-between gap-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page === 0}
              className="px-3 py-1.5 bg-vintage-black border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-bold disabled:opacity-30 flex-shrink-0"
            >
              ←
            </button>

            <div className="flex items-center gap-1 overflow-hidden">
              {(() => {
                const items: (number | 'dot')[] = [];
                for (let i = 0; i < totalPages; i++) {
                  if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
                    items.push(i);
                  } else if (items[items.length - 1] !== 'dot') {
                    items.push('dot');
                  }
                }
                return items.map((item, idx) =>
                  item === 'dot' ? (
                    <span key={`dot-${idx}`} className="text-vintage-gold/50 text-xs px-0.5">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goTo(item)}
                      className={`w-7 h-7 rounded text-xs font-bold flex-shrink-0 transition-all ${
                        item === page
                          ? 'bg-vintage-gold text-vintage-black'
                          : 'bg-vintage-black text-vintage-gold border border-vintage-gold/30'
                      }`}
                    >
                      {item + 1}
                    </button>
                  )
                );
              })()}
            </div>

            <button
              onClick={() => goTo(page + 1)}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 bg-vintage-black border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-bold disabled:opacity-30 flex-shrink-0"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
