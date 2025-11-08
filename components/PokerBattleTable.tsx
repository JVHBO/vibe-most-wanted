"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from '@/lib/audio-manager';
import { PokerMatchmaking } from './PokerMatchmaking';
import { PokerWaitingRoom } from './PokerWaitingRoom';

interface Card {
  tokenId: string;
  name?: string; // Optional for NFTs
  image?: string;
  imageUrl?: string; // NFTs use imageUrl
  power: number;
  rarity: string;
  foil?: string; // Optional for NFTs
  wear?: string; // Optional for NFTs
}

interface PokerBattleTableProps {
  onClose: () => void;
  playerCards: Card[]; // Player's full collection
  isCPUMode?: boolean; // If true, auto-select deck and start immediately
  opponentDeck?: Card[]; // Opponent's deck (for CPU mode)
  difficulty?: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'god'; // CPU difficulty
  playerAddress?: string; // For multiplayer matchmaking
  playerUsername?: string; // For multiplayer matchmaking
  isSpectator?: boolean; // If true, view-only mode (no interactions)
}

type GamePhase = 'deck-building' | 'card-selection' | 'pre-reveal-betting' | 'reveal' | 'post-reveal-betting' | 'resolution' | 'game-over';
type BettingAction = 'CHECK' | 'BET' | 'CALL' | 'RAISE' | 'FOLD';
type CardAction = 'BOOST' | 'SHIELD' | 'DOUBLE' | 'SWAP' | 'PASS';
type ViewMode = 'matchmaking' | 'waiting' | 'game';

