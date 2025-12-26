/**
 * PvP In Room Modal Component
 *
 * Modal shown when players are in a PvP room waiting for opponent
 * and selecting their cards for battle
 */

import { Dispatch, SetStateAction, useState, useMemo } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import { ConvexPvPService, type GameRoom } from '@/lib/convex-pvp';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CardMedia } from '@/components/CardMedia';
import { getCardUniqueId, isSameCard } from '@/lib/collections/index';

interface Card {
  tokenId: string;
  power: number;
  imageUrl: string;
  name: string;
  rarity?: string;
  collection?: string;
}

interface PvPInRoomModalProps {
  // State
  pvpMode: string | null;
  roomCode: string;
  currentRoom: GameRoom | null | undefined;
  address: string | undefined;
  soundEnabled: boolean;
  nfts: Card[];
  selectedCards: Card[];
  isConfirmingCards: boolean;

  // Functions
  setPvpMode: Dispatch<SetStateAction<any>>;
  setRoomCode: Dispatch<SetStateAction<string>>;
  setCurrentRoom: Dispatch<SetStateAction<GameRoom | null>>;
  setSelectedCards: Dispatch<SetStateAction<Card[]>>;
  setIsConfirmingCards: Dispatch<SetStateAction<boolean>>;
  isCardLocked: (card: { tokenId: string; collection?: string }, mode: 'attack' | 'pvp') => boolean;

  // Translation
  t: any;
}

