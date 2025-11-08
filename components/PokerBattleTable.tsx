"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from '@/lib/audio-manager';
import { PokerMatchmaking } from './PokerMatchmaking';
import { PokerWaitingRoom } from './PokerWaitingRoom';
import FoilCardEffect from './FoilCardEffect';
import { SwordIcon, ShieldIcon, BoltIcon, HandIcon, TrophyIcon, SkullIcon, ChatIcon, EyeIcon, ClockIcon, CloseIcon } from './PokerIcons';

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

interface PokerBattleTableProps {
  onClose: () => void;
  playerCards: Card[]; // Player's full collection
  isCPUMode?: boolean; // If true, auto-select deck and start immediately
  opponentDeck?: Card[]; // Opponent's deck (for CPU mode)
  difficulty?: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'god'; // CPU difficulty
  playerAddress?: string; // For multiplayer matchmaking
  playerUsername?: string; // For multiplayer matchmaking
  isSpectator?: boolean; // If true, view-only mode (no interactions)
  isInFarcaster?: boolean; // If true, optimize UI for Farcaster miniapp
  soundEnabled?: boolean; // Sound effects enabled
}

type GamePhase = 'deck-building' | 'card-selection' | 'reveal' | 'resolution' | 'game-over';
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
  isInFarcaster = false,
  soundEnabled = true,
}: PokerBattleTableProps) {
  // View Mode state
  const [currentView, setCurrentView] = useState<ViewMode>(isCPUMode ? 'game' : 'matchmaking');
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [selectedAnte, setSelectedAnte] = useState(25);
  const [selectedToken, setSelectedToken] = useState<'TESTVBMS' | 'testUSDC' | 'VIBE_NFT'>('TESTVBMS');

  // Real-time room data for multiplayer
  const room = useQuery(
    api.pokerBattle.getPokerRoom,
    currentView === 'game' && !isCPUMode && roomId ? { roomId } : "skip"
  );

  // Mutations for game actions
  const initializeGameMutation = useMutation(api.pokerBattle.initializeGame);
  const selectCardMutation = useMutation(api.pokerBattle.selectCard);
  const useCardActionMutation = useMutation(api.pokerBattle.useCardAction);
  const resolveRoundMutation = useMutation(api.pokerBattle.resolveRound);

  // Chat system
  const messages = useQuery(
    api.pokerChat.getMessages,
    roomId && !isCPUMode ? { roomId } : "skip"
  );
  const sendMessageMutation = useMutation(api.pokerChat.sendMessage);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Betting system
  const placeBetMutation = useMutation(api.pokerBattle.placeBet);
  const resolveBetsMutation = useMutation(api.pokerBattle.resolveBets);
  const [placingBet, setPlacingBet] = useState(false);

  // Get player profiles for avatars
  const hostProfile = useQuery(
    api.profiles.getProfile,
    room?.hostAddress ? { address: room.hostAddress } : "skip"
  );
  const guestProfile = useQuery(
    api.profiles.getProfile,
    room?.guestAddress ? { address: room.guestAddress } : "skip"
  );

  // Game state
  const [phase, setPhase] = useState<GamePhase>('deck-building');
  const [currentRound, setCurrentRound] = useState(1);
  const [pot, setPot] = useState(0);

  // Deck & Hand
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [opponentHand, setOpponentHand] = useState<Card[]>([]);
  const [playerDeckRemaining, setPlayerDeckRemaining] = useState<Card[]>([]);
  const [opponentDeckRemaining, setOpponentDeckRemaining] = useState<Card[]>([]);

  // Current round states (must be before useEffect that uses them)
  const [playerSelectedCard, setPlayerSelectedCard] = useState<Card | null>(null);
  const [opponentSelectedCard, setOpponentSelectedCard] = useState<Card | null>(null);
  const [playerAction, setPlayerAction] = useState<CardAction | null>(null);
  const [opponentAction, setOpponentAction] = useState<CardAction | null>(null);

  // Monitor room state changes in PvP mode
  useEffect(() => {
    if (isCPUMode || !room) return;

    console.log('[PokerBattle] Room state updated', {
      roomId: room.roomId,
      status: room.status,
      gameState: room.gameState,
      phase,
      playerSelectedCard: !!playerSelectedCard,
      opponentSelectedCard: !!opponentSelectedCard,
      playerAction,
      opponentAction
    });

    // Check if both players have selected cards and actions - time to resolve
    if (room.gameState) {
      const { hostSelectedCard, guestSelectedCard, hostAction, guestAction, phase: serverPhase } = room.gameState;

      console.log('[PokerBattle] Server game state', {
        serverPhase,
        hostSelectedCard: !!hostSelectedCard,
        guestSelectedCard: !!guestSelectedCard,
        hostAction,
        guestAction
      });

      // If server is in reveal/resolution phase and both have acted, resolve
      if (serverPhase === 'reveal' || serverPhase === 'resolution') {
        if (hostSelectedCard && guestSelectedCard && hostAction && guestAction) {
          console.log('[PokerBattle] Both players ready - should resolve round now');

          // Sync local state with server
          if (phase !== 'resolution' && phase !== 'game-over') {
            console.log('[PokerBattle] Calling resolveRound from room sync');
            resolveRound();
          }
        }
      }
    }
  }, [room, isCPUMode]);

  // Timer countdown for actions
  useEffect(() => {
    // Reset timer when phase changes or when player makes action
    if (phase === 'card-selection' || phase === 'reveal') {
      setTimeRemaining(30);
    }

    // Only run timer during active phases
    if (phase !== 'card-selection' && phase !== 'reveal') {
      return;
    }

    // Don't count down if player has already acted
    if (phase === 'card-selection' && playerSelectedCard) return;
    if (phase === 'reveal' && playerAction) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up! Auto-select random action
          if (phase === 'card-selection' && !playerSelectedCard && playerHand.length > 0) {
            const randomCard = playerHand[Math.floor(Math.random() * playerHand.length)];
            selectCard(randomCard);
          } else if (phase === 'reveal' && !playerAction) {
            // Auto-pass without confirmation
            setPendingAction('PASS');
            setPlayerAction('PASS');

            if (isCPUMode) {
              setTimeout(() => {
                const actions: CardAction[] = ['BOOST', 'PASS', 'PASS', 'PASS'];
                const aiAction = actions[Math.floor(Math.random() * actions.length)];
                setOpponentAction(aiAction);
                const aiCost = getBoostPrice(aiAction);
                if (aiCost > 0) {
                  setOpponentBankroll(prev => prev - aiCost);
                }
                setTimeout(() => {
                  resolveRound();
                }, 800);
              }, 1000);
            }
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, playerSelectedCard, playerAction, playerHand]);

  // Betting
  const [playerBankroll, setPlayerBankroll] = useState(0);
  const [opponentBankroll, setOpponentBankroll] = useState(0);

  // Score
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Action Timer
  const [timeRemaining, setTimeRemaining] = useState(30); // 30 seconds per action

  // Confirmation dialog for actions
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<CardAction | null>(null);

  // Round winner display
  const [showRoundWinner, setShowRoundWinner] = useState(false);
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | null>(null);

  // Pagination for deck building
  const [currentPage, setCurrentPage] = useState(0);
  const [sortByPower, setSortByPower] = useState(false);

  // Responsive cards per page - fewer on mobile for better visibility
  const [cardsPerPage, setCardsPerPage] = useState(50);

  useEffect(() => {
    const updateCardsPerPage = () => {
      // Mobile/Farcaster: 20 cards, Desktop: 50 cards
      setCardsPerPage(window.innerWidth < 768 ? 20 : 50);
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  const CARDS_PER_PAGE = cardsPerPage;

  // Sort cards by power if enabled
  const sortedPlayerCards = sortByPower
    ? [...playerCards].sort((a, b) => (b.power || 0) - (a.power || 0))
    : playerCards;

  const totalPages = Math.ceil(sortedPlayerCards.length / CARDS_PER_PAGE);
  const paginatedCards = sortedPlayerCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  // Get rarity color for fallback cards
  const getRarityGradient = (rarity?: string): string => {
    if (!rarity) return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
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
    AudioManager.selectCardByRarity(card.rarity || 'common');
    if (selectedDeck.find(c => c.tokenId === card.tokenId)) {
      setSelectedDeck(selectedDeck.filter(c => c.tokenId !== card.tokenId));
    } else if (selectedDeck.length < 10) {
      setSelectedDeck([...selectedDeck, card]);
    }
  };

  const startGame = () => {
    console.log('[PokerBattle] startGame called', {
      selectedDeckLength: selectedDeck.length,
      isCPUMode,
      selectedAnte,
      opponentDeckLength: opponentDeck.length
    });

    if (selectedDeck.length !== 10) {
      console.error('[PokerBattle] Cannot start game - deck must have 10 cards, currently has:', selectedDeck.length);
      return;
    }
    AudioManager.buttonSuccess();

    // Shuffle deck
    const shuffled = [...selectedDeck].sort(() => Math.random() - 0.5);

    // Deal 5 cards to hand, 5 remain in deck
    const hand = shuffled.slice(0, 5);
    const deck = shuffled.slice(5);

    console.log('[PokerBattle] Player deck shuffled and dealt', {
      handSize: hand.length,
      deckRemainingSize: deck.length,
      hand: hand.map(c => ({ tokenId: c.tokenId, power: c.power }))
    });

    setPlayerHand(hand);
    setPlayerDeckRemaining(deck);

    if (isCPUMode) {
      // CPU mode: use the opponent deck passed as prop (already selected based on difficulty)
      if (opponentDeck.length >= 10) {
        const shuffledOpponent = [...opponentDeck].sort(() => Math.random() - 0.5);
        const aiHand = shuffledOpponent.slice(0, 5);
        const aiDeck = shuffledOpponent.slice(5);

        console.log('[PokerBattle] AI deck shuffled and dealt', {
          aiHandSize: aiHand.length,
          aiDeckRemainingSize: aiDeck.length,
          aiHand: aiHand.map(c => ({ tokenId: c.tokenId, power: c.power }))
        });

        setOpponentHand(aiHand);
        setOpponentDeckRemaining(aiDeck);
      } else {
        console.error('[PokerBattle] AI deck invalid - must have at least 10 cards, has:', opponentDeck.length);
      }
    } else {
      console.log('[PokerBattle] PvP mode - waiting for opponent deck from server');
    }

    const initialPot = isCPUMode ? 100 : selectedAnte * 2;
    const initialBankroll = isCPUMode ? 500 : selectedAnte * 50;

    console.log('[PokerBattle] Setting initial game state', {
      pot: initialPot,
      playerBankroll: initialBankroll,
      opponentBankroll: initialBankroll,
      phase: 'card-selection'
    });

    setPot(initialPot);
    setPlayerBankroll(initialBankroll);
    setOpponentBankroll(initialBankroll);
    setPhase('card-selection');
  };

  // Card Selection Phase
  const selectCard = async (card: Card) => {
    console.log('[PokerBattle] selectCard called', {
      card: { tokenId: card.tokenId, power: card.power, name: card.name },
      phase,
      isCPUMode,
      playerHandSize: playerHand.length,
      opponentHandSize: opponentHand.length
    });

    AudioManager.buttonClick();
    setPlayerSelectedCard(card);

    if (isCPUMode) {
      // AI randomly selects a card
      if (opponentHand.length === 0) {
        console.error('[PokerBattle] AI cannot select card - hand is empty!');
        return;
      }

      const aiCardIndex = Math.floor(Math.random() * opponentHand.length);
      const aiCard = opponentHand[aiCardIndex];

      console.log('[PokerBattle] AI selected card', {
        aiCard: { tokenId: aiCard.tokenId, power: aiCard.power, name: aiCard.name },
        aiCardIndex,
        aiHandSize: opponentHand.length
      });

      setOpponentSelectedCard(aiCard);

      // Delay before moving to reveal phase
      setTimeout(() => {
        console.log('[PokerBattle] Moving to reveal phase after card selection');
        setPhase('reveal');
      }, 800);
    } else {
      // PvP mode - send to server
      console.log('[PokerBattle] Sending card selection to server', { roomId, playerAddress });
      try {
        await selectCardMutation({
          roomId,
          address: playerAddress,
          card,
        });
        console.log('[PokerBattle] Card selection sent to server successfully');
      } catch (error) {
        console.error('[PokerBattle] Error selecting card:', error);
      }
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

  // Show confirmation dialog for action
  const showConfirmAction = (action: CardAction) => {
    const cost = getBoostPrice(action);

    // Check if player can afford it
    if (cost > 0 && cost > playerBankroll) {
      AudioManager.buttonError();
      return;
    }

    setPendingAction(action);
    setShowActionConfirm(true);
  };

  // Confirm and execute action
  const confirmAction = async () => {
    console.log('[PokerBattle] confirmAction called', {
      pendingAction,
      playerBankroll,
      phase
    });

    if (!pendingAction) {
      console.error('[PokerBattle] No pending action to confirm');
      return;
    }

    AudioManager.buttonClick();
    setShowActionConfirm(false);

    const action = pendingAction;
    const cost = getBoostPrice(action);

    console.log('[PokerBattle] Confirming action', { action, cost });

    setPlayerAction(action);

    // Deduct cost from bankroll
    if (cost > 0) {
      setPlayerBankroll(prev => {
        const newBankroll = prev - cost;
        console.log('[PokerBattle] Player paid for action', { prev, cost, newBankroll });
        return newBankroll;
      });
    }

    setPendingAction(null);

    if (isCPUMode) {
      console.log('[PokerBattle] CPU Mode - AI selecting action');
      // AI randomly selects action with delay
      setTimeout(() => {
        const actions: CardAction[] = ['BOOST', 'PASS', 'PASS', 'PASS']; // AI mostly passes
        const aiActionIndex = Math.floor(Math.random() * actions.length);
        const aiAction = actions[aiActionIndex];

        console.log('[PokerBattle] CPU Mode - AI selected action', { aiAction, aiActionIndex });

        setOpponentAction(aiAction);

        // AI pays for boost
        const aiCost = getBoostPrice(aiAction);
        if (aiCost > 0) {
          setOpponentBankroll(prev => {
            const newBankroll = prev - aiCost;
            console.log('[PokerBattle] CPU Mode - AI paid for action', { prev, aiCost, newBankroll });
            return newBankroll;
          });
        }

        setTimeout(() => {
          console.log('[PokerBattle] CPU Mode - Calling resolveRound after AI action');
          resolveRound();
        }, 800);
      }, 1000);
    } else {
      console.log('[PokerBattle] PvP Mode - Sending action to server', { roomId, playerAddress, action });
      // PvP mode - send to server
      try {
        await useCardActionMutation({
          roomId,
          address: playerAddress,
          action,
        });
        console.log('[PokerBattle] PvP Mode - Action sent to server successfully');
      } catch (error) {
        console.error('[PokerBattle] PvP Mode - Error using card action:', error);
      }
    }
  };

  // Cancel action
  const cancelAction = () => {
    setShowActionConfirm(false);
    setPendingAction(null);
    AudioManager.buttonClick();
  };

  // Calculate winner
  const resolveRound = async () => {
    console.log('[PokerBattle] resolveRound called', {
      playerSelectedCard: playerSelectedCard ? { tokenId: playerSelectedCard.tokenId, power: playerSelectedCard.power } : null,
      opponentSelectedCard: opponentSelectedCard ? { tokenId: opponentSelectedCard.tokenId, power: opponentSelectedCard.power } : null,
      playerAction,
      opponentAction,
      phase,
      currentRound,
      playerScore,
      opponentScore,
      pot
    });

    if (!playerSelectedCard || !opponentSelectedCard) {
      console.error('[PokerBattle] Cannot resolve round - missing selected cards', {
        hasPlayerCard: !!playerSelectedCard,
        hasOpponentCard: !!opponentSelectedCard
      });
      return;
    }

    AudioManager.buttonClick();
    setPhase('resolution');
    console.log('[PokerBattle] Phase set to resolution');

    if (isCPUMode) {
      console.log('[PokerBattle] CPU Mode - Starting 1s delay before resolution calculation');
      setTimeout(() => {
        console.log('[PokerBattle] CPU Mode - Timeout executed, calculating winner now');

        if (!playerSelectedCard || !opponentSelectedCard) {
          console.error('[PokerBattle] CPU Mode - Cards disappeared during timeout!', {
            hasPlayerCard: !!playerSelectedCard,
            hasOpponentCard: !!opponentSelectedCard
          });
          return;
        }

        let playerPower = playerSelectedCard.power || 0;
        let opponentPower = opponentSelectedCard.power || 0;

        console.log('[PokerBattle] CPU Mode - Base powers', {
          playerBasePower: playerPower,
          opponentBasePower: opponentPower
        });

        // Apply actions with shield logic
        const playerHasShield = playerAction === 'SHIELD';
        const opponentHasShield = opponentAction === 'SHIELD';

        console.log('[PokerBattle] CPU Mode - Shield check', {
          playerHasShield,
          opponentHasShield
        });

        // Apply BOOST (+30%)
        if (playerAction === 'BOOST' && !opponentHasShield) {
          playerPower *= 1.3;
          console.log('[PokerBattle] CPU Mode - Player BOOST applied:', playerPower);
        }
        if (opponentAction === 'BOOST' && !playerHasShield) {
          opponentPower *= 1.3;
          console.log('[PokerBattle] CPU Mode - Opponent BOOST applied:', opponentPower);
        }

        // Apply DOUBLE (x2)
        if (playerAction === 'DOUBLE') {
          playerPower *= 2;
          console.log('[PokerBattle] CPU Mode - Player DOUBLE applied:', playerPower);
        }
        if (opponentAction === 'DOUBLE') {
          opponentPower *= 2;
          console.log('[PokerBattle] CPU Mode - Opponent DOUBLE applied:', opponentPower);
        }

        const isTie = playerPower === opponentPower;
        const playerWins = playerPower > opponentPower;

        console.log('[PokerBattle] CPU Mode - Round resolution', {
          finalPlayerPower: playerPower,
          finalOpponentPower: opponentPower,
          isTie,
          playerWins,
          pot
        });

        if (isTie) {
          // TIE - both players get their ante back, no winner
          console.log('[PokerBattle] CPU Mode - Round is a TIE!', { playerPower, opponentPower });
          setPlayerBankroll(prev => {
            const anteAmount = isCPUMode ? 50 : selectedAnte;
            const newBankroll = prev + anteAmount;
            console.log('[PokerBattle] CPU Mode - Player gets ante back (tie)', { prev, anteAmount, newBankroll });
            return newBankroll;
          });
          setOpponentBankroll(prev => {
            const anteAmount = isCPUMode ? 50 : selectedAnte;
            const newBankroll = prev + anteAmount;
            console.log('[PokerBattle] CPU Mode - Opponent gets ante back (tie)', { prev, anteAmount, newBankroll });
            return newBankroll;
          });
          setPot(0);
          setRoundWinner(null);
          AudioManager.tie(); // Tie sound

          // Show tie message
          setShowRoundWinner(true);
          console.log('[PokerBattle] CPU Mode - Showing tie message, waiting 2.5s before next round');

          setTimeout(() => {
            console.log('[PokerBattle] CPU Mode - 3.5s timeout for tie completed, proceeding to next round');
            setShowRoundWinner(false);
            nextRound();
          }, 3500);
        } else if (playerWins) {
          setPlayerBankroll(prev => {
            const newBankroll = prev + pot;
            console.log('[PokerBattle] CPU Mode - Player won pot', { prev, pot, newBankroll });
            return newBankroll;
          });
          setPlayerScore(prev => {
            const newScore = prev + 1;
            console.log('[PokerBattle] CPU Mode - Player score increased', { prev, newScore });
            return newScore;
          });
          setRoundWinner('player');
          AudioManager.buttonSuccess(); // Victory sound
        } else {
          setOpponentBankroll(prev => {
            const newBankroll = prev + pot;
            console.log('[PokerBattle] CPU Mode - Opponent won pot', { prev, pot, newBankroll });
            return newBankroll;
          });
          setOpponentScore(prev => {
            const newScore = prev + 1;
            console.log('[PokerBattle] CPU Mode - Opponent score increased', { prev, newScore });
            return newScore;
          });
          setRoundWinner('opponent');
          AudioManager.buttonError(); // Defeat sound
        }

        setPot(0);

        // Show round winner message
        setShowRoundWinner(true);
        console.log('[PokerBattle] CPU Mode - Showing round winner, waiting 3.5s');

        // Hide message and check win condition after delay
        setTimeout(() => {
          console.log('[PokerBattle] CPU Mode - 3.5s timeout completed, checking win condition');
          setShowRoundWinner(false);
          setRoundWinner(null);

          const newPlayerScore = playerScore + (playerWins ? 1 : 0);
          const newOpponentScore = opponentScore + (playerWins ? 0 : 1);

          console.log('[PokerBattle] CPU Mode - Checking win condition', {
            newPlayerScore,
            newOpponentScore,
            gameOver: newPlayerScore >= 4 || newOpponentScore >= 4
          });

          if (newPlayerScore >= 4 || newOpponentScore >= 4) {
            console.log('[PokerBattle] CPU Mode - Game over!', {
              winner: newPlayerScore >= 4 ? 'player' : 'opponent'
            });
            setPhase('game-over');
          } else {
            console.log('[PokerBattle] CPU Mode - Proceeding to next round');
            nextRound();
          }
        }, 3500);
      }, 1000);
    } else {
      // PvP mode - send to server for resolution
      console.log('[PokerBattle] PvP Mode - Sending resolution to server', { roomId, playerAddress });
      try {
        const result = await resolveRoundMutation({
          roomId,
          address: playerAddress,
        });

        console.log('[PokerBattle] PvP Mode - Server response received', result);

        // Calculate winner locally to show correct animation
        if (!playerSelectedCard || !opponentSelectedCard) {
          console.error('[PokerBattle] PvP Mode - Missing selected cards for resolution');
          return;
        }

        let playerPower = playerSelectedCard.power || 0;
        let opponentPower = opponentSelectedCard.power || 0;

        console.log('[PokerBattle] PvP Mode - Base powers', {
          playerBasePower: playerPower,
          opponentBasePower: opponentPower
        });

        // Apply actions with shield logic
        const playerHasShield = playerAction === 'SHIELD';
        const opponentHasShield = opponentAction === 'SHIELD';

        console.log('[PokerBattle] PvP Mode - Shield check', {
          playerHasShield,
          opponentHasShield
        });

        // Apply BOOST (+30%)
        if (playerAction === 'BOOST' && !opponentHasShield) {
          playerPower *= 1.3;
          console.log('[PokerBattle] PvP Mode - Player BOOST applied:', playerPower);
        }
        if (opponentAction === 'BOOST' && !playerHasShield) {
          opponentPower *= 1.3;
          console.log('[PokerBattle] PvP Mode - Opponent BOOST applied:', opponentPower);
        }

        // Apply DOUBLE (x2)
        if (playerAction === 'DOUBLE') {
          playerPower *= 2;
          console.log('[PokerBattle] PvP Mode - Player DOUBLE applied:', playerPower);
        }
        if (opponentAction === 'DOUBLE') {
          opponentPower *= 2;
          console.log('[PokerBattle] PvP Mode - Opponent DOUBLE applied:', opponentPower);
        }

        const isTie = playerPower === opponentPower;
        const playerWins = playerPower > opponentPower;

        console.log('[PokerBattle] PvP Mode - Round resolution', {
          finalPlayerPower: playerPower,
          finalOpponentPower: opponentPower,
          isTie,
          playerWins
        });

        // Show round winner and handle game state transition
        setTimeout(() => {
          // Set round winner for display
          setRoundWinner(playerWins ? 'player' : 'opponent');
          setShowRoundWinner(true);

          console.log('[PokerBattle] PvP Mode - Showing round winner', {
            winner: playerWins ? 'player' : 'opponent'
          });

          // Play sound
          if (playerWins) {
            AudioManager.buttonSuccess();
          } else {
            AudioManager.buttonError();
          }

          setTimeout(() => {
            setShowRoundWinner(false);
            setRoundWinner(null);

            console.log('[PokerBattle] PvP Mode - Checking game over', {
              gameOver: result.gameOver
            });

            // Check if game is over based on server response
            if (result.gameOver) {
              console.log('[PokerBattle] PvP Mode - Game over!');
              setPhase('game-over');
            } else {
              console.log('[PokerBattle] PvP Mode - Resetting for next round');
              // Server already moved to next round, sync will happen via useEffect
              // But we can manually reset local state to be ready
              setPlayerSelectedCard(null);
              setOpponentSelectedCard(null);
              setPlayerAction(null);
              setOpponentAction(null);
            }
          }, 3500);
        }, 1000);
      } catch (error) {
        console.error('[PokerBattle] PvP Mode - Error resolving round:', error);
        AudioManager.buttonError();
      }
    }
  };

  const nextRound = () => {
    console.log('[PokerBattle] nextRound called', {
      currentRound,
      playerDeckRemainingSize: playerDeckRemaining.length,
      opponentDeckRemainingSize: opponentDeckRemaining.length,
      playerHandSize: playerHand.length,
      opponentHandSize: opponentHand.length
    });

    // Draw new cards
    if (playerDeckRemaining.length > 0) {
      const newCard = playerDeckRemaining[0];
      console.log('[PokerBattle] Drawing new card for player', {
        newCard: { tokenId: newCard.tokenId, power: newCard.power },
        removingCard: playerSelectedCard ? { tokenId: playerSelectedCard.tokenId, power: playerSelectedCard.power } : null
      });
      setPlayerHand(prev => [...prev.filter(c => c.tokenId !== playerSelectedCard?.tokenId), newCard]);
      setPlayerDeckRemaining(prev => prev.slice(1));
    } else {
      console.log('[PokerBattle] No cards left in player deck - removing selected card from hand');
      setPlayerHand(prev => prev.filter(c => c.tokenId !== playerSelectedCard?.tokenId));
    }

    if (opponentDeckRemaining.length > 0) {
      const newCard = opponentDeckRemaining[0];
      console.log('[PokerBattle] Drawing new card for opponent', {
        newCard: { tokenId: newCard.tokenId, power: newCard.power },
        removingCard: opponentSelectedCard ? { tokenId: opponentSelectedCard.tokenId, power: opponentSelectedCard.power } : null
      });
      setOpponentHand(prev => [...prev.filter(c => c.tokenId !== opponentSelectedCard?.tokenId), newCard]);
      setOpponentDeckRemaining(prev => prev.slice(1));
    } else {
      console.log('[PokerBattle] No cards left in opponent deck - removing selected card from hand');
      setOpponentHand(prev => prev.filter(c => c.tokenId !== opponentSelectedCard?.tokenId));
    }

    const newRound = currentRound + 1;
    const anteAmount = isCPUMode ? 50 : selectedAnte;
    const newPot = anteAmount * 2;

    console.log('[PokerBattle] Advancing to next round', {
      newRound,
      anteAmount,
      newPot,
      playerBankrollBefore: playerBankroll,
      opponentBankrollBefore: opponentBankroll
    });

    setCurrentRound(prev => prev + 1);
    setPlayerSelectedCard(null);
    setOpponentSelectedCard(null);
    setPlayerAction(null);
    setOpponentAction(null);

    setPot(newPot);
    setPlayerBankroll(prev => {
      const newBankroll = prev - anteAmount;
      console.log('[PokerBattle] Player paid ante', { prev, anteAmount, newBankroll });
      return newBankroll;
    });
    setOpponentBankroll(prev => {
      const newBankroll = prev - anteAmount;
      console.log('[PokerBattle] Opponent paid ante', { prev, anteAmount, newBankroll });
      return newBankroll;
    });

    console.log('[PokerBattle] Moving to card-selection phase for round', newRound);
    setPhase('card-selection');
  };

  // Chat functions
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !roomId || isCPUMode) return;

    try {
      await sendMessageMutation({
        roomId,
        sender: playerAddress,
        senderUsername: playerUsername,
        message: chatInput.trim(),
      });
      setChatInput('');
    } catch (error) {
      console.error('[PokerBattle] Error sending chat message:', error);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle placing a bet
  const handlePlaceBet = async (betOnAddress: string, amount: number) => {
    if (!roomId || placingBet) return;

    try {
      setPlacingBet(true);
      await placeBetMutation({
        roomId,
        bettor: playerAddress,
        bettorUsername: playerUsername,
        betOn: betOnAddress,
        amount,
      });
      AudioManager.buttonSuccess();
    } catch (error: any) {
      console.error('[PokerBattle] Failed to place bet:', error);
      alert(error.message || 'Failed to place bet');
      AudioManager.buttonError();
    } finally {
      setPlacingBet(false);
    }
  };

  // Matchmaking callbacks
  const handleRoomJoined = (newRoomId: string, host: boolean, ante: number, token: string, spectator: boolean = false) => {
    setRoomId(newRoomId);
    setIsHost(host);
    setSelectedAnte(ante);
    setSelectedToken(token as 'TESTVBMS' | 'testUSDC' | 'VIBE_NFT');
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

  // Play audio when game ends
  useEffect(() => {
    if (phase === 'game-over' && selectedAnte !== 0 && !isSpectator && soundEnabled) {
      // Play appropriate sound based on result
      if (playerScore > opponentScore) {
        AudioManager.win(); // Victory sound
      } else if (playerScore < opponentScore) {
        AudioManager.lose(); // Defeat sound
      } else {
        AudioManager.tie(); // Tie sound
      }
    }
  }, [phase, playerScore, opponentScore, selectedAnte, isSpectator, soundEnabled]);

  // Resolve bets when game ends (PvP mode only)
  useEffect(() => {
    if (phase === 'game-over' && !isCPUMode && roomId && room) {
      // Determine winner
      const winnerId = playerScore > opponentScore
        ? (isHost ? room.hostAddress : room.guestAddress)
        : (isHost ? room.guestAddress : room.hostAddress);

      if (winnerId) {
        // Resolve all bets for this room
        resolveBetsMutation({
          roomId,
          winnerId,
        }).then((result) => {
          console.log(`💰 Bets resolved: ${result.resolved} bets, ${result.totalPaidOut} total paid out`);
        }).catch((error) => {
          console.error('[PokerBattle] Failed to resolve bets:', error);
        });
      }
    }
  }, [phase, playerScore, opponentScore, isCPUMode, roomId, room, isHost, resolveBetsMutation]);

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-1 sm:p-2 md:p-4">
      <div className="w-full max-w-7xl h-[98vh] sm:h-[95vh] max-h-[900px] relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 bg-vintage-gold text-vintage-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:bg-vintage-burnt-gold transition"
        >
          ×
        </button>

        {/* DECK BUILDING PHASE */}
        {phase === 'deck-building' && (
          <div className="bg-vintage-charcoal rounded-xl sm:rounded-2xl border-2 sm:border-4 border-vintage-gold p-2 sm:p-4 md:p-6 h-full overflow-y-auto">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold mb-2 sm:mb-3 text-center">
              BUILD YOUR DECK
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 gap-2">
              <p className="text-vintage-burnt-gold text-center text-sm sm:text-base">
                Select 10 cards ({selectedDeck.length}/10)
              </p>
              <button
                onClick={() => {
                  setSortByPower(!sortByPower);
                  setCurrentPage(0);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  sortByPower
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                }`}
              >
                {sortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
              </button>
            </div>

            {/* Selected Deck Display */}
            <div className="mb-3 sm:mb-4 bg-green-900/40 border-2 border-vintage-gold/50 rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className={`grid ${isInFarcaster ? 'grid-cols-3 gap-1' : 'grid-cols-5 gap-2'}`}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] border-2 border-dashed border-vintage-gold/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
                  >
                    {selectedDeck[i] ? (
                      <>
                        {(selectedDeck[i].imageUrl || selectedDeck[i].image) ? (
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
                            <div className="text-white text-lg font-bold">{Math.round(selectedDeck[i].power || 0).toLocaleString()}</div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-xs font-bold text-center">
                          {Math.round(selectedDeck[i].power || 0).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <span className="text-vintage-gold text-3xl">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Cards */}
            <div className={`grid ${
              isInFarcaster
                ? 'grid-cols-4 gap-1'
                : 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2'
            } mb-3 sm:mb-4`}>
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
                        <div className="text-white text-sm font-bold">{Math.round(card.power || 0).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-[0.6rem] font-bold text-center">
                      {Math.round(card.power || 0).toLocaleString()}
                    </div>
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

        {/* SPECTATOR VIEW - Split Screen showing both players */}
        {phase !== 'deck-building' && phase !== 'game-over' && (selectedAnte === 0 || isSpectator) && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-t-2xl p-2 md:p-3">
              <div className="flex justify-between items-center text-sm md:text-base">
                <div className="text-vintage-gold font-display font-bold">
                  ROUND {currentRound}/7 • Score: {playerScore}-{opponentScore}
                </div>
                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/50 flex items-center gap-1 animate-pulse">
                  <EyeIcon className="inline-block text-blue-400" size={16} /> SPECTATOR MODE
                </div>
                <div className="text-vintage-gold font-display font-bold">
                  POT: {pot} {selectedToken}
                </div>
              </div>
            </div>

            {/* Split screen - Both players side by side (or vertical on mobile) */}
            <div className={`flex-1 p-2 bg-vintage-deep-black rounded-b-2xl border-2 border-vintage-gold border-t-0 ${isInFarcaster ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-2'}`}>
              {/* HOST SIDE */}
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-xl border-2 border-blue-500/50 p-3 flex flex-col">
                {/* Host Profile */}
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {hostProfile?.twitterProfileImageUrl ? (
                      <img
                        src={hostProfile.twitterProfileImageUrl}
                        alt={room?.hostUsername}
                        className={isInFarcaster ? "w-12 h-12 rounded-full border-2 border-blue-400" : "w-10 h-10 rounded-full border-2 border-blue-400"}
                      />
                    ) : (
                      <div className={`${isInFarcaster ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white font-bold`}>
                        {room?.hostUsername?.charAt(0).toUpperCase() || 'H'}
                      </div>
                    )}
                    <div>
                      <div className={`text-blue-400 font-display font-bold ${isInFarcaster ? 'text-base' : 'text-sm'}`}>{room?.hostUsername || 'HOST'}</div>
                      <div className={`text-vintage-gold ${isInFarcaster ? 'text-sm' : 'text-xs'}`}>{playerBankroll} {selectedToken}</div>
                    </div>
                  </div>

                  {/* Bet Buttons - Only show for spectators */}
                  {isSpectator && room?.hostAddress && (
                    <div className="flex gap-2 justify-center mt-2">
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handlePlaceBet(room.hostAddress, amount)}
                          disabled={placingBet}
                          className={`bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold rounded transition-all hover:scale-105 active:scale-95 ${isInFarcaster ? 'px-4 py-3 text-sm min-h-[44px] min-w-[44px]' : 'px-2 py-1 text-xs'}`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Host's selected card */}
                <div className="flex-1 flex items-center justify-center mb-3">
                  <div className="w-24 sm:w-32 aspect-[2/3] border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center bg-black/30">
                    {playerSelectedCard && phase === 'resolution' ? (
                      <div className="relative w-full h-full">
                        {playerSelectedCard.imageUrl || playerSelectedCard.image ? (
                          <img src={playerSelectedCard.imageUrl || playerSelectedCard.image} alt={playerSelectedCard.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-lg" style={{ background: getRarityGradient(playerSelectedCard.rarity) }}>
                            <div className="text-white text-xs font-bold text-center">{playerSelectedCard.name}</div>
                            <div className="text-white text-lg font-bold">{Math.round(playerSelectedCard.power || 0)}</div>
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 bg-black/80 p-0.5 text-center text-blue-300 ${isInFarcaster ? 'text-xs' : 'text-[10px]'} flex items-center justify-center gap-0.5`}>
                          {Math.round((playerSelectedCard.power || 0) * (playerAction === 'BOOST' ? 1.3 : playerAction === 'DOUBLE' ? 2 : 1))}
                          {playerAction === 'BOOST' && <SwordIcon className="inline-block text-blue-300" size={12} />}
                          {playerAction === 'DOUBLE' && <BoltIcon className="inline-block text-blue-300" size={12} />}
                          {playerAction === 'SHIELD' && <ShieldIcon className="inline-block text-blue-300" size={12} />}
                        </div>
                      </div>
                    ) : playerSelectedCard ? (
                      <img src="/images/card-back.png" alt="Hidden" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-blue-400 text-2xl animate-pulse">?</span>
                    )}
                  </div>
                </div>

                {/* Host's hand (small cards) */}
                <div className="grid grid-cols-5 gap-1">
                  {playerHand.map((card, i) => (
                    <div key={i} className={`aspect-[2/3] rounded border ${playerSelectedCard?.tokenId === card.tokenId ? 'border-2 border-yellow-400 ring-2 ring-yellow-400' : 'border border-blue-500/30'} overflow-hidden bg-black/50`}>
                      {card.imageUrl || card.image ? (
                        <img src={card.imageUrl || card.image} alt={card.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${isInFarcaster ? 'text-[10px]' : 'text-[8px]'}`}>{Math.round(card.power || 0)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GUEST SIDE */}
              <div className="bg-gradient-to-br from-red-900/30 to-red-950/30 rounded-xl border-2 border-red-500/50 p-3 flex flex-col">
                {/* Guest Profile */}
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {guestProfile?.twitterProfileImageUrl ? (
                      <img
                        src={guestProfile.twitterProfileImageUrl}
                        alt={room?.guestUsername}
                        className={isInFarcaster ? "w-12 h-12 rounded-full border-2 border-red-400" : "w-10 h-10 rounded-full border-2 border-red-400"}
                      />
                    ) : (
                      <div className={`${isInFarcaster ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center text-white font-bold`}>
                        {room?.guestUsername?.charAt(0).toUpperCase() || 'G'}
                      </div>
                    )}
                    <div>
                      <div className={`text-red-400 font-display font-bold ${isInFarcaster ? 'text-base' : 'text-sm'}`}>{room?.guestUsername || 'GUEST'}</div>
                      <div className={`text-vintage-gold ${isInFarcaster ? 'text-sm' : 'text-xs'}`}>{opponentBankroll} {selectedToken}</div>
                    </div>
                  </div>

                  {/* Bet Buttons - Only show for spectators */}
                  {isSpectator && room?.guestAddress && (
                    <div className="flex gap-2 justify-center mt-2">
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handlePlaceBet(room.guestAddress!, amount)}
                          disabled={placingBet}
                          className={`bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-bold rounded transition-all hover:scale-105 active:scale-95 ${isInFarcaster ? 'px-4 py-3 text-sm min-h-[44px] min-w-[44px]' : 'px-2 py-1 text-xs'}`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Guest's selected card */}
                <div className="flex-1 flex items-center justify-center mb-3">
                  <div className="w-24 sm:w-32 aspect-[2/3] border-2 border-dashed border-red-400 rounded-lg flex items-center justify-center bg-black/30">
                    {opponentSelectedCard && phase === 'resolution' ? (
                      <div className="relative w-full h-full">
                        {opponentSelectedCard.imageUrl || opponentSelectedCard.image ? (
                          <img src={opponentSelectedCard.imageUrl || opponentSelectedCard.image} alt={opponentSelectedCard.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-lg" style={{ background: getRarityGradient(opponentSelectedCard.rarity) }}>
                            <div className="text-white text-xs font-bold text-center">{opponentSelectedCard.name}</div>
                            <div className="text-white text-lg font-bold">{Math.round(opponentSelectedCard.power || 0)}</div>
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 bg-black/80 p-0.5 text-center text-red-300 ${isInFarcaster ? 'text-xs' : 'text-[10px]'} flex items-center justify-center gap-0.5`}>
                          {Math.round((opponentSelectedCard.power || 0) * (opponentAction === 'BOOST' ? 1.3 : opponentAction === 'DOUBLE' ? 2 : 1))}
                          {opponentAction === 'BOOST' && <SwordIcon className="inline-block text-red-300" size={12} />}
                          {opponentAction === 'DOUBLE' && <BoltIcon className="inline-block text-red-300" size={12} />}
                          {opponentAction === 'SHIELD' && <ShieldIcon className="inline-block text-red-300" size={12} />}
                        </div>
                      </div>
                    ) : opponentSelectedCard ? (
                      <img src="/images/card-back.png" alt="Hidden" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-red-400 text-2xl animate-pulse">?</span>
                    )}
                  </div>
                </div>

                {/* Guest's hand (small cards) */}
                <div className="grid grid-cols-5 gap-1">
                  {opponentHand.map((card, i) => (
                    <div key={i} className={`aspect-[2/3] rounded border ${opponentSelectedCard?.tokenId === card.tokenId ? 'border-2 border-yellow-400 ring-2 ring-yellow-400' : 'border border-red-500/30'} overflow-hidden bg-black/50`}>
                      {card.imageUrl || card.image ? (
                        <img src={card.imageUrl || card.image} alt={card.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${isInFarcaster ? 'text-[10px]' : 'text-[8px]'}`}>{Math.round(card.power || 0)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REGULAR GAME TABLE - POKER FELT DESIGN (for players) */}
        {phase !== 'deck-building' && phase !== 'game-over' && selectedAnte !== 0 && !isSpectator && (
          <div className="h-full flex flex-col">

            {/* Game info header */}
            <div className={`bg-vintage-charcoal border-2 border-vintage-gold rounded-t-2xl p-2 md:p-3 ${
              isInFarcaster
                ? 'flex flex-col gap-1.5 text-xs'
                : 'flex justify-between items-center text-sm md:text-base'
            }`}>
              <div className="flex items-center gap-3">
                <div className="text-vintage-gold font-display font-bold">
                  ROUND {currentRound}/7 • Score: {playerScore}-{opponentScore}
                </div>
                {(selectedAnte === 0 || isSpectator) && (
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/50 flex items-center gap-1 animate-pulse">
                    <EyeIcon className="inline-block text-blue-400" size={16} /> SPECTATOR
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
              <div className="relative h-full p-4 md:p-6 flex flex-col justify-between">

                {/* OPPONENT SECTION */}
                <div className="text-center">
                  <div className="text-vintage-gold font-display font-bold mb-4">
                    OPPONENT • {opponentBankroll} {selectedToken}
                  </div>

                  {/* Opponent's selected card (hidden until resolution) */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-32 aspect-[2/3] border-2 border-dashed border-vintage-gold rounded-lg flex flex-col items-center justify-center bg-vintage-deep-black/30 transition-all duration-500">
                      {opponentSelectedCard && phase === 'resolution' ? (
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
                              <div className="text-white text-2xl font-bold">{Math.round(opponentSelectedCard.power || 0).toLocaleString()}</div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold text-center">
                            {opponentSelectedCard.name}<br/>
                            <div className="flex items-center justify-center gap-1">
                              {Math.round((opponentSelectedCard.power || 0) * (
                                opponentAction === 'BOOST' ? 1.3 :
                                opponentAction === 'DOUBLE' ? 2 : 1
                              )).toLocaleString()}
                              {opponentAction === 'BOOST' && <SwordIcon className="inline-block text-vintage-gold" size={14} />}
                              {opponentAction === 'DOUBLE' && <BoltIcon className="inline-block text-vintage-gold" size={14} />}
                              {opponentAction === 'SHIELD' && <ShieldIcon className="inline-block text-vintage-gold" size={14} />}
                            </div>
                          </div>
                        </div>
                      ) : opponentSelectedCard ? (
                        <img
                          src="/images/card-back.png"
                          alt="Hidden Card"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-vintage-gold text-4xl animate-pulse">?</span>
                      )}
                    </div>
                    {opponentAction && opponentAction !== 'PASS' && phase === 'resolution' && (
                      <div className="mt-2 bg-red-900/50 border border-red-700 px-3 py-1 rounded animate-in slide-in-from-top duration-500">
                        <span className="text-red-300 text-sm font-bold flex items-center justify-center gap-1">
                          {opponentAction === 'BOOST' && <><SwordIcon className="inline-block text-red-300" size={16} /> Opponent used BOOST (+30%)</>}
                          {opponentAction === 'SHIELD' && <><ShieldIcon className="inline-block text-red-300" size={16} /> Opponent used SHIELD (Block Boost)</>}
                          {opponentAction === 'DOUBLE' && <><BoltIcon className="inline-block text-red-300" size={16} /> Opponent used CRITICAL (x2)</>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CENTER - POT & ACTIONS */}
                <div className="text-center">
                  <div className="inline-block bg-vintage-deep-black/50 border-2 border-vintage-gold px-4 sm:px-8 py-2 sm:py-4 rounded-full transition-all duration-500 hover:scale-105">
                    <div className="text-vintage-gold font-display font-bold text-xl sm:text-3xl">
                      💰 {pot} {selectedToken}
                    </div>
                  </div>

                  {/* Timer Display */}
                  {(phase === 'card-selection' || phase === 'reveal') && (
                    <div className="mt-2 sm:mt-3">
                      <div className={`inline-block px-3 sm:px-6 py-1 sm:py-2 rounded-lg border-2 transition-all ${
                        timeRemaining <= 5
                          ? 'bg-red-900/50 border-red-500 animate-pulse'
                          : timeRemaining <= 10
                          ? 'bg-yellow-900/50 border-yellow-500'
                          : 'bg-vintage-deep-black/50 border-vintage-gold'
                      }`}>
                        <div className={`font-display font-bold text-lg sm:text-2xl ${
                          timeRemaining <= 5
                            ? 'text-red-300'
                            : timeRemaining <= 10
                            ? 'text-yellow-300'
                            : 'text-vintage-gold'
                        }`}>
                          <ClockIcon className="inline-block" size={24} /> {timeRemaining}s
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phase indicator */}
                  <div className="mt-2 sm:mt-4">
                    <div className="inline-block bg-vintage-gold/20 border-2 border-vintage-gold px-3 sm:px-6 py-1 sm:py-2 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="text-vintage-gold font-display font-bold text-sm sm:text-lg">
                        {phase === 'card-selection' && !isCPUMode && playerSelectedCard && !opponentSelectedCard && (
                          <span className="animate-pulse">
                            {isInFarcaster ? '⏳ WAITING...' : '⏳ WAITING FOR OPPONENT TO SELECT CARD...'}
                          </span>
                        )}
                        {phase === 'card-selection' && (isCPUMode || !playerSelectedCard) && (
                          isInFarcaster ? '📋 SELECT CARD' : '📋 SELECT A CARD FROM YOUR HAND'
                        )}

                        {phase === 'reveal' && !isCPUMode && playerAction && !opponentAction && (
                          <span className="animate-pulse">
                            {isInFarcaster ? '⏳ WAITING...' : '⏳ WAITING FOR OPPONENT TO CHOOSE ACTION...'}
                          </span>
                        )}
                        {phase === 'reveal' && (isCPUMode || !playerAction) && (
                          <span className="flex items-center justify-center gap-2">
                            <SwordIcon className="inline-block text-vintage-gold" size={20} />
                            {isInFarcaster ? 'CHOOSE ACTION' : 'CHOOSE YOUR ACTION'}
                          </span>
                        )}

                        {phase === 'resolution' && (
                          <span className="animate-pulse">
                            {isInFarcaster ? '⏳ CALCULATING...' : '⏳ CALCULATING WINNER...'}
                          </span>
                        )}
                      </div>
                    </div>
                    {phase === 'resolution' && playerSelectedCard && opponentSelectedCard && (
                      <div className="mt-3 text-vintage-burnt-gold font-modern text-sm">
                        Your card: {playerSelectedCard.name} ({Math.round(playerSelectedCard.power || 0).toLocaleString()})
                        <br/>
                        vs Opponent: {opponentSelectedCard.name} ({Math.round(opponentSelectedCard.power || 0).toLocaleString()})
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
                        className={`${isInFarcaster ? 'w-16' : 'w-20 sm:w-24'} aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                          playerSelectedCard?.tokenId === card.tokenId
                            ? 'border-vintage-gold shadow-gold scale-110 -translate-y-2'
                            : 'border-vintage-gold/50 hover:border-vintage-gold hover:scale-105 hover:-translate-y-1'
                        } ${phase !== 'card-selection' || selectedAnte === 0 || isSpectator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                      >
                        <FoilCardEffect foilType={card.foil as 'Standard' | 'Prize' | null} className="w-full h-full">
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
                              <div className="text-white text-sm font-bold">{Math.round(card.power || 0).toLocaleString()}</div>
                            </div>
                          )}
                        </FoilCardEffect>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold transition-colors">
                          {Math.round(card.power || 0).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>


                  {phase === 'reveal' && !isSpectator && selectedAnte !== 0 && (
                    <div className="space-y-2 sm:space-y-4 animate-in fade-in slide-in-from-bottom duration-500 w-full max-w-md mx-auto">
                      <div className="text-center text-vintage-burnt-gold text-sm sm:text-lg md:text-xl font-bold mb-2 sm:mb-4">
                        💰 BOOST SHOP - {playerBankroll} {selectedToken}
                      </div>
                      {/* Mobile: 2x2 Grid, Desktop: 4 buttons in row */}
                      <div className="grid grid-cols-2 md:flex md:justify-center gap-2 sm:gap-4">
                        <button
                          onClick={() => showConfirmAction('BOOST')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('BOOST')}
                          className={`px-3 sm:px-8 md:px-10 py-2 sm:py-5 md:py-6 font-bold text-base sm:text-lg md:text-xl rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            playerBankroll >= getBoostPrice('BOOST') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <SwordIcon className={playerBankroll >= getBoostPrice('BOOST') && selectedAnte !== 0 && !isSpectator ? "text-black" : "text-gray-500"} size={48} />
                          <div className="text-xs sm:text-base md:text-lg font-bold">BOOST</div>
                          <span className="text-[10px] sm:text-sm">+30%</span>
                          <span className="text-[9px] sm:text-xs opacity-80">{getBoostPrice('BOOST')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('SHIELD')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('SHIELD')}
                          className={`px-3 sm:px-8 md:px-10 py-2 sm:py-5 md:py-6 font-bold text-base sm:text-lg md:text-xl rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            playerBankroll >= getBoostPrice('SHIELD') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <ShieldIcon className={playerBankroll >= getBoostPrice('SHIELD') && selectedAnte !== 0 && !isSpectator ? "text-white" : "text-gray-500"} size={48} />
                          <div className="text-xs sm:text-base md:text-lg font-bold">SHIELD</div>
                          <span className="text-[10px] sm:text-sm">Block</span>
                          <span className="text-[9px] sm:text-xs opacity-80">{getBoostPrice('SHIELD')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('DOUBLE')}
                          disabled={selectedAnte === 0 || isSpectator || playerBankroll < getBoostPrice('DOUBLE')}
                          className={`px-3 sm:px-8 md:px-10 py-2 sm:py-5 md:py-6 font-bold text-base sm:text-lg md:text-xl rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            playerBankroll >= getBoostPrice('DOUBLE') && selectedAnte !== 0 && !isSpectator
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <BoltIcon className={playerBankroll >= getBoostPrice('DOUBLE') && selectedAnte !== 0 && !isSpectator ? "text-white" : "text-gray-500"} size={48} />
                          <div className="text-xs sm:text-base md:text-lg font-bold">CRIT</div>
                          <span className="text-[10px] sm:text-sm">x2</span>
                          <span className="text-[9px] sm:text-xs opacity-80">{getBoostPrice('DOUBLE')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('PASS')}
                          disabled={selectedAnte === 0 || isSpectator}
                          className="px-3 sm:px-8 md:px-10 py-2 sm:py-5 md:py-6 bg-gray-600 text-white font-bold text-base sm:text-lg md:text-xl rounded-lg hover:bg-gray-700 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                        >
                          <HandIcon className={selectedAnte === 0 || isSpectator ? "text-gray-500" : "text-white"} size={48} />
                          <div className="text-xs sm:text-base md:text-lg font-bold">PASS</div>
                          <span className="text-[10px] sm:text-sm">Free</span>
                          <span className="text-[9px] sm:text-xs opacity-80">Save $</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

        {/* SPECTATOR GAME OVER */}
        {phase === 'game-over' && (selectedAnte === 0 || isSpectator) && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[400]">
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-6 sm:p-8 text-center shadow-2xl max-w-lg mx-4">
              {/* Winner Badge */}
              <div className="mb-6">
                {playerScore > opponentScore ? (
                  <div className="mb-2 animate-bounce flex justify-center"><TrophyIcon className="text-vintage-gold" size={80} /></div>
                ) : playerScore < opponentScore ? (
                  <div className="text-6xl sm:text-7xl mb-2 animate-bounce">👑</div>
                ) : (
                  <div className="text-6xl sm:text-7xl mb-2">🤝</div>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl font-display font-bold text-vintage-gold mb-4">
                GAME OVER
              </h2>

              {/* Score Display */}
              <div className="bg-vintage-deep-black/50 rounded-xl p-4 sm:p-6 mb-4 border-2 border-vintage-gold/30">
                <p className="text-lg sm:text-xl text-vintage-burnt-gold mb-3">Final Score</p>
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-vintage-gold/60 mb-1">HOST</p>
                    <p className={`text-4xl sm:text-5xl font-bold ${playerScore > opponentScore ? 'text-green-400' : playerScore < opponentScore ? 'text-red-400' : 'text-vintage-gold'}`}>
                      {playerScore}
                    </p>
                  </div>
                  <span className="text-2xl text-vintage-gold">-</span>
                  <div className="text-center">
                    <p className="text-xs text-vintage-gold/60 mb-1">GUEST</p>
                    <p className={`text-4xl sm:text-5xl font-bold ${opponentScore > playerScore ? 'text-green-400' : opponentScore < playerScore ? 'text-red-400' : 'text-vintage-gold'}`}>
                      {opponentScore}
                    </p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-vintage-gold">
                  {playerScore > opponentScore ? "🎉 Host Wins!" : playerScore < opponentScore ? "🎉 Guest Wins!" : "🤝 It's a Tie!"}
                </p>
              </div>

              {/* Game Stats */}
              {selectedAnte > 0 && (
                <div className="bg-vintage-gold/10 rounded-lg p-3 sm:p-4 mb-6 border border-vintage-gold/30">
                  <p className="text-sm text-vintage-gold/80 mb-2">Game Info</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-vintage-gold/60">Ante</p>
                      <p className="text-vintage-gold font-bold">{selectedAnte} {selectedToken}</p>
                    </div>
                    <div>
                      <p className="text-vintage-gold/60">Total Pot</p>
                      <p className="text-vintage-gold font-bold">{playerBankroll + opponentBankroll} {selectedToken}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold text-lg sm:text-xl rounded-lg hover:bg-vintage-burnt-gold transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* VICTORY POPUP */}
        {phase === 'game-over' && selectedAnte !== 0 && !isSpectator && playerScore > opponentScore && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={onClose}>
            <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {/* Victory Image */}
              <img
                src="/victory-1.jpg"
                alt="Victory!"
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-yellow-500/50 border-4 border-yellow-400"
              />

              {/* Victory Text */}
              <p className="text-2xl md:text-3xl font-bold text-yellow-400 animate-pulse px-4 text-center">
                🎉 You Won! Score: {playerScore} - {opponentScore}
              </p>
              <p className="text-xl md:text-2xl font-bold text-green-400 px-4 text-center">
                Profit: +{playerBankroll - (selectedAnte * 50)} {selectedToken}
              </p>

              {/* SHARE BUTTONS */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const matchId = `win|${playerScore}|${opponentScore}|${encodeURIComponent(playerUsername)}|${encodeURIComponent('Opponent')}|${selectedAnte}|${selectedToken}`;
                    const shareUrl = `${window.location.origin}/share/poker/${matchId}?v=${Date.now()}`;

                    const tweetText = selectedToken === 'VIBE_NFT'
                      ? `Just won a Poker Battle ${playerScore}-${opponentScore} and took 3 NFT cards! 🎴\n\nStakes: ${selectedAnte} coins + NFTs\n(For fun only - no blockchain)`
                      : `Just won a Poker Battle ${playerScore}-${opponentScore}!\n\nStakes: ${selectedAnte} ${selectedToken}\nProfit: +${playerBankroll - (selectedAnte * 50)} ${selectedToken}`;

                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
                    window.open(twitterUrl, '_blank');
                  }}
                  className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>𝕏</span> Share Victory
                </button>
                <button
                  onClick={() => {
                    const matchId = `win|${playerScore}|${opponentScore}|${encodeURIComponent(playerUsername)}|${encodeURIComponent('Opponent')}|${selectedAnte}|${selectedToken}`;
                    const shareUrl = `${window.location.origin}/share/poker/${matchId}?v=${Date.now()}`;

                    const castText = selectedToken === 'VIBE_NFT'
                      ? `Just won a Poker Battle ${playerScore}-${opponentScore} and took 3 NFT cards! 🎴\n\nStakes: ${selectedAnte} coins + NFTs\n(For fun only)`
                      : `Just won a Poker Battle ${playerScore}-${opponentScore}!\n\nStakes: ${selectedAnte} ${selectedToken}\nProfit: +${playerBankroll - (selectedAnte * 50)} ${selectedToken}`;

                    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                    window.open(farcasterUrl, '_blank');
                  }}
                  className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>♦</span> Farcaster
                </button>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-gold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* DEFEAT POPUP */}
        {phase === 'game-over' && selectedAnte !== 0 && !isSpectator && playerScore < opponentScore && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={onClose}>
            <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {/* Defeat Image */}
              <img
                src="https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26"
                alt="You Lost"
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-red-500/50 border-4 border-red-500"
              />

              {/* Defeat Text */}
              <p className="text-2xl md:text-3xl font-bold text-red-400 animate-pulse px-4 text-center flex items-center justify-center gap-2">
                <SkullIcon className="text-red-400" size={32} /> You Lost! Score: {playerScore} - {opponentScore}
              </p>
              <p className="text-xl md:text-2xl font-bold text-red-300 px-4 text-center">
                Loss: {playerBankroll - (selectedAnte * 50)} {selectedToken}
              </p>

              {/* SHARE BUTTONS */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const matchId = `loss|${playerScore}|${opponentScore}|${encodeURIComponent(playerUsername)}|${encodeURIComponent('Opponent')}|${selectedAnte}|${selectedToken}`;
                    const shareUrl = `${window.location.origin}/share/poker/${matchId}?v=${Date.now()}`;

                    const tweetText = `Lost a Poker Battle ${playerScore}-${opponentScore}\n\nStakes: ${selectedAnte} ${selectedToken}\nI want a rematch!`;

                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
                    window.open(twitterUrl, '_blank');
                  }}
                  className="px-6 py-3 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-display font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>𝕏</span> Share Defeat
                </button>
                <button
                  onClick={() => {
                    const matchId = `loss|${playerScore}|${opponentScore}|${encodeURIComponent(playerUsername)}|${encodeURIComponent('Opponent')}|${selectedAnte}|${selectedToken}`;
                    const shareUrl = `${window.location.origin}/share/poker/${matchId}?v=${Date.now()}`;

                    const castText = `Lost a Poker Battle ${playerScore}-${opponentScore}\n\nStakes: ${selectedAnte} ${selectedToken}\nRevenge time!`;

                    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                    window.open(farcasterUrl, '_blank');
                  }}
                  className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>♦</span> Farcaster
                </button>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
              >
                ×
              </button>
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

        {/* ROUND WINNER ANNOUNCEMENT - Semi-transparent overlay positioned at top */}
        {showRoundWinner && roundWinner && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-start justify-center pt-12 z-[240] animate-in fade-in duration-300 pointer-events-none">
            <div className={`bg-gradient-to-b rounded-2xl border-4 p-6 text-center shadow-2xl animate-in slide-in-from-top duration-500 ${
              roundWinner === 'player'
                ? 'from-green-900/95 to-green-950/95 border-green-500'
                : 'from-red-900/95 to-red-950/95 border-red-500'
            }`}>
              <div className="mb-3 animate-bounce flex justify-center">
                {roundWinner === 'player' ? <TrophyIcon className="text-vintage-gold" size={64} /> : <SkullIcon className="text-red-400" size={64} />}
              </div>
              <h2 className={`text-3xl font-display font-bold mb-1 ${
                roundWinner === 'player' ? 'text-green-400' : 'text-red-400'
              }`}>
                {roundWinner === 'player' ? 'YOU WIN!' : 'YOU LOSE!'}
              </h2>
              <p className="text-vintage-gold text-lg">
                Round {currentRound}
              </p>
            </div>
          </div>
        )}

        {/* ACTION CONFIRMATION DIALOG */}
        {showActionConfirm && pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[250] animate-in fade-in duration-300">
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-6 text-center shadow-2xl max-w-md mx-4">
              <h3 className="text-2xl font-display font-bold text-vintage-gold mb-4">
                Confirm Action
              </h3>
              <div className="mb-6">
                <div className={`inline-block px-6 py-4 rounded-xl mb-4 ${
                  pendingAction === 'BOOST' ? 'bg-yellow-500/20 border-2 border-yellow-500' :
                  pendingAction === 'SHIELD' ? 'bg-blue-500/20 border-2 border-blue-500' :
                  pendingAction === 'DOUBLE' ? 'bg-red-500/20 border-2 border-red-500' :
                  'bg-gray-500/20 border-2 border-gray-500'
                }`}>
                  <div className="mb-2 flex justify-center">
                    {pendingAction === 'BOOST' && <SwordIcon className="text-yellow-300" size={48} />}
                    {pendingAction === 'SHIELD' && <ShieldIcon className="text-blue-300" size={48} />}
                    {pendingAction === 'DOUBLE' && <BoltIcon className="text-red-300" size={48} />}
                    {pendingAction === 'PASS' && <HandIcon className="text-gray-300" size={48} />}
                  </div>
                  <div className={`font-bold text-xl ${
                    pendingAction === 'BOOST' ? 'text-yellow-300' :
                    pendingAction === 'SHIELD' ? 'text-blue-300' :
                    pendingAction === 'DOUBLE' ? 'text-red-300' :
                    'text-gray-300'
                  }`}>
                    {pendingAction === 'BOOST' && 'BOOST (+30%)'}
                    {pendingAction === 'SHIELD' && 'SHIELD (Block)'}
                    {pendingAction === 'DOUBLE' && 'CRITICAL (x2)'}
                    {pendingAction === 'PASS' && 'PASS'}
                  </div>
                </div>
                <p className="text-vintage-burnt-gold text-lg mb-2">
                  {pendingAction === 'PASS' ? (
                    'Save your coins and continue?'
                  ) : (
                    <>Cost: <span className="text-vintage-gold font-bold">{getBoostPrice(pendingAction)} {selectedToken}</span></>
                  )}
                </p>
                <p className="text-vintage-gold/70 text-sm">
                  Remaining: {playerBankroll - getBoostPrice(pendingAction)} {selectedToken}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelAction}
                  className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-6 py-3 font-bold rounded-lg transition-all hover:scale-105 active:scale-95 ${
                    pendingAction === 'BOOST' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black' :
                    pendingAction === 'SHIELD' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' :
                    pendingAction === 'DOUBLE' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                    'bg-vintage-gold text-vintage-black'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHAT SYSTEM - Only show in PvP mode, not in CPU mode or spectator */}
        {!isCPUMode && currentView === 'game' && roomId && !isSpectator && (
          <>
            {/* Chat Toggle Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`fixed ${isInFarcaster ? 'bottom-4 right-4' : 'bottom-6 right-6'} z-[300] ${
                isChatOpen ? 'bg-vintage-gold' : 'bg-vintage-gold/80'
              } hover:bg-vintage-gold text-vintage-black rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-lg sm:text-xl shadow-2xl transition-all hover:scale-110 active:scale-95`}
              title="Toggle Chat"
            >
              {isChatOpen ? <CloseIcon className="text-vintage-black" size={24} /> : <ChatIcon className="text-vintage-black" size={24} />}
            </button>

            {/* Chat Panel */}
            {isChatOpen && (
              <div className={`fixed ${isInFarcaster ? 'bottom-20 right-2 left-2' : 'bottom-24 right-6'} z-[250] bg-vintage-charcoal border-2 border-vintage-gold rounded-xl shadow-2xl ${
                isInFarcaster ? 'h-[250px]' : 'w-80 h-96'
              } flex flex-col`}>
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold p-2 rounded-t-lg">
                  <h3 className="font-display font-bold text-vintage-black text-center text-sm sm:text-base flex items-center justify-center gap-2">
                    <ChatIcon className="text-vintage-black" size={18} /> Match Chat
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 bg-vintage-deep-black/50">
                  {messages && messages.length > 0 ? (
                    messages.map((msg, idx) => {
                      const isOwnMessage = msg.sender.toLowerCase() === playerAddress.toLowerCase();
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-xs text-vintage-gold/70 px-1">
                            {isOwnMessage ? 'You' : msg.senderUsername}
                          </span>
                          <div
                            className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                              isOwnMessage
                                ? 'bg-vintage-gold text-vintage-black'
                                : 'bg-vintage-charcoal/80 text-vintage-gold border border-vintage-gold/30'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-vintage-gold/50 text-sm mt-8">
                      No messages yet. Say hi! 👋
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-2 border-t border-vintage-gold/30 bg-vintage-charcoal">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder="Type a message..."
                      maxLength={500}
                      className="flex-1 bg-vintage-deep-black border border-vintage-gold/50 rounded-lg px-3 py-2 text-vintage-gold placeholder-vintage-gold/40 text-sm focus:outline-none focus:border-vintage-gold"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="bg-vintage-gold hover:bg-vintage-burnt-gold disabled:bg-vintage-gold/30 disabled:cursor-not-allowed text-vintage-black px-3 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    >
                      ▶
                    </button>
                  </div>
                  <p className="text-xs text-vintage-gold/40 mt-1 text-right">
                    {chatInput.length}/500
                  </p>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
