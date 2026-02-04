"use client";

import { CardMedia } from '@/components/CardMedia';
import { NotEnoughCardsGuide } from '@/components/NotEnoughCardsGuide';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getCardDisplayPower } from '@/lib/power-utils';
import { getCardUniqueId, filterCardsByCollections, type CollectionId } from '@/lib/collections/index';
import { isSameCard } from '@/lib/nft';
import { AudioManager } from '@/lib/audio-manager';

interface BattleCard {
  imageUrl?: string;
  tokenId?: string;
  rarity?: string;
  power?: number;
  collection?: string;
  [key: string]: any;
}

interface DefenseDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: BattleCard[];
  status: string;
  selectedCards: BattleCard[];
  setSelectedCards: (cards: BattleCard[]) => void;
  handSize: number;
  defenseDeckCollection: CollectionId | 'all';
  setDefenseDeckCollection: (v: CollectionId | 'all') => void;
  defenseDeckSortByPower: boolean;
  setDefenseDeckSortByPower: (v: boolean) => void;
  soundEnabled: boolean;
  selectStrongest: () => void;
  clearSelection: () => void;
  saveDefenseDeck: () => Promise<void>;
  t: (key: string) => string;
}

export function DefenseDeckModal({
  isOpen,
  onClose,
  nfts,
  status,
  selectedCards,
  setSelectedCards,
  handSize,
  defenseDeckCollection,
  setDefenseDeckCollection,
  defenseDeckSortByPower,
  setDefenseDeckSortByPower,
  soundEnabled,
  selectStrongest,
  clearSelection,
  saveDefenseDeck,
  t,
}: DefenseDeckModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-vintage-gold/30">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-bold text-vintage-gold">
              {"\u{1F6E1}\uFE0F"} Defense Deck
            </h2>
            <button
              onClick={onClose}
              className="text-vintage-gold hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-vintage-burnt-gold mt-1">
            Select 5 cards to defend against attacks
          </p>
        </div>

        {/* Not enough cards warning */}
        {nfts.length < handSize && (status === "loaded" || status === "failed") && (
          <NotEnoughCardsGuide
            currentCards={nfts.length}
            requiredCards={handSize}
            gameMode="defense"
            onClose={onClose}
            t={t}
          />
        )}

        {/* Normal UI - only show if enough cards or still loading */}
        {(nfts.length >= handSize || status === "fetching" || status === "idle") && (
        <>
        {/* Controls Row: Collection Filter + Sort */}
        <div className="flex-shrink-0 px-4 pt-3 flex flex-wrap items-center justify-center gap-2">
          <select
            value={defenseDeckCollection}
            onChange={(e) => setDefenseDeckCollection(e.target.value as CollectionId | 'all')}
            className="px-3 py-2 rounded-lg text-sm font-modern font-medium bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
          >
            <option value="all">All Collections</option>
            <option value="vibe">VBMS</option>
            <option value="viberotbangers">BANGER</option>
            <option value="cumioh">CUMIO</option>
            <option value="historyofcomputer">HSTR</option>
            <option value="vibefx">VBFX</option>
            <option value="baseballcabal">BBCL</option>
            <option value="tarot">TRT</option>
            <option value="teampothead">TMPT</option>
            <option value="poorlydrawnpepes">PDP</option>
            <option value="meowverse">MEOVV</option>
            <option value="viberuto">VBRTO</option>
            <option value="vibefid">VIBEFID</option>
            <option value="gmvbrs">VBRS</option>
            <option value="nothing">NOTHING</option>
          </select>
          <button
            onClick={() => {
              setDefenseDeckSortByPower(!defenseDeckSortByPower);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              defenseDeckSortByPower
                ? 'bg-vintage-gold text-vintage-black'
                : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
            }`}
          >
            {defenseDeckSortByPower ? '\u26A1 Sorted by Power' : '\u26A1 Sort by Power'}
          </button>
        </div>

        {/* Selected Cards Preview */}
        <div className="flex-shrink-0 p-4 bg-vintage-felt-green/30 border-b border-vintage-gold/20">
          <div className="grid grid-cols-5 gap-2">
            {selectedCards.map((c, i) => (
              <div
                key={i}
                onClick={() => {
                  setSelectedCards(selectedCards.filter((_, idx) => idx !== i));
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold cursor-pointer hover:ring-red-500 transition-all group"
              >
                <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{getCardDisplayPower(c)}</div>
                <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/30 flex items-center justify-center transition-all">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-2xl font-bold">×</span>
                </div>
              </div>
            ))}
            {[...Array(handSize - selectedCards.length)].map((_, i) => (
              <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                <span className="text-2xl font-bold">+</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3">
            <div className="text-vintage-gold font-modern">
              <span className="font-bold">{selectedCards.length}/{handSize}</span> cards selected
            </div>
            <div className="flex gap-2">
              {nfts.length >= handSize && selectedCards.length === 0 && (
                <button
                  onClick={() => {
                    selectStrongest();
                    if (soundEnabled) AudioManager.buttonSuccess();
                  }}
                  className="px-3 py-1 bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-gold/30 transition font-modern font-semibold"
                >
                  Select Strongest
                </button>
              )}
              {selectedCards.length > 0 && (
                <button
                  onClick={() => {
                    clearSelection();
                    if (soundEnabled) AudioManager.buttonClick();
                  }}
                  className="px-3 py-1 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-black/70 transition font-modern"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          {(status === "fetching" || nfts.length === 0) ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-vintage-gold/70 text-sm mt-2 font-modern">Loading cards...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {(() => {
                let filteredCards = defenseDeckCollection === 'all'
                  ? nfts
                  : filterCardsByCollections(nfts, [defenseDeckCollection as CollectionId]);
                if (defenseDeckSortByPower) {
                  filteredCards = [...filteredCards].sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
                }
                return filteredCards;
              })().map((nft) => {
                const isSelected = selectedCards.some(c => isSameCard(c, nft));
                return (
                  <div
                    key={getCardUniqueId(nft)}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCards(selectedCards.filter(c => !isSameCard(c, nft)));
                      } else if (selectedCards.length < handSize) {
                        setSelectedCards([...selectedCards, nft]);
                      }
                      if (soundEnabled) AudioManager.selectCardByRarity(nft.rarity);
                    }}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-vintage-gold shadow-gold scale-95 opacity-50'
                        : 'hover:ring-2 hover:ring-vintage-gold/50 hover:scale-105'
                    } ${selectedCards.length >= handSize && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <CardMedia src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{getCardDisplayPower(nft)}</div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-vintage-gold/30 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">{"\u2713"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-vintage-gold/30 flex gap-3">
          <button
            onClick={() => {
              onClose();
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className="flex-1 px-4 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await saveDefenseDeck();
              onClose();
            }}
            disabled={selectedCards.length !== handSize}
            className={`flex-1 px-4 py-3 rounded-lg font-bold transition ${
              selectedCards.length === handSize
                ? 'bg-vintage-gold hover:bg-yellow-500 text-vintage-black'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {selectedCards.length === handSize ? 'Save Defense Deck' : `Select ${handSize - selectedCards.length} more`}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