export function PvPInRoomModal({
  pvpMode,
  roomCode,
  currentRoom,
  address,
  soundEnabled,
  nfts,
  selectedCards,
  isConfirmingCards,
  setPvpMode,
  setRoomCode,
  setCurrentRoom,
  setSelectedCards,
  setIsConfirmingCards,
  isCardLocked,
  t,
}: PvPInRoomModalProps) {
  const [sortByPower, setSortByPower] = useState<boolean>(false);

  // Sort cards by power if enabled
  const sortedNfts = useMemo(() => {
    if (!sortByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortByPower]);

  if (pvpMode !== 'inRoom' || !roomCode) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-yellow-500 max-w-2xl w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {t('room') || 'Room'}: {roomCode}
            </h2>
            {currentRoom && (
              <p className="text-sm font-modern mt-1">
                {currentRoom.mode === 'casual' ? (
                  <span className="text-green-400">🎮 CASUAL - Free Match</span>
                ) : (
                  <span className="text-vintage-gold">⚔️ RANKED - Entry Fee: 20 coins</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              setPvpMode('pvpMenu');
              setRoomCode('');
              setCurrentRoom(null);
              ConvexPvPService.leaveRoom(roomCode, address || '');
            }}
            className="text-vintage-burnt-gold hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {currentRoom ? (
          <div className="space-y-4">
            {/* Host */}
            <div className="bg-vintage-charcoal rounded-xl p-4 border-2 border-vintage-neon-blue/50">
              <p className="text-vintage-neon-blue font-bold mb-2 font-modern">Host</p>
              <p className="text-white text-sm font-mono truncate max-w-[150px]">{currentRoom.hostUsername || `${currentRoom.hostAddress.slice(0, 10)}...`}</p>
              <p className="text-vintage-burnt-gold text-sm">
                {(currentRoom.hostCards && currentRoom.hostCards.length > 0) ? '✓ Ready' : '... Selecting cards'}
              </p>
            </div>

            {/* Guest */}
            <div className="bg-vintage-charcoal rounded-xl p-4 border-2 border-vintage-gold/50">
              <p className="text-vintage-gold font-bold mb-2 font-modern">{t('opponent')}</p>
              {currentRoom.guestAddress ? (
                <>
                  <p className="text-white text-sm font-mono truncate max-w-[150px]">{currentRoom.guestUsername || `${currentRoom.guestAddress.slice(0, 10)}...`}</p>
                  <p className="text-vintage-burnt-gold text-sm">
                    {(currentRoom.guestCards && currentRoom.guestCards.length > 0) ? '✓ Ready' : '... Selecting cards'}
                  </p>
                </>
              ) : (
                <p className="text-vintage-burnt-gold text-sm">{t('waitingForOpponent')}</p>
              )}
            </div>

            {/* Grid de Seleção de Cartas */}
            {currentRoom.guestAddress && (() => {
              const isHost = currentRoom.hostAddress === address?.toLowerCase();
              const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);

              // Só mostra grid se o jogador atual NÃO estiver pronto ainda
              if (playerReady) return null;

              // Se não tem NFTs carregados, mostra loading
              if (nfts.length === 0) {
                return (
                  <div className="mt-6 text-center">
                    <LoadingSpinner size="lg" variant="purple" text="Loading your cards..." />
                  </div>
                );
              }

              return (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">
                      {t('selectYourCards') || 'Select Your Cards'} ({selectedCards.length}/5)
                    </h3>
                    <button
                      onClick={() => {
                        setSortByPower(!sortByPower);
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        sortByPower
                          ? 'bg-vintage-gold text-vintage-black'
                          : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                      }`}
                    >
                      {sortByPower ? '⚡ Sorted' : '⚡ Sort'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-2">
                    {sortedNfts.map((nft) => {
                      const isSelected = selectedCards.some((c: any) => isSameCard(c, nft));
                      // Use card object for proper collection+tokenId comparison
                      const isLocked = isCardLocked(nft, 'pvp');
                      return (
                        <div
                          key={getCardUniqueId(nft)}
                          onClick={() => {
                            if (isLocked) {
                              if (soundEnabled) AudioManager.buttonError();
                              return;
                            }
                            if (isSelected) {
                              setSelectedCards(selectedCards.filter((c: any) => !isSameCard(c, nft)));
                              if (soundEnabled) {
                                AudioManager.deselectCard();
                                AudioManager.hapticFeedback('light');
                              }
                            } else if (selectedCards.length < 5) {
                              setSelectedCards([...selectedCards, nft]);
                              if (soundEnabled) {
                                AudioManager.selectCardByRarity(nft.rarity);
                              }
                            }
                          }}
                          className={`relative aspect-[2/3] rounded-lg overflow-hidden transition-all ${
                            isLocked
                              ? 'opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'ring-4 ring-green-500 scale-95 cursor-pointer'
                              : 'hover:scale-105 opacity-70 hover:opacity-100 cursor-pointer'
                          }`}
                          title={isLocked ? "🔒 This card is locked in your defense deck" : undefined}
                        >
                          <CardMedia
                            src={nft.imageUrl}
                            alt={nft.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                            {nft.power?.toLocaleString()}
                          </div>

                          {/* Locked Overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                              <div className="text-3xl mb-1">🔒</div>
                              <div className="text-[10px] text-white font-bold bg-black/50 px-1 rounded">
                                IN DEFENSE
                              </div>
                            </div>
                          )}

                          {/* Selected Checkmark */}
                          {isSelected && !isLocked && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <span className="text-4xl">✓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Botão de Confirmar Cartas */}
            {currentRoom.guestAddress && (() => {
              const isHost = currentRoom.hostAddress === address?.toLowerCase();
              const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);

              // Só mostra botão se o jogador atual NÃO estiver pronto ainda
              if (playerReady) return null;

              return (
                <button
                  onClick={async () => {
                    if (isConfirmingCards || selectedCards.length !== 5) return;
                    setIsConfirmingCards(true);

                    if (soundEnabled) AudioManager.buttonSuccess();
                    await ConvexPvPService.updateCards(roomCode, address || '', selectedCards);

                    // Reset after 2 seconds in case of error
                    setTimeout(() => setIsConfirmingCards(false), 2000);
                  }}
                  disabled={selectedCards.length !== 5 || isConfirmingCards}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition mt-4"
                >
                  {isConfirmingCards ? '... Confirming' : `${t('confirmCards') || 'Confirm Cards'} (${selectedCards.length}/5)`}
                </button>
              );
            })()}

            {/* Mensagem de aguardo */}
            {currentRoom.guestAddress && (() => {
              const isHost = currentRoom.hostAddress === address?.toLowerCase();
              const playerReady = isHost ? (currentRoom.hostCards && currentRoom.hostCards.length > 0) : (currentRoom.guestCards && currentRoom.guestCards.length > 0);
              const opponentReady = isHost ? (currentRoom.guestCards && currentRoom.guestCards.length > 0) : (currentRoom.hostCards && currentRoom.hostCards.length > 0);

              // Mostra loading se pelo menos um jogador confirmou
              if (!playerReady && !opponentReady) return null;

              return (
                <div className="mt-4 text-center">
                  <LoadingSpinner
                    size="md"
                    variant="gold"
                    text={playerReady && !opponentReady
                      ? (t('waitingForOpponent') || 'Waiting for opponent...')
                      : (t('waitingForBothPlayers') || 'Starting battle...')
                    }
                  />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" variant="gold" text={t('loading') || 'Loading room...'} />
          </div>
        )}
      </div>
    </div>
  );
}