export function PokerBattleTable({
  onClose,
  playerCards,
  isCPUMode = false,
  opponentDeck = [],
  difficulty = 'gooner',
  playerAddress = '',
  playerUsername = 'Player',
  isSpectator = false,
}: PokerBattleTableProps) {
  // View Mode state
  const [currentView, setCurrentView] = useState<ViewMode>(isCPUMode ? 'game' : 'matchmaking');
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [selectedAnte, setSelectedAnte] = useState(25);
  const [selectedToken, setSelectedToken] = useState<'TESTVBMS' | 'testUSDC'>('TESTVBMS');

  // Real-time room data for multiplayer
  const room = useQuery(
    api.pokerBattle.getPokerRoom,
    currentView === 'game' && !isCPUMode && roomId ? { roomId } : "skip"
  );

  // Mutations for game actions
  const initializeGameMutation = useMutation(api.pokerBattle.initializeGame);
  const selectCardMutation = useMutation(api.pokerBattle.selectCard);
  const makeBetMutation = useMutation(api.pokerBattle.makeBet);
  const useCardActionMutation = useMutation(api.pokerBattle.useCardAction);
  const resolveRoundMutation = useMutation(api.pokerBattle.resolveRound);

  // Game state
  const [phase, setPhase] = useState<GamePhase>(isCPUMode ? 'card-selection' : 'deck-building');
  const [currentRound, setCurrentRound] = useState(1);
  const [pot, setPot] = useState(0);

  // Deck & Hand
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [opponentHand, setOpponentHand] = useState<Card[]>([]);
  const [playerDeckRemaining, setPlayerDeckRemaining] = useState<Card[]>([]);
  const [opponentDeckRemaining, setOpponentDeckRemaining] = useState<Card[]>([]);

  // Auto-start CPU mode
  useEffect(() => {
    if (isCPUMode && playerCards.length >= 10 && opponentDeck.length >= 10) {
      // Auto-select player's top 10 strongest cards
      const playerTop10 = [...playerCards]
        .sort((a, b) => b.power - a.power)
        .slice(0, 10);

      setSelectedDeck(playerTop10);

      // Shuffle and deal
      const shuffledPlayer = [...playerTop10].sort(() => Math.random() - 0.5);
      const playerHandCards = shuffledPlayer.slice(0, 5);
      const playerDeckCards = shuffledPlayer.slice(5);

      setPlayerHand(playerHandCards);
      setPlayerDeckRemaining(playerDeckCards);

      // Use opponent deck (already selected by difficulty)
      const shuffledOpponent = [...opponentDeck].sort(() => Math.random() - 0.5);
      const opponentHandCards = shuffledOpponent.slice(0, 5);
      const opponentDeckCards = shuffledOpponent.slice(5);

      setOpponentHand(opponentHandCards);
      setOpponentDeckRemaining(opponentDeckCards);

      // Set CPU mode defaults
      setPot(100);
      setPlayerBankroll(500);
      setOpponentBankroll(500);
      setPhase('card-selection');
    }
  }, [isCPUMode, playerCards, opponentDeck]);

  // Current round
  const [playerSelectedCard, setPlayerSelectedCard] = useState<Card | null>(null);
  const [opponentSelectedCard, setOpponentSelectedCard] = useState<Card | null>(null);
  const [playerAction, setPlayerAction] = useState<CardAction | null>(null);
  const [opponentAction, setOpponentAction] = useState<CardAction | null>(null);

  // Betting
  const [playerBankroll, setPlayerBankroll] = useState(0);
  const [opponentBankroll, setOpponentBankroll] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerBetThisRound, setPlayerBetThisRound] = useState(0);
  const [opponentBetThisRound, setOpponentBetThisRound] = useState(0);

  // Score
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Pagination for deck building
  const [currentPage, setCurrentPage] = useState(0);
  const CARDS_PER_PAGE = 50;
  const totalPages = Math.ceil(playerCards.length / CARDS_PER_PAGE);
  const paginatedCards = playerCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

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

  // Deck Building Phase
  const toggleCardInDeck = (card: Card) => {
    AudioManager.selectCardByRarity(card.rarity);
    if (selectedDeck.find(c => c.tokenId === card.tokenId)) {
      setSelectedDeck(selectedDeck.filter(c => c.tokenId !== card.tokenId));
    } else if (selectedDeck.length < 10) {
      setSelectedDeck([...selectedDeck, card]);
    }
  };

  const startGame = () => {
    if (selectedDeck.length !== 10) return;
    AudioManager.buttonSuccess();

    // Shuffle deck
    const shuffled = [...selectedDeck].sort(() => Math.random() - 0.5);

    // Deal 5 cards to hand, 5 remain in deck
    const hand = shuffled.slice(0, 5);
    const deck = shuffled.slice(5);

    setPlayerHand(hand);
    setPlayerDeckRemaining(deck);

    // AI opponent: randomly select 10 from available cards, shuffle
    const aiCards = [...playerCards]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    const aiHand = aiCards.slice(0, 5);
    const aiDeck = aiCards.slice(5);

    setOpponentHand(aiHand);
    setOpponentDeckRemaining(aiDeck);

    setPot(100);
    setPlayerBankroll(500);
    setOpponentBankroll(500);
    setPhase('card-selection');
  };

  // Card Selection Phase
  const selectCard = async (card: Card) => {
    AudioManager.buttonClick();
    setPlayerSelectedCard(card);

    if (isCPUMode) {
      // AI randomly selects a card
      const aiCard = opponentHand[Math.floor(Math.random() * opponentHand.length)];
      setOpponentSelectedCard(aiCard);
      // Delay before moving to betting phase
      setTimeout(() => {
        setPhase('pre-reveal-betting');
      }, 800);
    } else {
      // PvP mode - send to server
      try {
        await selectCardMutation({
          roomId,
          address: playerAddress,
          card,
        });
      } catch (error) {
        console.error('Error selecting card:', error);
      }
    }
  };

  // Betting Actions
  const handleBet = async (amount: number) => {
    if (amount > playerBankroll) return;
    AudioManager.buttonClick();

    if (isCPUMode) {
      setPlayerBankroll(prev => prev - amount);
      setPlayerBetThisRound(prev => prev + amount);
      setPot(prev => prev + amount);
      setCurrentBet(amount);

      // AI responds (simple AI for now) with delay
      setTimeout(() => {
        aiRespondToBet(amount);
      }, 1200);
    } else {
      // PvP mode - send to server
      try {
        await makeBetMutation({
          roomId,
          address: playerAddress,
          action: currentBet > 0 ? "RAISE" : "BET",
          amount,
        });
      } catch (error) {
        console.error('Error making bet:', error);
      }
    }
  };

  const handleCall = async () => {
    const toCall = currentBet - playerBetThisRound;
    if (toCall > playerBankroll) return;
    AudioManager.buttonClick();

    if (isCPUMode) {
      setPlayerBankroll(prev => prev - toCall);
      setPlayerBetThisRound(prev => prev + toCall);
      setPot(prev => prev + toCall);

      setTimeout(() => {
        setPhase('reveal');
      }, 800);
    } else {
      try {
        await makeBetMutation({
          roomId,
          address: playerAddress,
          action: "CALL",
        });
      } catch (error) {
        console.error('Error calling:', error);
      }
    }
  };

  const handleCheck = async () => {
    AudioManager.buttonClick();

    if (isCPUMode) {
      setTimeout(() => {
        setPhase('reveal');
      }, 800);
    } else {
      try {
        await makeBetMutation({
          roomId,
          address: playerAddress,
          action: "CHECK",
        });
      } catch (error) {
        console.error('Error checking:', error);
      }
    }
  };

  const handleFold = async () => {
    AudioManager.buttonClick();

    if (isCPUMode) {
      // Player folds - opponent wins pot
      setOpponentBankroll(prev => prev + pot);
      setPot(0);
      setOpponentScore(prev => prev + 1);

      setTimeout(() => {
        if (opponentScore + 1 >= 4) {
          setPhase('game-over');
        } else {
          nextRound();
        }
      }, 1000);
    } else {
      try {
        await makeBetMutation({
          roomId,
          address: playerAddress,
          action: "FOLD",
        });
      } catch (error) {
        console.error('Error folding:', error);
      }
    }
  };

  const aiRespondToBet = (amount: number) => {
    // Simple AI: 70% chance to call, 30% to fold
    if (Math.random() < 0.7) {
      setOpponentBankroll(prev => prev - amount);
      setOpponentBetThisRound(prev => prev + amount);
      setPot(prev => prev + amount);
      setTimeout(() => setPhase('reveal'), 1500);
    } else {
      // AI folds
      setPlayerBankroll(prev => prev + pot);
      setPot(0);
      setPlayerScore(prev => prev + 1);

      setTimeout(() => {
        if (playerScore + 1 >= 4) {
          setPhase('game-over');
        } else {
          nextRound();
        }
      }, 1000);
    }
  };

  // Boost shop prices (based on ante for scaling)
  const getBoostPrice = (boostType: CardAction): number => {
    const baseAnte = isCPUMode ? 50 : selectedAnte;
    switch (boostType) {
      case 'BOOST': return Math.round(baseAnte * 1.6); // +30% power
      case 'SHIELD': return Math.round(baseAnte * 1.2); // Block opponent boost
      case 'DOUBLE': return Math.round(baseAnte * 3.2); // x2 power
      default: return 0;
    }
  };

  // Action Selection with cost
  const selectAction = async (action: CardAction) => {
    const cost = getBoostPrice(action);

    // Check if player can afford it
    if (cost > 0 && cost > playerBankroll) {
      AudioManager.buttonError();
      return;
    }

    AudioManager.buttonClick();
    setPlayerAction(action);

    // Deduct cost from bankroll
    if (cost > 0) {
      setPlayerBankroll(prev => prev - cost);
    }

    if (isCPUMode) {
      // AI randomly selects action with delay
      setTimeout(() => {
        const actions: CardAction[] = ['BOOST', 'PASS', 'PASS', 'PASS']; // AI mostly passes
        const aiAction = actions[Math.floor(Math.random() * actions.length)];
        setOpponentAction(aiAction);

        // AI pays for boost
        const aiCost = getBoostPrice(aiAction);
        if (aiCost > 0) {
          setOpponentBankroll(prev => prev - aiCost);
        }

        setTimeout(() => {
          setPhase('post-reveal-betting');
        }, 800);
      }, 1000);
    } else {
      // PvP mode - send to server
      try {
        await useCardActionMutation({
          roomId,
          address: playerAddress,
          action,
        });
      } catch (error) {
        console.error('Error using card action:', error);
      }
    }
  };

  // Calculate winner
  const resolveRound = async () => {
    if (!playerSelectedCard || !opponentSelectedCard) return;
    AudioManager.buttonClick();

    setPhase('resolution');

    if (isCPUMode) {
      setTimeout(() => {
        let playerPower = playerSelectedCard.power;
        let opponentPower = opponentSelectedCard.power;

        // Apply actions with shield logic
        const playerHasShield = playerAction === 'SHIELD';
        const opponentHasShield = opponentAction === 'SHIELD';

        // Apply BOOST (+30%)
        if (playerAction === 'BOOST' && !opponentHasShield) {
          playerPower *= 1.3;
        }
        if (opponentAction === 'BOOST' && !playerHasShield) {
          opponentPower *= 1.3;
        }

        // Apply DOUBLE (x2)
        if (playerAction === 'DOUBLE') playerPower *= 2;
        if (opponentAction === 'DOUBLE') opponentPower *= 2;

        const playerWins = playerPower > opponentPower;

        if (playerWins) {
          setPlayerBankroll(prev => prev + pot);
          setPlayerScore(prev => prev + 1);
        } else {
          setOpponentBankroll(prev => prev + pot);
          setOpponentScore(prev => prev + 1);
        }

        setPot(0);

        // Check win condition with delay
        setTimeout(() => {
          if (playerScore + (playerWins ? 1 : 0) >= 4 || opponentScore + (playerWins ? 0 : 1) >= 4) {
            setPhase('game-over');
          } else {
            nextRound();
          }
        }, 1500);
      }, 1000);
    } else {
      // PvP mode - send to server for resolution
      try {
        await resolveRoundMutation({
          roomId,
          address: playerAddress,
        });
      } catch (error) {
        console.error('Error resolving round:', error);
      }
    }
  };

  const nextRound = () => {
    // Draw new cards
    if (playerDeckRemaining.length > 0) {
      const newCard = playerDeckRemaining[0];
      setPlayerHand(prev => [...prev.filter(c => c.tokenId !== playerSelectedCard?.tokenId), newCard]);
      setPlayerDeckRemaining(prev => prev.slice(1));
    } else {
      setPlayerHand(prev => prev.filter(c => c.tokenId !== playerSelectedCard?.tokenId));
    }

    if (opponentDeckRemaining.length > 0) {
      const newCard = opponentDeckRemaining[0];
      setOpponentHand(prev => [...prev.filter(c => c.tokenId !== opponentSelectedCard?.tokenId), newCard]);
      setOpponentDeckRemaining(prev => prev.slice(1));
    } else {
      setOpponentHand(prev => prev.filter(c => c.tokenId !== opponentSelectedCard?.tokenId));
    }

    setCurrentRound(prev => prev + 1);
    setPlayerSelectedCard(null);
    setOpponentSelectedCard(null);
    setPlayerAction(null);
    setOpponentAction(null);
    setCurrentBet(0);
    setPlayerBetThisRound(0);
    setOpponentBetThisRound(0);

    const anteAmount = isCPUMode ? 50 : selectedAnte;
    setPot(anteAmount * 2);
    setPlayerBankroll(prev => prev - anteAmount);
    setOpponentBankroll(prev => prev - anteAmount);

    setPhase('card-selection');
  };

  // Matchmaking callbacks
  const handleRoomJoined = (newRoomId: string, host: boolean, ante: number, token: string, spectator: boolean = false) => {
    setRoomId(newRoomId);
    setIsHost(host);
    setSelectedAnte(ante);
    setSelectedToken(token as 'TESTVBMS' | 'testUSDC');
    setCurrentView(spectator ? 'game' : 'waiting');
  };

  const handleGameStart = async (deck: Card[], opponentDeckData?: Card[]) => {
    AudioManager.buttonSuccess();

    setSelectedDeck(deck);
    setCurrentView('game');
    setPhase('card-selection');

    // Shuffle player deck and deal
    const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);
    const playerHandCards = shuffledDeck.slice(0, 5);
    const playerDeckCards = shuffledDeck.slice(5);

    setPlayerHand(playerHandCards);
    setPlayerDeckRemaining(playerDeckCards);

    // Setup opponent deck
    if (opponentDeckData && opponentDeckData.length === 10) {
      const shuffledOpponent = [...opponentDeckData].sort(() => Math.random() - 0.5);
      const opponentHandCards = shuffledOpponent.slice(0, 5);
      const opponentDeckCards = shuffledOpponent.slice(5);

      setOpponentHand(opponentHandCards);
      setOpponentDeckRemaining(opponentDeckCards);
    }

    // Initialize bankrolls based on ante
    const startingBankroll = selectedAnte * 50;
    setPlayerBankroll(startingBankroll);
    setOpponentBankroll(startingBankroll);
    setPot(selectedAnte * 2);

    // Initialize game state in database for PvP mode
    if (!isCPUMode && roomId) {
      try {
        await initializeGameMutation({
          roomId,
          address: playerAddress,
        });
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    }
  };

  const handleLeaveRoom = () => {
    setCurrentView('matchmaking');
    setRoomId('');
    setIsHost(false);
  };

  // Load opponent deck when both players ready (multiplayer only)
  useEffect(() => {
    if (!isCPUMode && room && room.status === 'ready' && currentView === 'waiting') {
      // Get opponent's deck from room
      const opponentDeckData = isHost ? room.guestDeck : room.hostDeck;

      if (opponentDeckData && Array.isArray(opponentDeckData) && opponentDeckData.length === 10) {
        // Both players ready with decks - this will be handled by PokerWaitingRoom's onGameStart
        // which will pass the opponent deck to handleGameStart
      }
    }
  }, [room, isCPUMode, isHost, currentView]);

  // Sync game state from room for PvP mode
  useEffect(() => {
    if (!isCPUMode && room && room.gameState && currentView === 'game') {
      const gs = room.gameState;

      // Sync phase
      if (gs.phase) setPhase(gs.phase as GamePhase);

      // Sync round
      if (gs.currentRound) setCurrentRound(gs.currentRound);

      // Sync pot
      if (gs.pot !== undefined) setPot(gs.pot);

      // Sync scores
      if (gs.hostScore !== undefined && gs.guestScore !== undefined) {
        if (isHost) {
          setPlayerScore(gs.hostScore);
          setOpponentScore(gs.guestScore);
        } else {
          setPlayerScore(gs.guestScore);
          setOpponentScore(gs.hostScore);
        }
      }

      // Sync current bet
      if (gs.currentBet !== undefined) setCurrentBet(gs.currentBet);

      // Sync opponent's selected card (only show after they select)
      if (isHost && gs.guestSelectedCard) {
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (!isHost && gs.hostSelectedCard) {
        setOpponentSelectedCard(gs.hostSelectedCard);
      }

      // Sync opponent's action
      if (isHost && gs.guestAction) {
        setOpponentAction(gs.guestAction as CardAction);
      } else if (!isHost && gs.hostAction) {
        setOpponentAction(gs.hostAction as CardAction);
      }

      // Sync bankrolls from room
      if (room.hostBankroll !== undefined && room.guestBankroll !== undefined) {
        if (isHost) {
          setPlayerBankroll(room.hostBankroll);
          setOpponentBankroll(room.guestBankroll);
        } else {
          setPlayerBankroll(room.guestBankroll);
          setOpponentBankroll(room.hostBankroll);
        }
      }
    }
  }, [room, isCPUMode, isHost, currentView]);

  // Early returns for matchmaking flow
  if (currentView === 'matchmaking') {
    return (
      <PokerMatchmaking
        onClose={onClose}
        onRoomJoined={handleRoomJoined}
        playerAddress={playerAddress}
        playerUsername={playerUsername}
      />
    );
  }

  if (currentView === 'waiting' && !isSpectator) {
    return (
      <PokerWaitingRoom
        roomId={roomId}
        isHost={isHost}
        ante={selectedAnte}
        token={selectedToken}
        playerAddress={playerAddress}
        playerUsername={playerUsername}
        playerCards={playerCards}
        onGameStart={handleGameStart}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 bg-vintage-gold text-vintage-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:bg-vintage-burnt-gold transition"
        >
          ×
        </button>

        {/* DECK BUILDING PHASE */}
        {phase === 'deck-building' && (
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold p-6 h-full overflow-y-auto">
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 text-center">
              BUILD YOUR DECK
            </h2>
            <p className="text-vintage-burnt-gold text-center mb-6">
              Select 10 cards from your collection ({selectedDeck.length}/10)
            </p>

            {/* Selected Deck Display */}
            <div className="mb-6 bg-green-900/40 border-2 border-vintage-gold/50 rounded-xl p-4">
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
                          className="w-full h-full rounded-lg flex flex-col items-center justify-center p-2"
                          style={{ background: getRarityGradient(selectedDeck[i].rarity) }}
                        >
                          <div className="text-white text-xs font-bold text-center mb-1">{selectedDeck[i].name}</div>
                          <div className="text-white text-lg font-bold">{Math.round(selectedDeck[i].power).toLocaleString()}</div>
                        </div>
                      )
                    ) : (
                      <span className="text-vintage-gold text-3xl">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Cards */}
            <div className="grid grid-cols-10 gap-2 mb-4">
              {paginatedCards.map((card) => {
                const isSelected = selectedDeck.find(c => c.tokenId === card.tokenId);
                return (
                  <button
                    key={card.tokenId}
                    onClick={() => toggleCardInDeck(card)}
                    className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                      isSelected
                        ? 'border-vintage-gold shadow-gold'
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
                        <div className="text-white text-[0.5rem] font-bold text-center mb-0.5 leading-tight">{card.name}</div>
                        <div className="text-white text-sm font-bold">{Math.round(card.power).toLocaleString()}</div>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-vintage-gold/20 flex items-center justify-center">
                        <span className="text-4xl">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-4">
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

            {/* Start button */}
            <button
              onClick={startGame}
              disabled={selectedDeck.length !== 10}
              className={`w-full py-4 rounded-xl font-display font-bold text-xl transition ${
                selectedDeck.length === 10
                  ? 'bg-vintage-gold text-vintage-black hover:bg-vintage-burnt-gold'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedDeck.length === 10 ? 'START GAME' : `SELECT ${10 - selectedDeck.length} MORE CARDS`}
            </button>
          </div>
        )}

        {/* GAME TABLE - POKER FELT DESIGN */}
        {phase !== 'deck-building' && phase !== 'game-over' && (
          <div className="h-full flex flex-col">

            {/* Game info header */}
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-t-2xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-vintage-gold font-display font-bold">
                  ROUND {currentRound}/7 • Score: {playerScore}-{opponentScore}
                </div>
                {(selectedAnte === 0 || isSpectator) && (
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/50 flex items-center gap-1 animate-pulse">
                    <span>👁️</span> SPECTATOR
                  </div>
                )}
              </div>
              <div className="text-vintage-gold font-display font-bold text-2xl">
                POT: {pot} {selectedToken}
              </div>
              <div className="text-vintage-burnt-gold font-modern">
                {isSpectator || selectedAnte === 0 ? (
                  <>Host: {playerBankroll} | Guest: {opponentBankroll} {selectedToken}</>
                ) : (
                  <>Bankroll: {playerBankroll} {selectedToken}</>
                )}
              </div>
            </div>

            {/* POKER TABLE - GREEN FELT */}
            <div
              className="flex-1 relative rounded-b-2xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at center, #0d5e3a 0%, #0a4a2e 50%, #073d25 100%)',
                backgroundImage: `
                  radial-gradient(ellipse at center, #0d5e3a 0%, #0a4a2e 50%, #073d25 100%),
                  repeating-linear-gradient(
                    90deg,
                    rgba(0,0,0,0.03) 0px,
                    rgba(0,0,0,0.03) 1px,
                    transparent 1px,
                    transparent 2px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.03) 0px,
                    rgba(0,0,0,0.03) 1px,
                    transparent 1px,
                    transparent 2px
                  )
                `,
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)'
              }}
            >
              {/* Border - vintage gold */}
              <div className="absolute inset-0 border-4 border-vintage-gold rounded-b-2xl pointer-events-none" />

              {/* Table content */}
              <div className="relative h-full p-8 flex flex-col justify-between">

                {/* OPPONENT SECTION */}
                <div className="text-center">
                  <div className="text-vintage-gold font-display font-bold mb-4">
                    OPPONENT • {opponentBankroll} {selectedToken}
                  </div>

                  {/* Opponent's selected card (hidden until reveal) */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-32 aspect-[2/3] border-2 border-dashed border-vintage-gold rounded-lg flex flex-col items-center justify-center bg-vintage-deep-black/30 transition-all duration-500">
                      {phase === 'pre-reveal-betting' ? (
                        <div className="text-center animate-pulse">
                          <span className="text-vintage-gold text-6xl mb-2">🂠</span>
                          <p className="text-vintage-burnt-gold text-sm">Card Hidden</p>
                        </div>
                      ) : opponentSelectedCard ? (
                        <div className="relative w-full h-full animate-in fade-in zoom-in duration-700">
                          {(opponentSelectedCard.imageUrl || opponentSelectedCard.image) ? (
                            <img
                              src={(opponentSelectedCard.imageUrl || opponentSelectedCard.image)}
                              alt={opponentSelectedCard.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center p-2 rounded-lg"
                              style={{ background: getRarityGradient(opponentSelectedCard.rarity) }}
                            >
                              <div className="text-white text-xs font-bold text-center mb-1">{opponentSelectedCard.name}</div>
                              <div className="text-white text-2xl font-bold">{Math.round(opponentSelectedCard.power).toLocaleString()}</div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold text-center">
                            {opponentSelectedCard.name}<br/>
                            {Math.round(opponentSelectedCard.power * (
                              opponentAction === 'BOOST' ? 1.3 :
                              opponentAction === 'DOUBLE' ? 2 : 1
                            )).toLocaleString()}
                            {opponentAction === 'BOOST' && ' ⚔️'}
                            {opponentAction === 'DOUBLE' && ' 💥'}
                            {opponentAction === 'SHIELD' && ' 🛡️'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-vintage-gold text-4xl animate-pulse">?</span>
                      )}
                    </div>
                    {phase !== 'pre-reveal-betting' && opponentAction && opponentAction !== 'PASS' && (
                      <div className="mt-2 bg-red-900/50 border border-red-700 px-3 py-1 rounded animate-in slide-in-from-top duration-500">
                        <span className="text-red-300 text-sm font-bold">
                          {opponentAction === 'BOOST' && '⚔️ Opponent used BOOST (+30%)'}
                          {opponentAction === 'SHIELD' && '🛡️ Opponent used SHIELD (Block Boost)'}
                          {opponentAction === 'DOUBLE' && '💥 Opponent used CRITICAL (x2)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CENTER - POT & ACTIONS */}
                <div className="text-center">
                  <div className="inline-block bg-vintage-deep-black/50 border-2 border-vintage-gold px-8 py-4 rounded-full transition-all duration-500 hover:scale-105">
                    <div className="text-vintage-gold font-display font-bold text-3xl">
                      💰 {pot} {selectedToken}
                    </div>
                  </div>

                  {/* Phase indicator */}
                  <div className="mt-4">
                    <div className="inline-block bg-vintage-gold/20 border-2 border-vintage-gold px-6 py-2 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="text-vintage-gold font-display font-bold text-lg">
                        {phase === 'card-selection' && !isCPUMode && playerSelectedCard && !opponentSelectedCard && (
                          <span className="animate-pulse">⏳ WAITING FOR OPPONENT...</span>
                        )}
                        {phase === 'card-selection' && (isCPUMode || !playerSelectedCard) && '📋 SELECT A CARD FROM YOUR HAND'}
                        {phase === 'pre-reveal-betting' && '💰 PRE-REVEAL BETTING ROUND'}
                        {phase === 'reveal' && '⚔️ CARDS REVEALED - CHOOSE YOUR ACTION'}
                        {phase === 'post-reveal-betting' && '🎲 FINAL BETTING ROUND'}
                        {phase === 'resolution' && <span className="animate-pulse">⏳ CALCULATING WINNER...</span>}
                      </div>
                    </div>
                    {phase === 'reveal' && playerSelectedCard && opponentSelectedCard && (
                      <div className="mt-3 text-vintage-burnt-gold font-modern text-sm">
                        Your card: {playerSelectedCard.name} ({Math.round(playerSelectedCard.power).toLocaleString()})
                        <br/>
                        vs Opponent: {opponentSelectedCard.name} ({Math.round(opponentSelectedCard.power).toLocaleString()})
                      </div>
                    )}
                  </div>
                </div>

                {/* PLAYER SECTION - YOUR HAND */}
                <div className="text-center">
                  <div className="text-vintage-gold font-display font-bold mb-4">
                    YOUR HAND
                  </div>

                  {/* Hand cards */}
                  <div className="flex justify-center gap-2 mb-6">
                    {playerHand.map((card, index) => (
                      <button
                        key={card.tokenId}
                        onClick={() => phase === 'card-selection' && selectCard(card)}
                        disabled={phase !== 'card-selection' || selectedAnte === 0 || isSpectator}
                        style={{ animationDelay: `${index * 100}ms` }}
                        className={`w-24 aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                          playerSelectedCard?.tokenId === card.tokenId
                            ? 'border-vintage-gold shadow-gold scale-110 -translate-y-2'
                            : 'border-vintage-gold/50 hover:border-vintage-gold hover:scale-105 hover:-translate-y-1'
                        } ${phase !== 'card-selection' || selectedAnte === 0 || isSpectator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
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
                            <div className="text-white text-[0.5rem] font-bold text-center mb-1">{card.name}</div>
                            <div className="text-white text-sm font-bold">{Math.round(card.power).toLocaleString()}</div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold transition-colors">
                          {Math.round(card.power).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  {phase === 'pre-reveal-betting' && !isSpectator && selectedAnte !== 0 && (
                    <div className="flex justify-center gap-3 animate-in fade-in slide-in-from-bottom duration-500">
                      <button
                        onClick={() => handleBet(Math.round(selectedAnte * 0.4))}
                        disabled={selectedAnte === 0 || isSpectator}
                        className="px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        BET {Math.round(selectedAnte * 0.4)}
                      </button>
                      <button
                        onClick={() => handleBet(selectedAnte)}
                        disabled={selectedAnte === 0 || isSpectator}
                        className="px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        BET {selectedAnte}
                      </button>
                      <button
                        onClick={handleFold}
                        disabled={selectedAnte === 0 || isSpectator}
                        className="px-6 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        FOLD
                      </button>
                    </div>
                  )}

                  {phase === 'reveal' && !isSpectator && selectedAnte !== 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-500">
                      <div className="text-center text-vintage-burnt-gold text-sm font-bold mb-2">
                        💰 BOOST SHOP - Your Bankroll: {playerBankroll} {selectedToken}
                      </div>
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => selectAction('BOOST')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('BOOST')}
                          className={`px-4 py-3 font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 ${
                            playerBankroll >= getBoostPrice('BOOST') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          ⚔️ BOOST<br/>
                          <span className="text-xs">+30% • {getBoostPrice('BOOST')} {selectedToken}</span>
                        </button>

                        <button
                          onClick={() => selectAction('SHIELD')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('SHIELD')}
                          className={`px-4 py-3 font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 ${
                            playerBankroll >= getBoostPrice('SHIELD') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          🛡️ SHIELD<br/>
                          <span className="text-xs">Block Boost • {getBoostPrice('SHIELD')} {selectedToken}</span>
                        </button>

                        <button
                          onClick={() => selectAction('DOUBLE')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('DOUBLE')}
                          className={`px-4 py-3 font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 ${
                            playerBankroll >= getBoostPrice('DOUBLE') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          💥 CRITICAL<br/>
                          <span className="text-xs">x2 Power • {getBoostPrice('DOUBLE')} {selectedToken}</span>
                        </button>

                        <button
                          onClick={() => selectAction('PASS')}
                          disabled={selectedAnte === 0 || isSpectator}
                          className="px-4 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✋ PASS<br/>
                          <span className="text-xs">Free • Save Money</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {phase === 'post-reveal-betting' && !isSpectator && selectedAnte !== 0 && (
                    <div className="flex justify-center gap-3 animate-in fade-in zoom-in duration-700">
                      <button
                        onClick={resolveRound}
                        disabled={selectedAnte === 0 || isSpectator}
                        className="px-8 py-4 bg-vintage-gold text-vintage-black font-bold text-xl rounded-lg hover:bg-vintage-burnt-gold transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        RESOLVE ROUND
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* SPECTATOR GAME OVER */}
        {phase === 'game-over' && (selectedAnte === 0 || isSpectator) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-8 text-center shadow-2xl max-w-md">
              <h2 className="text-4xl font-display font-bold text-vintage-gold mb-4">
                GAME OVER
              </h2>
              <p className="text-2xl text-vintage-burnt-gold mb-4">
                Final Score: {playerScore} - {opponentScore}
              </p>
              <p className="text-xl text-vintage-gold mb-6">
                {playerScore > opponentScore ? "Host Wins!" : playerScore < opponentScore ? "Guest Wins!" : "It's a Tie!"}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-4 bg-vintage-gold text-vintage-black font-bold text-xl rounded-lg hover:bg-vintage-burnt-gold transition-all hover:scale-105 active:scale-95"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* VICTORY POPUP */}
        {phase === 'game-over' && selectedAnte !== 0 && !isSpectator && playerScore > opponentScore && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-500">
            <div className="relative max-w-2xl w-full mx-4">
              {/* Victory Image */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border-4 border-vintage-gold shadow-2xl">
                <img
                  src="/victory-1.jpg"
                  alt="Victory"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Victory Text */}
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-8 text-center shadow-2xl">
                <h2 className="text-5xl font-display font-bold text-vintage-gold mb-4 animate-in zoom-in duration-700">
                  🎉 VICTORY! 🎉
                </h2>
                <p className="text-2xl text-vintage-burnt-gold mb-4">
                  Final Score: {playerScore} - {opponentScore}
                </p>
                <p className="text-xl text-green-400 font-bold mb-2">
                  Final Bankroll: {playerBankroll} {selectedToken}
                </p>
                <p className="text-lg text-green-300 mb-6">
                  Profit: +{playerBankroll - (selectedAnte * 50)} {selectedToken}
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-vintage-gold text-vintage-black font-bold text-xl rounded-lg hover:bg-vintage-burnt-gold transition-all hover:scale-105 active:scale-95"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEFEAT POPUP */}
        {phase === 'game-over' && selectedAnte !== 0 && !isSpectator && playerScore < opponentScore && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-500">
            <div className="relative max-w-2xl w-full mx-4">
              {/* Defeat Image */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border-4 border-red-600 shadow-2xl">
                <img
                  src="/defeat.gif"
                  alt="Defeat"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Defeat Text */}
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-red-600 p-8 text-center shadow-2xl">
                <h2 className="text-5xl font-display font-bold text-red-500 mb-4 animate-in zoom-in duration-700">
                  💀 DEFEAT 💀
                </h2>
                <p className="text-2xl text-vintage-burnt-gold mb-4">
                  Final Score: {playerScore} - {opponentScore}
                </p>
                <p className="text-xl text-red-400 font-bold mb-2">
                  Final Bankroll: {playerBankroll} {selectedToken}
                </p>
                <p className="text-lg text-red-300 mb-6">
                  Loss: {playerBankroll - (selectedAnte * 50)} {selectedToken}
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-red-600 text-white font-bold text-xl rounded-lg hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TIE POPUP */}
        {phase === 'game-over' && selectedAnte !== 0 && !isSpectator && playerScore === opponentScore && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-500">
            <div className="relative max-w-2xl w-full mx-4">
              {/* Defeat Image (reusing for tie) */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border-4 border-yellow-600 shadow-2xl">
                <img
                  src="/defeat.gif"
                  alt="Tie"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Tie Text */}
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-yellow-600 p-8 text-center shadow-2xl">
                <h2 className="text-5xl font-display font-bold text-yellow-500 mb-4 animate-in zoom-in duration-700">
                  🤝 TIE! 🤝
                </h2>
                <p className="text-2xl text-vintage-burnt-gold mb-4">
                  Final Score: {playerScore} - {opponentScore}
                </p>
                <p className="text-xl text-yellow-400 font-bold mb-2">
                  Final Bankroll: {playerBankroll} {selectedToken}
                </p>
                <p className="text-lg text-yellow-300 mb-6">
                  Result: {playerBankroll - (selectedAnte * 50) >= 0 ? '+' : ''}{playerBankroll - (selectedAnte * 50)} {selectedToken}
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-yellow-600 text-white font-bold text-xl rounded-lg hover:bg-yellow-700 transition-all hover:scale-105 active:scale-95"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
