/**
 * Elimination Mode - Card Ordering Screen
 *
 * Allows player to arrange cards in battle order for elimination mode
 */

import { AudioManager } from '@/lib/audio-manager';

interface Card {
  tokenId: string;
  power?: number;
  imageUrl: string;
  name: string;
}

interface EliminationOrderingModalProps {
  isOpen: boolean;
  orderedPlayerCards: Card[];
  setOrderedPlayerCards: (cards: Card[]) => void;
  soundEnabled: boolean;
  onStartBattle: () => void;
  onCancel: () => void;
}

export function EliminationOrderingModal({
  isOpen,
  orderedPlayerCards,
  setOrderedPlayerCards,
  soundEnabled,
  onStartBattle,
  onCancel,
}: EliminationOrderingModalProps) {
  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...orderedPlayerCards];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setOrderedPlayerCards(newOrder);
      if (soundEnabled) AudioManager.buttonClick();
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < orderedPlayerCards.length - 1) {
      const newOrder = [...orderedPlayerCards];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrderedPlayerCards(newOrder);
      if (soundEnabled) AudioManager.buttonClick();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] overflow-y-auto">
      <div className="w-full max-w-4xl p-8 my-8">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-purple-400 uppercase tracking-wider">
          ✦ ELIMINATION MODE
        </h2>
        <p className="text-center text-vintage-gold mb-8 text-lg">
          Arrange your cards in battle order (Position 1 fights first)
        </p>

        {/* Card Ordering List */}
        <div className="space-y-2 mb-6">
          {orderedPlayerCards.map((card, index) => {
            const power = card?.power || 0;

            return (
              <div
                key={index}
                className="flex items-center gap-3 bg-vintage-charcoal border-2 border-purple-500/50 rounded-lg p-3"
              >
                {/* Position Number */}
                <div className="text-2xl font-bold text-purple-400 w-12 text-center">
                  #{index + 1}
                </div>

                {/* Card Image */}
                <div className="w-16 h-20 rounded-lg overflow-hidden border border-vintage-gold/30">
                  <img
                    src={card?.imageUrl || '/placeholder.png'}
                    alt={card?.name || 'Card'}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-vintage-gold truncate">
                    {card?.name || 'Unknown'}
                  </h3>
                  <p className="text-vintage-burnt-gold font-bold">※ {power}</p>
                </div>

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      index === 0
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === orderedPlayerCards.length - 1}
                    className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      index === orderedPlayerCards.length - 1
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Battle Button */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              onStartBattle();
            }}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-display font-bold text-2xl shadow-lg transition-all uppercase tracking-wider border-2 border-purple-500/30"
          >
            <span className="drop-shadow-lg">START ELIMINATION BATTLE</span>
          </button>
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              onCancel();
            }}
            className="px-8 py-4 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-lg uppercase"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
