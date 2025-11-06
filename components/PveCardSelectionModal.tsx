/**
 * PvE Card Selection Modal Component
 *
 * Modal for selecting cards to battle against AI in PvE mode
 */

import { AudioManager } from '@/lib/audio-manager';
import FoilCardEffect from '@/components/FoilCardEffect';

interface NFT {
  tokenId: string;
  power?: number;
  imageUrl: string;
  foil?: string;
}

interface PveCardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDifficultyModalOpen: boolean;
  t: (key: any) => string;
  handSize: number;
  pveSelectedCards: NFT[];
  setPveSelectedCards: (cards: NFT[] | ((prev: NFT[]) => NFT[])) => void;
  sortedPveNfts: NFT[];
  pveSortByPower: boolean;
  setPveSortByPower: (sort: boolean) => void;
  soundEnabled: boolean;
  jcNfts: any[];
  setIsDifficultyModalOpen: (open: boolean) => void;
  pveSelectedCardsPower: number;
}

export function PveCardSelectionModal({
  isOpen,
  onClose,
  isDifficultyModalOpen,
  t,
  handSize,
  pveSelectedCards,
  setPveSelectedCards,
  sortedPveNfts,
  pveSortByPower,
  setPveSortByPower,
  soundEnabled,
  jcNfts,
  setIsDifficultyModalOpen,
  pveSelectedCardsPower,
}: PveCardSelectionModalProps) {
  if (!isOpen || isDifficultyModalOpen) return null;

  const handleCardClick = (nft: NFT) => {
    const isSelected = pveSelectedCards.find(c => c.tokenId === nft.tokenId);

    if (isSelected) {
      setPveSelectedCards(prev => prev.filter(c => c.tokenId !== nft.tokenId));
      if (soundEnabled) AudioManager.deselectCard();
    } else if (pveSelectedCards.length < handSize) {
      setPveSelectedCards(prev => [...prev, nft]);
      if (soundEnabled) AudioManager.selectCard();
    }
  };

  const handleChooseDifficulty = () => {
    if (pveSelectedCards.length === handSize && jcNfts.length >= handSize) {
      if (soundEnabled) AudioManager.buttonClick();
      setIsDifficultyModalOpen(true);
    }
  };

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onClose();
    setPveSelectedCards([]);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-neon-blue max-w-4xl w-full p-8 shadow-neon my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-neon-blue">
          {t('selectYourCardsTitle')}
        </h2>
        <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
          Choose {handSize} cards to battle vs AI ({pveSelectedCards.length}/{handSize} selected)
        </p>

        {/* Selected Cards Display */}
        <div className="mb-6 p-4 bg-vintage-black/50 rounded-xl border border-vintage-neon-blue/50">
          <div className="grid grid-cols-5 gap-2">
            {pveSelectedCards.map((card, i) => (
              <div
                key={i}
                className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-neon-blue shadow-lg"
              >
                <FoilCardEffect
                  foilType={(card.foil === 'Standard' || card.foil === 'Prize') ? card.foil : null}
                  className="w-full h-full"
                >
                  <img
                    src={card.imageUrl}
                    alt={`#${card.tokenId}`}
                    className="w-full h-full object-cover"
                  />
                </FoilCardEffect>
                <div className="absolute top-0 left-0 bg-vintage-neon-blue text-vintage-black text-xs px-1 rounded-br font-bold">
                  {card.power}
                </div>
              </div>
            ))}
            {Array(handSize - pveSelectedCards.length)
              .fill(0)
              .map((_, i) => (
                <div
                  key={`e-${i}`}
                  className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-neon-blue/40 flex items-center justify-center text-vintage-neon-blue/50 bg-vintage-felt-green/30"
                >
                  <span className="text-2xl font-bold">+</span>
                </div>
              ))}
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-vintage-burnt-gold">Total Power</p>
            <p className="text-2xl font-bold text-vintage-neon-blue">
              {pveSelectedCardsPower}
            </p>
          </div>
        </div>

        {/* Available Cards Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6 max-h-96 overflow-y-auto p-2">
          {sortedPveNfts.map((nft) => {
            const isSelected = pveSelectedCards.find(c => c.tokenId === nft.tokenId);
            return (
              <div
                key={nft.tokenId}
                onClick={() => handleCardClick(nft)}
                className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-4 ring-vintage-neon-blue scale-95'
                    : 'hover:scale-105 hover:ring-2 hover:ring-vintage-gold/50'
                }`}
              >
                <img
                  src={nft.imageUrl}
                  alt={`#${nft.tokenId}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                  {nft.power}
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-vintage-neon-blue/20 flex items-center justify-center">
                    <div className="bg-vintage-neon-blue text-vintage-black rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      ✓
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sort Button */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => {
              setPveSortByPower(!pveSortByPower);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-4 py-2 rounded-xl font-modern font-semibold transition-all ${
              pveSortByPower
                ? 'bg-vintage-neon-blue text-vintage-black shadow-neon'
                : 'bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 hover:bg-vintage-gold/10'
            }`}
          >
            {pveSortByPower ? '↓ Sorted by Power' : '⇄ Sort by Power'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleChooseDifficulty}
            disabled={pveSelectedCards.length !== handSize || jcNfts.length < handSize}
            className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
              pveSelectedCards.length === handSize && jcNfts.length >= handSize
                ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {jcNfts.length < handSize
              ? t('loadingDealerDeck')
              : `✦ ${t('chooseDifficulty')} (${pveSelectedCards.length}/${handSize})`}
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
