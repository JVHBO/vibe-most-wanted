"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";

interface Card {
  tokenId: string;
  name?: string; // Optional for NFTs
  image?: string;
  imageUrl?: string; // NFTs use imageUrl
  power?: number; // Optional for NFTs (some may not have power calculated yet)
  rarity?: string; // Optional for NFTs
  foil?: string; // Optional for NFTs
  wear?: string; // Optional for NFTs
}

interface PokerWaitingRoomProps {
  roomId: string;
  isHost: boolean;
  ante: number;
  token: string;
  playerAddress: string;
  playerUsername: string;
  playerCards: Card[];
  onGameStart: (selectedDeck: Card[], opponentDeck?: Card[]) => void;
  onLeave: () => void;
}

export function PokerWaitingRoom({
  roomId,
  isHost,
  ante,
  token,
  playerAddress,
  playerUsername,
  playerCards,
  onGameStart,
  onLeave,
}: PokerWaitingRoomProps) {
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [sortByPower, setSortByPower] = useState(true); // Sort by power by default
  const [selectedWagers, setSelectedWagers] = useState<Card[]>([]);

  const CARDS_PER_PAGE = 50;

  // Debug: Log cards received
  useEffect(() => {
    console.log('🎴 PokerWaitingRoom - Cards received:', playerCards.length);
    if (playerCards.length > 0) {
      console.log('   First 5 cards:', playerCards.slice(0, 5).map(c => ({ name: c.name, power: c.power })));
    }
  }, [playerCards]);

  // Get rarity color for fallback cards
  const getRarityGradient = (rarity: string): string => {
    switch (rarity.toLowerCase()) {
      case 'mythic': return 'linear-gradient(135deg, #ff00ff 0%, #8b00ff 100%)';
      case 'legendary': return 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)';
      case 'epic': return 'linear-gradient(135deg, #9d4edd 0%, #5a189a 100%)';
      case 'rare': return 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)';
      case 'common': return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
      default: return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
    }
  };

  // Sort cards by power if enabled
  const sortedCards = sortByPower
    ? [...playerCards].sort((a, b) => b.power - a.power)
    : playerCards;

  const totalPages = Math.ceil(sortedCards.length / CARDS_PER_PAGE);
  const paginatedCards = sortedCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  // Query room state
  const room = useQuery(api.pokerBattle.getPokerRoom, { roomId });

  // Mutations
  const setPlayerReady = useMutation(api.pokerBattle.setPlayerReady);
  const leaveRoom = useMutation(api.pokerBattle.leavePokerRoom);

  // Check if both players are ready
  useEffect(() => {
    if (room && room.status === "ready" && room.hostReady && room.guestReady) {
      // Both players ready - start game!
      // Get opponent's deck
      const opponentDeck = isHost ? room.guestDeck : room.hostDeck;
      onGameStart(selectedDeck, opponentDeck);
    }
  }, [room]);

  const toggleCardInDeck = (card: Card) => {
    AudioManager.selectCardByRarity(card.rarity);

    const isAlreadySelected = selectedDeck.find(c => c.tokenId === card.tokenId);
    const isWagered = selectedWagers.find(c => c.tokenId === card.tokenId);

    // Can't select a card that's wagered
    if (isWagered) {
      return;
    }

    if (isAlreadySelected) {
      setSelectedDeck(prev => prev.filter(c => c.tokenId !== card.tokenId));
    } else if (selectedDeck.length < 10) {
      setSelectedDeck(prev => [...prev, card]);
    }
  };

  const toggleCardInWagers = (card: Card) => {
    AudioManager.selectCardByRarity(card.rarity);

    const isAlreadyWagered = selectedWagers.find(c => c.tokenId === card.tokenId);
    const isInDeck = selectedDeck.find(c => c.tokenId === card.tokenId);

    // Can't wager a card that's in the deck
    if (isInDeck) {
      return;
    }

    if (isAlreadyWagered) {
      setSelectedWagers(prev => prev.filter(c => c.tokenId !== card.tokenId));
    } else if (selectedWagers.length < 5) {
      setSelectedWagers(prev => [...prev, card]);
    }
  };

  const handleReady = async () => {
    // Validate deck selection
    if (selectedDeck.length !== 10 || isReady) return;

    // Validate wagering for VIBE_NFT mode
    if (token === "VIBE_NFT" && selectedWagers.length < 1) {
      AudioManager.buttonError();
      return;
    }

    AudioManager.buttonSuccess();
    setIsReady(true);

    try {
      await setPlayerReady({
        roomId,
        address: playerAddress,
        deck: selectedDeck,
        wagers: token === "VIBE_NFT" ? selectedWagers : undefined,
      });
    } catch (error) {
      console.error("Error setting ready:", error);
      AudioManager.buttonError();
      setIsReady(false);
    }
  };

  const handleLeave = async () => {
    AudioManager.buttonNav();

    try {
      await leaveRoom({
        roomId,
        address: playerAddress,
      });
      onLeave();
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  const opponentReady = isHost ? room?.guestReady : room?.hostReady;
  const opponentUsername = isHost ? room?.guestUsername : room?.hostUsername;
  const hasOpponent = isHost ? !!room?.guestAddress : true;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-3xl border-4 border-vintage-gold/50 max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl shadow-vintage-gold/20">

        {/* Header */}
        <div className="bg-gradient-to-r from-vintage-gold/20 via-vintage-burnt-gold/20 to-vintage-gold/20 border-b-2 border-vintage-gold/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2 flex items-center gap-3">
                <span className="text-5xl">♠️</span>
                {isHost ? "YOUR ROOM" : "WAITING ROOM"}
              </h1>
              <p className="text-vintage-burnt-gold font-modern">
                Stakes: {ante} {token} per round • Bankroll: {ante * 50} {token}
              </p>
            </div>
            <button
              onClick={handleLeave}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              LEAVE
            </button>
          </div>

          {/* Players Status */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Host */}
            <div className={`bg-vintage-black/50 border-2 rounded-xl p-4 ${
              isHost && isReady ? "border-green-500" : "border-vintage-gold/30"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👑</div>
                  <div>
                    <div className="text-sm text-vintage-burnt-gold">HOST</div>
                    <div className="text-lg font-bold text-vintage-gold">
                      {room?.hostUsername || playerUsername}
                    </div>
                  </div>
                </div>
                {room?.hostReady && (
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/50 flex items-center gap-1">
                    <span>✓</span> READY
                  </div>
                )}
              </div>
            </div>

            {/* Guest */}
            <div className={`bg-vintage-black/50 border-2 rounded-xl p-4 ${
              !isHost && isReady ? "border-green-500" : "border-vintage-gold/30"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {hasOpponent ? "⚔️" : "⏳"}
                  </div>
                  <div>
                    <div className="text-sm text-vintage-burnt-gold">GUEST</div>
                    <div className="text-lg font-bold text-vintage-gold">
                      {opponentUsername || "Waiting..."}
                    </div>
                  </div>
                </div>
                {opponentReady && (
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/50 flex items-center gap-1">
                    <span>✓</span> READY
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Waiting for Opponent Banner (shown only for host without guest) */}
          {!hasOpponent && (
            <div className="text-center mb-6 bg-vintage-gold/10 border-2 border-vintage-gold/30 rounded-xl p-4">
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
              <h3 className="text-xl font-display font-bold text-vintage-gold mb-2">
                Waiting for opponent...
              </h3>
              <p className="text-vintage-burnt-gold text-sm mb-2">
                Select your deck while you wait!
              </p>
              <div className="inline-block px-4 py-2 bg-vintage-black/50 border border-vintage-gold/30 rounded-lg">
                <div className="text-xs text-vintage-burnt-gold mb-1">Room ID</div>
                <div className="text-sm font-mono font-bold text-vintage-gold">
                  {roomId}
                </div>
              </div>
            </div>
          )}

          {/* NFT WAGERING - Only show if VIBE_NFT mode */}
          {token === "VIBE_NFT" && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-purple-400">
                  🎴 SELECT CARDS TO WAGER (1-5)
                </h2>
                <div className="text-purple-300 text-sm">
                  {selectedWagers.length}/5 selected
                </div>
              </div>

              {/* Warning Banner */}
              <div className="mb-4 bg-yellow-500/20 border border-yellow-400 rounded-xl p-3 text-center">
                <p className="text-yellow-400 text-xs font-bold">
                  ⚠️ FOR FUN ONLY - No blockchain transfers • Winner gets fake "card transfer" animation
                </p>
              </div>

              {/* Selected Wagers Display */}
              <div className="bg-purple-900/40 border-2 border-purple-500/50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] border-2 border-dashed border-purple-400/50 rounded-lg flex items-center justify-center overflow-hidden"
                    >
                      {selectedWagers[i] ? (
                        (selectedWagers[i].imageUrl || selectedWagers[i].image) ? (
                          <img
                            src={(selectedWagers[i].imageUrl || selectedWagers[i].image)}
                            alt={selectedWagers[i].name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex flex-col items-center justify-center p-1 rounded-lg"
                            style={{ background: getRarityGradient(selectedWagers[i].rarity) }}
                          >
                            <div className="text-white text-[0.5rem] font-bold text-center mb-0.5">{selectedWagers[i].name}</div>
                            <div className="text-white text-sm font-bold">{Math.round(selectedWagers[i].power).toLocaleString()}</div>
                          </div>
                        )
                      ) : (
                        <span className="text-purple-400 text-3xl">+</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deck Selection - Always shown */}
          <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-display font-bold text-vintage-gold">
                    ♠️ SELECT YOUR DECK (10 cards)
                  </h2>
                  <button
                    onClick={() => {
                      AudioManager.buttonNav();
                      setSortByPower(!sortByPower);
                      setCurrentPage(0); // Reset to first page when sorting changes
                    }}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      sortByPower
                        ? 'bg-vintage-gold/20 text-vintage-gold border-2 border-vintage-gold/50'
                        : 'bg-vintage-black/50 text-vintage-burnt-gold border-2 border-vintage-gold/30'
                    }`}
                  >
                    {sortByPower ? '⚡ POWER ↓' : '📋 DEFAULT'}
                  </button>
                </div>

                {/* Selected Deck Display */}
                <div className="bg-green-900/40 border-2 border-vintage-gold/50 rounded-xl p-4">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[2/3] border-2 border-dashed border-vintage-gold/50 rounded-lg flex items-center justify-center overflow-hidden"
                      >
                        {selectedDeck[i] ? (
                          (selectedDeck[i].imageUrl || selectedDeck[i].image) ? (
                            <img
                              src={(selectedDeck[i].imageUrl || selectedDeck[i].image)}
                              alt={selectedDeck[i].name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center p-1 rounded-lg"
                              style={{ background: getRarityGradient(selectedDeck[i].rarity) }}
                            >
                              <div className="text-white text-[0.5rem] font-bold text-center mb-0.5">{selectedDeck[i].name}</div>
                              <div className="text-white text-sm font-bold">{Math.round(selectedDeck[i].power).toLocaleString()}</div>
                            </div>
                          )
                        ) : (
                          <span className="text-vintage-gold text-3xl">+</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-vintage-burnt-gold text-sm">
                      {selectedDeck.length}/10 cards selected
                    </span>
                  </div>
                </div>
              </div>

              {/* Available Cards Grid */}
              <div className="grid grid-cols-10 gap-2 mb-4">
                {paginatedCards.map((card) => {
                  const isSelected = selectedDeck.find(c => c.tokenId === card.tokenId);
                  const isWagered = selectedWagers.find(c => c.tokenId === card.tokenId);
                  return (
                    <button
                      key={card.tokenId}
                      onClick={(e) => {
                        // Check for shift-click to toggle wager selection (only in VIBE_NFT mode)
                        if (token === "VIBE_NFT" && e.shiftKey) {
                          toggleCardInWagers(card);
                        } else {
                          toggleCardInDeck(card);
                        }
                      }}
                      className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                        isSelected
                          ? 'border-vintage-gold shadow-gold'
                          : isWagered
                          ? 'border-purple-500 shadow-lg shadow-purple-500/50'
                          : 'border-vintage-gold/30 hover:border-vintage-gold/60'
                      }`}
                    >
                      {(card.imageUrl || card.image) ? (
                        <img
                          src={(card.imageUrl || card.image)}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-1"
                          style={{ background: getRarityGradient(card.rarity) }}
                        >
                          <div className="text-white text-[0.4rem] font-bold text-center mb-0.5">{card.name}</div>
                          <div className="text-white text-xs font-bold">{Math.round(card.power).toLocaleString()}</div>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-vintage-gold/20 flex items-center justify-center">
                          <span className="text-4xl">✓</span>
                        </div>
                      )}
                      {isWagered && (
                        <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                          <span className="text-4xl">🎴</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className={`px-4 py-2 rounded-lg font-bold transition ${
                      currentPage === 0
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                    }`}
                  >
                    ← Previous
                  </button>
                  <span className="text-vintage-gold font-bold">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className={`px-4 py-2 rounded-lg font-bold transition ${
                      currentPage === totalPages - 1
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Ready Button */}
              <div className="text-center">
                {/* Validation message for VIBE_NFT wagering */}
                {token === "VIBE_NFT" && selectedDeck.length === 10 && selectedWagers.length < 1 && !isReady && (
                  <div className="mb-4 bg-purple-500/20 border border-purple-400 rounded-xl p-3">
                    <p className="text-purple-300 text-sm font-bold">
                      🎴 Select at least 1 card to wager (Shift+Click cards)
                    </p>
                  </div>
                )}

                <button
                  onClick={handleReady}
                  disabled={selectedDeck.length !== 10 || isReady || (token === "VIBE_NFT" && selectedWagers.length < 1)}
                  className={`px-12 py-6 rounded-2xl font-display font-bold text-2xl transition-all shadow-2xl ${
                    selectedDeck.length === 10 && !isReady && (token !== "VIBE_NFT" || selectedWagers.length >= 1)
                      ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-4 border-green-400 hover:scale-105 active:scale-95 shadow-green-500/50'
                      : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border-4 border-vintage-gold/20'
                  }`}
                >
                  {isReady ? (
                    <span className="flex items-center gap-3">
                      <span className="animate-pulse">⏳</span>
                      WAITING FOR OPPONENT...
                    </span>
                  ) : token === "VIBE_NFT" ? (
                    <span>
                      ✓ READY ({selectedDeck.length}/10 deck, {selectedWagers.length}/5 wagers)
                    </span>
                  ) : (
                    <span>
                      ✓ READY ({selectedDeck.length}/10)
                    </span>
                  )}
                </button>
              </div>
            </>
        </div>
      </div>
    </div>
  );
}
