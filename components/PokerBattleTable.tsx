"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { AudioManager } from '@/lib/audio-manager';
import { PokerMatchmaking } from './PokerMatchmaking';
import { PokerWaitingRoom } from './PokerWaitingRoom';
import FoilCardEffect from './FoilCardEffect';
import { CardMedia } from './CardMedia';
import { SwordIcon, ShieldIcon, BoltIcon, HandIcon, TrophyIcon, SkullIcon, ChatIcon, EyeIcon, ClockIcon, CloseIcon } from './PokerIcons';
import { useGroupVoiceChat } from '@/lib/hooks/useGroupVoiceChat';
import { VoiceChannelPanel } from './VoiceChannelPanel';
import { useFinishVBMSBattle, useClaimVBMS } from '@/lib/hooks/useVBMSContracts';
import { SpectatorEntryModal } from './SpectatorEntryModal';
import { SimpleBettingOverlay } from './SimpleBettingOverlay';
import { SpectatorBetFeedback } from './SpectatorBetFeedback';
import { GamePopups } from './GamePopups';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import { NotEnoughCardsGuide } from './NotEnoughCardsGuide';
import { useLanguage } from '@/contexts/LanguageContext';

// Collection cover images for Mecha Arena (sealed/unrevealed card backs)
const COLLECTION_COVERS: Record<string, string> = {
  vibefid: '/covers/vibefid-cover.png',
  gmvbrs: 'https://nft-cdn.alchemy.com/base-mainnet/d0de7e9fa12eadb1ea2204e67d43e166',
  vibe: 'https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f',
  viberuto: 'https://nft-cdn.alchemy.com/base-mainnet/ec58759f6df558aa4193d58ae9b0e74f',
  meowverse: 'https://nft-cdn.alchemy.com/base-mainnet/16a8f93f75def1a771cca7e417b5d05e',
  poorlydrawnpepes: 'https://nft-cdn.alchemy.com/base-mainnet/96282462557a81c42fad965a48c34f4c',
  teampothead: 'https://nft-cdn.alchemy.com/base-mainnet/ae56485394d1e5f37322d498f0ea11a0',
  tarot: 'https://nft-cdn.alchemy.com/base-mainnet/72ea458dbad1ce6a722306d811a42252',
  baseballcabal: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F45e455d7-cd23-459b-7ea9-db14c6d36000%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  vibefx: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F5e6058d2-4c64-4cd9-ab57-66a939fec900%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  historyofcomputer: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2Fa1a0d189-44e1-43e3-60dc-e8b053ec0c00%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  cumioh: '/covers/cumioh-cover.png',
  viberotbangers: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fnft-cdn.alchemy.com%2Fbase-mainnet%2F1269ebe2e27ff8a041cb7253fb5687b6',
};

// Get card cover image for a collection (fallback to default card-back)
function getCardBack(collection?: string): string {
  if (collection && COLLECTION_COVERS[collection]) {
    return COLLECTION_COVERS[collection];
  }
  return '/images/card-back.png';
}

// Format collection name for display (e.g., "baseballcabal" → "Baseball Cabal")
const COLLECTION_DISPLAY_NAMES: Record<string, string> = {
  gmvbrs: 'GMVBRS',
  vibe: 'Vibe',
  viberuto: 'Viberuto',
  meowverse: 'Meowverse',
  poorlydrawnpepes: 'Poorly Drawn Pepes',
  teampothead: 'Team Pothead',
  tarot: 'Tarot',
  vibefid: 'VibeFID',
  baseballcabal: 'Baseball Cabal',
  vibefx: 'VibeFX',
  historyofcomputer: 'History of Computer',
  cumioh: '$CU-MI-OH!',
};

function getCollectionDisplayName(collection?: string): string {
  if (!collection) return 'Mecha Arena';
  return COLLECTION_DISPLAY_NAMES[collection] || collection.charAt(0).toUpperCase() + collection.slice(1);
}

interface Card {
  tokenId: string;
  collection?: string; // NFT collection
  name?: string; // Optional for NFTs
  image?: string;
  imageUrl?: string; // NFTs use imageUrl
  power?: number; // Optional for NFTs (some may not have power calculated yet)
  rarity?: string; // Optional for NFTs
  foil?: string; // Optional for NFTs
  wear?: string; // Optional for NFTs
}

// Helper to get buffed power for display (VibeFID 5x, VBMS 2x, Nothing 0.5x)
const getDisplayPower = (card: Card | null | undefined): number => {
  if (!card) return 0;
  const base = card.power || 0;
  if (card.collection === 'vibefid') return Math.floor(base * 5);
  if (card.collection === 'vibe') return Math.floor(base * 2);
  if (card.collection === 'nothing') return Math.floor(base * 0.5);
  return base;
};

interface PokerBattleTableProps {
  onClose: () => void;
  playerCards: Card[]; // Player's full collection
  isCPUMode?: boolean; // If true, auto-select deck and start immediately
  opponentDeck?: Card[]; // Opponent's deck (for CPU mode)
  difficulty?: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'; // CPU difficulty
  playerAddress?: string; // For multiplayer matchmaking
  playerUsername?: string; // For multiplayer matchmaking
  isSpectator?: boolean; // If true, view-only mode (no interactions)
  isInFarcaster?: boolean; // If true, optimize UI for Farcaster miniapp
  soundEnabled?: boolean; // Sound effects enabled
  initialRoomId?: string; // For spectator mode - skip matchmaking and go directly to game
  skipSpectatorModal?: boolean; // Skip spectator entry modal (e.g., when already deposited via CPU Arena)
}

type GamePhase = 'deck-building' | 'card-selection' | 'reveal' | 'card-reveal-animation' | 'resolution' | 'game-over';
type CardAction = 'BOOST' | 'SHIELD' | 'DOUBLE' | 'SWAP' | 'PASS';
type ViewMode = 'matchmaking' | 'waiting' | 'game';

// Victory configurations - each victory has matched image/video + audio
const VICTORY_CONFIGS = [
  { image: '/victory-1.jpg', audio: '/victory-sound.mp3', isVideo: false }, // Normal victory (Gigachad)
  { image: '/victory-2.jpg', audio: '/marvin-victory.mp3', isVideo: false }, // Overwhelming victory (Gay vibes)
  { image: '/victory-3.jpg', audio: null, isVideo: false }, // Epic victory (Golden coins + lightning - audio plays automatically via component)
  { image: '/bom.jpg', audio: '/victory-sound.mp3', isVideo: false }, // Bom victory
];

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
  initialRoomId = '',
  skipSpectatorModal = false,
}: PokerBattleTableProps) {
  // Convex client for imperative queries
  const convex = useConvex();

  // Translations
  const { t } = useLanguage();

  // View Mode state - go directly to game if initialRoomId provided (spectator mode)
  const [currentView, setCurrentView] = useState<ViewMode>(
    isCPUMode ? 'game' : (initialRoomId ? 'game' : 'matchmaking')
  );
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isHost, setIsHost] = useState(false);
  const [selectedAnte, setSelectedAnte] = useState(initialRoomId ? 0 : 25); // No ante for spectators
  const [isSpectatorMode, setIsSpectatorMode] = useState(isSpectator || !!initialRoomId);
  const [selectedToken, setSelectedToken] = useState<'VBMS' | 'TESTVBMS' | 'VIBE_NFT'>('VBMS');

  // Betting system state
  const [showSpectatorEntryModal, setShowSpectatorEntryModal] = useState(false);
  const [spectatorType, setSpectatorType] = useState<'free' | 'betting' | null>(
    skipSpectatorModal ? 'betting' : null
  ); // Set to betting if skipping modal
  const [hasBettingCredits, setHasBettingCredits] = useState(skipSpectatorModal); // Already has credits if skipping modal

  // Real-time room data for multiplayer (includes CPU vs CPU spectator mode)
  const room = useQuery(
    api.pokerBattle.getPokerRoom,
    currentView === 'game' && !isCPUMode && roomId ? { roomId } : "skip"
  );

  // Mutations for game actions
  const initializeGameMutation = useMutation(api.pokerBattle.initializeGame);
  const selectCardMutation = useMutation(api.pokerBattle.selectCard);
  const useCardActionMutation = useMutation(api.pokerBattle.useCardAction);
  const resolveRoundMutation = useMutation(api.pokerBattle.resolveRound);
  const finishGameMutation = useMutation(api.pokerBattle.finishGame);
  const recordMatchMutation = useMutation(api.matches.recordMatch);

  // PvE and PvP claim mutations - using secure sendToInbox that validates matchId
  const sendToInbox = useMutation(api.vbmsClaim.sendToInbox);

  // VBMS Battle finalization hook
  const { finishBattle: finishVBMSBattle, isPending: isFinishingVBMS, isSuccess: vbmsFinished } = useFinishVBMSBattle();

  // VBMS Claim hook (for PvE rewards)
  const { claimVBMS, isPending: isClaimingVBMS } = useClaimVBMS();

  // Betting mutations
  const resolveBetsMutation = useMutation(api.bettingCredits.resolveBets);

  // Round betting mutations (instant payouts on each round)
  const resolveRoundBetsMutation = useMutation(api.roundBetting.resolveRoundBets);
  const convertCreditsMutation = useMutation(api.roundBetting.convertCreditsToCoins);
  const leaveSpectateMutation = useMutation(api.pokerBattle.leaveSpectate);

  // Get betting credits balance for spectator exit confirmation
  const bettingCreditsData = useQuery(
    api.bettingCredits.getBettingCredits,
    isSpectatorMode && playerAddress ? { address: playerAddress } : "skip"
  );

  // State for exit confirmation modal
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Chat system
  const messages = useQuery(
    api.pokerChat.getMessages,
    roomId && !isCPUMode ? { roomId } : "skip"
  );
  const sendMessageMutation = useMutation(api.pokerChat.sendMessage);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState<Array<{id: number, sender: string, message: string, isOwnMessage: boolean}>>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{id: number, emoji: string, x: number, y: number}>>([]);
  const currentMemeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Meme sound sync function
  const playMemeSound = async (soundUrl: string, soundName: string, emoji: string) => {
    // In CPU mode, play locally immediately
    if (isCPUMode || !roomId) {
      console.log('[PokerBattle] Playing meme sound locally (CPU mode):', soundName, soundUrl);

      // Stop any currently playing meme sound
      if (currentMemeAudioRef.current) {
        currentMemeAudioRef.current.pause();
        currentMemeAudioRef.current.currentTime = 0;
      }

      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      currentMemeAudioRef.current = audio;
      audio.play().catch((err) => {
        console.error('[PokerBattle] Failed to play audio:', err);
      });

      // Show floating emoji
      if (emoji) {
        const newEmoji = {
          id: Date.now(),
          emoji: emoji,
          x: Math.random() * 60 + 20,
          y: Math.random() * 40 + 30,
        };
        setFloatingEmojis(prev => [...prev, newEmoji]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
        }, 2000);
      }
      return;
    }

    // In PvP mode, broadcast to Convex so the useEffect picks it up for everyone
    try {
      await sendMessageMutation({
        roomId,
        sender: playerAddress,
        senderUsername: playerUsername,
        message: soundName,
        type: "sound",
        soundUrl: soundUrl,
        emoji: emoji,
      });
      console.log('[PokerBattle] Sound meme broadcasted:', soundName, soundUrl);
    } catch (error) {
      console.error('[PokerBattle] Failed to broadcast sound:', error);
    }
  };

  // Show floating messages for new chat messages and play sound memes
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage.sender.toLowerCase() === playerAddress.toLowerCase();

    // If it's a sound message, play it for EVERYONE (both sender and receiver)
    if (lastMessage.type === 'sound' && lastMessage.soundUrl) {
      console.log('[PokerBattle] Playing synced meme sound:', lastMessage.message, lastMessage.soundUrl);

      // Stop any currently playing meme sound (prevents overlapping)
      if (currentMemeAudioRef.current) {
        currentMemeAudioRef.current.pause();
        currentMemeAudioRef.current.currentTime = 0;
      }

      const audio = new Audio(lastMessage.soundUrl);
      audio.volume = 0.7;
      currentMemeAudioRef.current = audio; // Store reference
      audio.play().catch((err) => {
        console.error('[PokerBattle] Failed to play audio:', err);
      });

      // Show floating emoji for EVERYONE (both sender and receiver)
      if (lastMessage.emoji) {
        const newEmoji = {
          id: Date.now(),
          emoji: lastMessage.emoji,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
        };
        setFloatingEmojis(prev => [...prev, newEmoji]);

        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
        }, 3000);
      }
    }

    // Add to floating messages (only for text messages)
    if (!lastMessage.type || lastMessage.type === 'text') {
      const newFloating = {
        id: Date.now(),
        sender: isOwnMessage ? 'You' : lastMessage.senderUsername,
        message: lastMessage.message,
        isOwnMessage
      };

      setFloatingMessages(prev => [...prev, newFloating]);

      // Remove after 5 seconds
      setTimeout(() => {
        setFloatingMessages(prev => prev.filter(m => m.id !== newFloating.id));
      }, 5000);
    }
  }, [messages, playerAddress]);

  // Get player profiles for avatars
  const hostProfile = useQuery(
    api.profiles.getProfile,
    room?.hostAddress ? { address: room.hostAddress } : "skip"
  );
  const guestProfile = useQuery(
    api.profiles.getProfile,
    room?.guestAddress ? { address: room.guestAddress } : "skip"
  );

  // Group voice chat (PvP and Mecha Arena spectators)
  const groupVoice = useGroupVoiceChat(
    roomId || null,
    playerAddress,
    playerUsername
  );

  // Join voice channel handler
  const handleJoinVoice = () => {
    if (!room) return;

    const participants: Array<{ address: string; username: string }> = [];

    // In CPU mode, only add spectators (not CPU players)
    if (!isCPUMode) {
      // Add host and guest in PvP mode
      participants.push({ address: room.hostAddress, username: room.hostUsername });
      if (room.guestAddress && room.guestUsername) {
        participants.push({ address: room.guestAddress, username: room.guestUsername });
      }
    }

    // Add spectators (both PvP and Mecha Arena)
    if (room.spectators) {
      room.spectators.forEach((spec: any) => {
        participants.push({ address: spec.address, username: spec.username });
      });
    }

    // Filter out CPUs/Mechas - they should never be in voice
    const realParticipants = participants.filter(p => {
      const addr = p.address.toLowerCase();
      const name = p.username.toLowerCase();
      return !addr.startsWith('cpu_') && !addr.startsWith('mecha_') &&
             !name.startsWith('mecha ') && !name.startsWith('cpu ');
    });

    groupVoice.joinChannel(realParticipants);
  };

  // Incoming voice call notification ("John Pork is calling")
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallDismissed, setIncomingCallDismissed] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState<{ username: string; address: string } | null>(null);
  const incomingCallAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sounds panel visibility
  const [showSoundsPanel, setShowSoundsPanel] = useState(true);

  // Subscribe to voice participants for incoming call notifications
  const voiceParticipants = useQuery(
    api.voiceChat.getVoiceParticipants,
    roomId ? { roomId } : "skip"
  );

  // Get caller's profile for their pfp
  const callerProfile = useQuery(
    api.notifications.getProfileByAddress,
    incomingCaller?.address ? { address: incomingCaller.address } : "skip"
  );

  // Track previous voice participants count for detecting new joins
  const prevVoiceParticipantsRef = useRef<number>(0);

  // Detect when someone joins voice (show "John Pork is calling")
  useEffect(() => {
    if (!voiceParticipants || groupVoice.isInChannel || incomingCallDismissed) return;

    // Filter out CPUs/Mechas from voice participants
    const realParticipants = voiceParticipants.filter((p: { address: string; username: string }) => {
      const addr = p.address.toLowerCase();
      const name = p.username.toLowerCase();
      return !addr.startsWith('cpu_') && !addr.startsWith('mecha_') &&
             !name.startsWith('mecha ') && !name.startsWith('cpu ');
    });

    const currentCount = realParticipants.length;
    const prevCount = prevVoiceParticipantsRef.current;

    // If new participant joined and we're not in voice
    if (currentCount > prevCount && currentCount > 0) {
      // Find the caller (most recent joiner who isn't us)
      const caller = realParticipants
        .filter((p: { address: string; username: string; joinedAt: number }) => p.address.toLowerCase() !== playerAddress.toLowerCase())
        .sort((a: { joinedAt: number }, b: { joinedAt: number }) => b.joinedAt - a.joinedAt)[0];

      if (caller) {
        console.log('[PokerBattle] 📞 Incoming voice call from:', caller.username);
        setIncomingCaller({ username: caller.username, address: caller.address });
        setShowIncomingCall(true);

        // Play ringtone
        if (!incomingCallAudioRef.current) {
          const audio = new Audio('/john-pork-is-calling_JdVKLhF (1).mp3');
          audio.loop = true;
          audio.volume = 0.7;
          audio.play().catch(err => console.error('[PokerBattle] Failed to play ringtone:', err));
          incomingCallAudioRef.current = audio;
        }
      }
    }

    prevVoiceParticipantsRef.current = currentCount;
  }, [voiceParticipants, groupVoice.isInChannel, incomingCallDismissed, playerAddress]);

  // Stop ringtone when user joins voice or dismisses call
  useEffect(() => {
    if (groupVoice.isInChannel || !showIncomingCall) {
      if (incomingCallAudioRef.current) {
        incomingCallAudioRef.current.pause();
        incomingCallAudioRef.current = null;
      }
    }
  }, [groupVoice.isInChannel, showIncomingCall]);

  // Handle accepting incoming call
  const handleAcceptCall = () => {
    setShowIncomingCall(false);
    handleJoinVoice();
  };

  // Handle rejecting incoming call
  const handleRejectCall = () => {
    setShowIncomingCall(false);
    setIncomingCallDismissed(true); // Don't show again for this session
    if (incomingCallAudioRef.current) {
      incomingCallAudioRef.current.pause();
      incomingCallAudioRef.current = null;
    }
  };

  // Game state
  const [phase, setPhase] = useState<GamePhase>('deck-building');
  const [currentRound, setCurrentRound] = useState(1);
  const [pot, setPot] = useState(0);
  const [battleFinalized, setBattleFinalized] = useState(false);
  const [roomFinished, setRoomFinished] = useState(false);

  // Reset roomFinished and roomDeletionRef when roomId changes (new room/battle)
  useEffect(() => {
    setRoomFinished(false);
    roomDeletionRef.current = false;
  }, [roomId]);

  // Game-over screen control - prevents multiple screens from overlapping
  const [gameOverShown, setGameOverShown] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<Id<"matches"> | null>(null);

  // Prevent multiple match recordings (useRef persists across renders)
  const matchRecordedRef = useRef(false);

  // Prevent multiple room deletions (useRef persists across renders)
  const roomDeletionRef = useRef(false);

  // GamePopups control states
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [showLossPopup, setShowLossPopup] = useState(false);
  const [showTiePopup, setShowTiePopup] = useState(false);
  const [currentVictoryImage, setCurrentVictoryImage] = useState('/victory-1.jpg');
  const [lastBattleResult, setLastBattleResult] = useState<{
    coinsEarned?: number;
    type?: string;
    playerPower?: number;
    opponentPower?: number;
    opponentName?: string;
    opponentTwitter?: string;
  } | null>(null);

  // Spectator betting results (Mecha Arena)
  const [showSpectatorResult, setShowSpectatorResult] = useState(false);
  const [spectatorNetGains, setSpectatorNetGains] = useState(0);

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
        guestAction,
        localPhase: phase
      });

      // SYNC phase from server to prevent desync issues
      if (serverPhase && serverPhase !== phase && phase !== 'card-reveal-animation') {
        console.log(`[PokerBattle] Syncing phase from server: ${phase} -> ${serverPhase}`);
        setPhase(serverPhase as GamePhase);
      }

      // If server is in reveal/resolution phase and both have acted, reveal cards first
      if (serverPhase === 'reveal' || serverPhase === 'resolution') {
        if (hostSelectedCard && guestSelectedCard && hostAction && guestAction) {
          console.log('[PokerBattle] Both players ready - revealing cards first');

          // Sync server state to local BEFORE resolving (for Round 2+)
          const myCard = isHost ? hostSelectedCard : guestSelectedCard;
          const opCard = isHost ? guestSelectedCard : hostSelectedCard;
          const myAct = (isHost ? hostAction : guestAction) as CardAction;
          const opAct = (isHost ? guestAction : hostAction) as CardAction;

          console.log('[PokerBattle] Syncing from server', {
            hasLocalPlayerCard: !!playerSelectedCard,
            hasLocalOpponentCard: !!opponentSelectedCard,
            serverPlayerCard: myCard,
            serverOpponentCard: opCard
          });

          // Always sync from server to ensure we have the latest
          if (!playerSelectedCard) {
            setPlayerSelectedCard(myCard);
          }
          if (!opponentSelectedCard) {
            setOpponentSelectedCard(opCard);
          }
          if (!playerAction) {
            setPlayerAction(myAct);
          }
          if (!opponentAction) {
            setOpponentAction(opAct);
          }

          // Move to card reveal animation if not already there or in resolution
          if (phase !== 'card-reveal-animation' && phase !== 'resolution' && phase !== 'game-over') {
            console.log('[PokerBattle] Moving to card-reveal-animation phase');
            setPhase('card-reveal-animation');

            // Enhanced sound for spectators
            if (isSpectator) {
              AudioManager.cardBattle(); // Dramatic reveal sound
            } else {
              AudioManager.buttonSuccess();
            }

            // Dramatic pause before resolving (2.5 seconds)
            setTimeout(() => {
              console.log('[PokerBattle] Cards revealed! Calling resolveRound from room sync');
              resolveRound();
            }, 2500);
          }
        }
      }
    }
  }, [room, isCPUMode]);

  // Reset timer when phase changes (separate effect to ensure it runs)
  // Skip in CPU mode - betting window timer handles it there
  useEffect(() => {
    if (isCPUMode) return; // CPU mode uses bettingWindowEndsAt timer instead

    if (phase === 'card-selection') {
      console.log('[PokerBattle] Timer reset to 30s for card-selection phase');
      setTimeRemaining(30);
    } else if (phase === 'reveal') {
      console.log('[PokerBattle] Timer reset to 90s for reveal phase');
      setTimeRemaining(90); // More time for choosing boost action (increased to 90s for testing)
    }
  }, [phase, isCPUMode]); // Only depend on phase and isCPUMode

  // CPU vs CPU betting window timer (for Mecha Arena spectators)
  useEffect(() => {
    if (!isCPUMode) return;

    // If no betting window, reset timer to 0 (waiting for CPUs to select)
    if (!room?.gameState?.bettingWindowEndsAt) {
      setTimeRemaining(0);
      return;
    }

    // Capture value to preserve type narrowing inside callback
    const bettingWindowEndsAt = room.gameState.bettingWindowEndsAt;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((bettingWindowEndsAt - now) / 1000));
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isCPUMode, room?.gameState?.bettingWindowEndsAt]);

  // Timer countdown for actions
  useEffect(() => {
    // Skip timer if in CPU vs CPU mode (betting window timer handles it)
    if (isCPUMode) return;

    // Clear any existing timer when effect runs
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only run timer during active phases
    if (phase !== 'card-selection' && phase !== 'reveal') {
      return;
    }

    // Don't count down if player has already acted
    if (phase === 'card-selection' && playerSelectedCard) return;
    if (phase === 'reveal' && playerAction) return;

    console.log(`[PokerBattle] Starting timer countdown for phase: ${phase}, initial time: ${timeRemaining}s`);

    timerRef.current = setInterval(() => {
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
          return phase === 'reveal' ? 90 : 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, playerSelectedCard, playerAction]);

  // Betting
  const [playerBankroll, setPlayerBankroll] = useState(0);
  const [opponentBankroll, setOpponentBankroll] = useState(0);

  // Boost Coins (Virtual currency for PvP only - used to buy boosts during match)
  const [playerBoostCoins, setPlayerBoostCoins] = useState(0);
  const [opponentBoostCoins, setOpponentBoostCoins] = useState(0);

  // Score
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Action Timer
  const [timeRemaining, setTimeRemaining] = useState(30); // 30 seconds per action
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Ref to control timer interval

  const victoryAudioRef = useRef<HTMLAudioElement | null>(null); // Ref to control victory music
  const gameOverPopupsConfiguredRef = useRef(false); // Prevent multiple popup configuration

  // Confirmation dialog for actions
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<CardAction | null>(null);

  // Round winner display
  const [showRoundWinner, setShowRoundWinner] = useState(false);
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | null>(null);

  // Spectator bet feedback state
  const [lastRoundWinnerAddress, setLastRoundWinnerAddress] = useState<string | null>(null);
  const [showBetResult, setShowBetResult] = useState(false);

  // Round history - for CPU mode (local state), for PvP mode (synced from room)
  const [cpuRoundHistory, setCpuRoundHistory] = useState<Array<{
    round: number;
    winner: 'player' | 'opponent' | 'tie';
    playerScore: number;
    opponentScore: number;
  }>>([]);

  // Use room's roundHistory for PvP, local state for CPU
  const roundHistory = !isCPUMode && room?.roundHistory ? room.roundHistory : cpuRoundHistory;

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

    // Both CPU and PvP: Same pot system (ante * 2)
    // Winner takes the pot at the end of the match
    const initialPot = selectedAnte * 2;
    const initialBoostCoins = 1000; // Both CPU and PvP: 1000 virtual boost coins to start

    console.log('[PokerBattle] Setting initial game state', {
      pot: initialPot,
      playerBoostCoins: initialBoostCoins,
      opponentBoostCoins: initialBoostCoins,
      phase: 'card-selection'
    });

    setPot(initialPot);
    setPlayerBoostCoins(initialBoostCoins);
    setOpponentBoostCoins(initialBoostCoins);
    setCpuRoundHistory([]); // Reset CPU round history
    gameOverPopupsConfiguredRef.current = false; // Reset for next game
    setPhase('card-selection');
  };

  // Card Selection Phase
  const selectCard = async (card: Card) => {
    // Block card selection if showing round winner (prevents clicking during animations)
    if (showRoundWinner) {
      console.log('[PokerBattle] Card selection blocked - showing round winner');
      return;
    }

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
        setTimeRemaining(90); // Reset timer for reveal phase
      }, 5000);
    } else {
      // PvP mode - send to server
      console.log('[PokerBattle] Sending card selection to server', {
        roomId,
        playerAddress,
        rawCard: card
      });

      // Build card data - always include collection (undefined if not specified)
      const cardData: any = {
        tokenId: card.tokenId,
        collection: card.collection, // Can be undefined - mutation accepts optional
        power: card.power || 0,
        imageUrl: card.imageUrl || card.image || '',
        name: card.name || 'Unknown',
        rarity: card.rarity || 'common',
        foil: card.foil, // Can be undefined
        wear: card.wear, // Can be undefined
      };

      console.log('[PokerBattle] Prepared card data:', cardData);

      try {
        await selectCardMutation({
          roomId,
          address: playerAddress,
          card: cardData,
        });
        console.log('[PokerBattle] Card selection sent to server successfully');
      } catch (error) {
        console.error('[PokerBattle] Error selecting card:', error);
        console.error('[PokerBattle] Failed card data:', cardData);
      }
    }
  };


  // Boost shop prices (same for both CPU and PvP - always uses boost coins)
  const getBoostPrice = (boostType: CardAction): number => {
    switch (boostType) {
      case 'BOOST': return 100; // +30% power
      case 'SHIELD': return 80;  // Block opponent boost
      case 'DOUBLE': return 200; // x2 power (expensive!)
      default: return 0;
    }
  };

  // Show confirmation dialog for action
  const showConfirmAction = (action: CardAction) => {
    const cost = getBoostPrice(action);

    // Check if player can afford it (always use boost coins)
    if (cost > 0 && cost > playerBoostCoins) {
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

    // Deduct cost from boost coins (both CPU and PvP mode use boost coins)
    if (cost > 0) {
      setPlayerBoostCoins(prev => {
        const newBoostCoins = prev - cost;
        console.log('[PokerBattle] Player paid for action (boost coins)', { prev, cost, newBoostCoins });
        return newBoostCoins;
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

        // AI pays for boost using boost coins
        const aiCost = getBoostPrice(aiAction);
        if (aiCost > 0) {
          setOpponentBoostCoins(prev => {
            const newBoostCoins = prev - aiCost;
            console.log('[PokerBattle] CPU Mode - AI paid for action (boost coins)', { prev, aiCost, newBoostCoins });
            return newBoostCoins;
          });
        }

        // Move to card reveal animation phase
        console.log('[PokerBattle] CPU Mode - Moving to card-reveal-animation phase');
        setPhase('card-reveal-animation');
        AudioManager.buttonSuccess();

        // Auto-resolve after animation (2.5s)
        setTimeout(() => {
          console.log('[PokerBattle] CPU Mode - Auto-resolving after card reveal animation');
          resolveRound();
        }, 2500);
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
      pot,
      isCPUMode,
      playerHandSize: playerHand.length,
      opponentHandSize: opponentHand.length
    });

    if (!playerSelectedCard || !opponentSelectedCard) {
      console.error('[PokerBattle] Cannot resolve round - missing selected cards', {
        hasPlayerCard: !!playerSelectedCard,
        hasOpponentCard: !!opponentSelectedCard,
        isCPUMode,
        phase,
        currentRound
      });

      // Emergency fallback - auto-select cards if missing (CPU and PvP)
      if (playerHand.length > 0 && opponentHand.length > 0) {
        console.warn('[PokerBattle] Emergency fallback - auto-selecting missing cards');

        if (!playerSelectedCard) {
          const fallbackPlayerCard = playerHand[Math.floor(Math.random() * playerHand.length)];
          setPlayerSelectedCard(fallbackPlayerCard);
          console.log('[PokerBattle] Emergency: Auto-selected player card', fallbackPlayerCard.tokenId);
        }

        if (!opponentSelectedCard) {
          const fallbackOpponentCard = opponentHand[Math.floor(Math.random() * opponentHand.length)];
          setOpponentSelectedCard(fallbackOpponentCard);
          console.log('[PokerBattle] Emergency: Auto-selected opponent card', fallbackOpponentCard.tokenId);
        }

        // Retry after short delay to let state update
        setTimeout(() => resolveRound(), 500);
        return;
      }

      // If no cards in hand, cannot proceed - force finish to prevent softlock
      console.error('[PokerBattle] CRITICAL: No cards in hand to auto-select - forcing game finish');
      setPhase('game-over');
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
          // Tie: no score change, pot stays the same
          setRoundWinner(null);
          AudioManager.tie(); // Tie sound
          console.log('[PokerBattle] CPU Mode - Round tied, pot stays at', pot);

          // Add tie to history
          setCpuRoundHistory(history => [...history, {
            round: currentRound,
            winner: 'tie',
            playerScore: playerScore,
            opponentScore: opponentScore
          }]);

          // Show tie message
          setShowRoundWinner(true);
          console.log('[PokerBattle] CPU Mode - Showing tie message, waiting 5s before next round');

          setTimeout(() => {
            console.log('[PokerBattle] CPU Mode - 5s timeout for tie completed, proceeding to next round');
            setShowRoundWinner(false);
            nextRound();
          }, 5000);
        } else if (playerWins) {
          // Player wins round: score increases, pot stays the same
          setPlayerScore(prev => {
            const newScore = prev + 1;
            console.log('[PokerBattle] Player score increased', { prev, newScore });
            // Add to history
            setCpuRoundHistory(history => [...history, {
              round: currentRound,
              winner: 'player',
              playerScore: newScore,
              opponentScore: opponentScore
            }]);
            return newScore;
          });
          setRoundWinner('player');
          AudioManager.buttonSuccess(); // Victory sound
        } else {
          // Opponent wins round: score increases, pot stays the same
          setOpponentScore(prev => {
            const newScore = prev + 1;
            console.log('[PokerBattle] Opponent score increased', { prev, newScore });
            // Add to history
            setCpuRoundHistory(history => [...history, {
              round: currentRound,
              winner: 'opponent',
              playerScore: playerScore,
              opponentScore: newScore
            }]);
            return newScore;
          });
          setRoundWinner('opponent');
          AudioManager.buttonError(); // Defeat sound
        }

        // Pot stays fixed throughout the game

        // Show round winner message
        setShowRoundWinner(true);
        console.log('[PokerBattle] CPU Mode - Showing round winner, waiting 4s for reveal');

        // Resolve round bets (instant payout for spectators)
        if (!isCPUMode && roomId && room) {
          const winnerAddress = playerWins
            ? (isHost ? room.hostAddress : room.guestAddress)
            : (isHost ? room.guestAddress : room.hostAddress);

          if (winnerAddress) {
            resolveRoundBetsMutation({
              roomId,
              roundNumber: currentRound,
              winnerAddress,
            }).catch((error) => {
              console.error('[PokerBattle] Failed to resolve round bets:', error);
            });
          }
        }

        // Hide message and check win condition after delay
        setTimeout(() => {
          console.log('[PokerBattle] CPU Mode - 4s timeout completed, checking win condition');
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
        }, 4000);
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
          setRoundWinner(isTie ? null : (playerWins ? 'player' : 'opponent'));
          setShowRoundWinner(true);

          // Enhanced sounds for spectators
          if (isSpectator) {
            if (isTie) {
              AudioManager.tie(); // Neutral sound for tie
            } else {
              // Exciting sounds for round results
              AudioManager.win(); // Victory fanfare for spectators
            }
          }

          console.log('[PokerBattle] PvP Mode - Showing round winner', {
            winner: isTie ? 'tie' : (playerWins ? 'player' : 'opponent')
          });

          // Resolve round bets (instant payout for spectators)
          if (!isTie && roomId && room) {
            const winnerAddress = playerWins
              ? (isHost ? room.hostAddress : room.guestAddress)
              : (isHost ? room.guestAddress : room.hostAddress);

            if (winnerAddress) {
              // Set winner address for spectator bet feedback
              setLastRoundWinnerAddress(winnerAddress);
              setShowBetResult(true);

              resolveRoundBetsMutation({
                roomId,
                roundNumber: currentRound,
                winnerAddress,
              }).catch((error) => {
                console.error('[PokerBattle] PvP Mode - Failed to resolve round bets:', error);
              });

              // Hide bet result after 3 seconds
              setTimeout(() => {
                setShowBetResult(false);
              }, 3000);
            }
          }

          // Add to round history
          if (isTie) {
            setCpuRoundHistory(history => [...history, {
              round: currentRound,
              winner: 'tie',
              playerScore: playerScore,
              opponentScore: opponentScore
            }]);
            AudioManager.tie();
          } else {
            // Update scores
            if (playerWins) {
              setPlayerScore(prev => {
                const newScore = prev + 1;
                setCpuRoundHistory(history => [...history, {
                  round: currentRound,
                  winner: 'player',
                  playerScore: newScore,
                  opponentScore: opponentScore
                }]);
                return newScore;
              });
              AudioManager.buttonSuccess();
            } else {
              setOpponentScore(prev => {
                const newScore = prev + 1;
                setCpuRoundHistory(history => [...history, {
                  round: currentRound,
                  winner: 'opponent',
                  playerScore: playerScore,
                  opponentScore: newScore
                }]);
                return newScore;
              });
              AudioManager.buttonError();
            }
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
              console.log('[PokerBattle] PvP Mode - Moving to next round');
              // Call nextRound to remove played cards from hands and draw new ones
              // Server already updated gameState, which will be synced via useEffect
              nextRound();
            }
          }, 4000);
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
      // Only filter if playerSelectedCard exists, otherwise just add new card
      if (playerSelectedCard) {
        setPlayerHand(prev => [...prev.filter(c => c.tokenId !== playerSelectedCard.tokenId), newCard]);
      } else {
        console.warn('[PokerBattle] No playerSelectedCard to remove, just adding new card');
        setPlayerHand(prev => [...prev, newCard]);
      }
      setPlayerDeckRemaining(prev => prev.slice(1));
    } else {
      console.log('[PokerBattle] No cards left in player deck - removing selected card from hand');
      if (playerSelectedCard) {
        setPlayerHand(prev => prev.filter(c => c.tokenId !== playerSelectedCard.tokenId));
      } else {
        console.warn('[PokerBattle] No playerSelectedCard to remove from hand');
      }
    }

    if (opponentDeckRemaining.length > 0) {
      const newCard = opponentDeckRemaining[0];
      console.log('[PokerBattle] Drawing new card for opponent', {
        newCard: { tokenId: newCard.tokenId, power: newCard.power },
        removingCard: opponentSelectedCard ? { tokenId: opponentSelectedCard.tokenId, power: opponentSelectedCard.power } : null
      });
      // Only filter if opponentSelectedCard exists, otherwise just add new card
      if (opponentSelectedCard) {
        setOpponentHand(prev => [...prev.filter(c => c.tokenId !== opponentSelectedCard.tokenId), newCard]);
      } else {
        console.warn('[PokerBattle] No opponentSelectedCard to remove, just adding new card');
        setOpponentHand(prev => [...prev, newCard]);
      }
      setOpponentDeckRemaining(prev => prev.slice(1));
    } else {
      console.log('[PokerBattle] No cards left in opponent deck - removing selected card from hand');
      if (opponentSelectedCard) {
        setOpponentHand(prev => prev.filter(c => c.tokenId !== opponentSelectedCard.tokenId));
      } else {
        console.warn('[PokerBattle] No opponentSelectedCard to remove from hand');
      }
    }

    const newRound = currentRound + 1;

    console.log('[PokerBattle] Advancing to next round', {
      newRound,
      playerBankrollBefore: playerBankroll,
      opponentBankrollBefore: opponentBankroll,
      note: 'Ante only deducted at game start, not per round'
    });

    setCurrentRound(prev => prev + 1);
    setPlayerSelectedCard(null);
    setOpponentSelectedCard(null);
    setPlayerAction(null);
    setOpponentAction(null);

    // Pot stays fixed at ante * 2 throughout the entire game
    // Winner receives pot only at game-over

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

  // Matchmaking callbacks
  const handleRoomJoined = (newRoomId: string, host: boolean, ante: number, token: string, spectator: boolean = false) => {
    setRoomId(newRoomId);
    setIsHost(host);
    setSelectedAnte(ante);
    setSelectedToken(token as 'VBMS' | 'TESTVBMS' | 'VIBE_NFT');
    setCurrentView(spectator ? 'game' : 'waiting');
    setIsSpectatorMode(spectator);
  };

  const handleGameStart = async (deck: Card[], opponentDeckData?: Card[]) => {
    AudioManager.buttonSuccess();

    setSelectedDeck(deck);
    setCurrentView('game');
    gameOverPopupsConfiguredRef.current = false; // Reset for new game
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

    // Initialize bankrolls and boost coins based on ante
    const startingBankroll = selectedAnte;
    const startingBoostCoins = 1000;
    setPlayerBankroll(startingBankroll);
    setOpponentBankroll(startingBankroll);
    setPlayerBoostCoins(startingBoostCoins);
    setOpponentBoostCoins(startingBoostCoins);
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

  // Handler for closing victory screen
  const handleCloseVictoryScreen = () => {
    // Stop victory music
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current = null;
    }
    setShowWinPopup(false);
    // All rewards go to inbox automatically, close the game
    onClose();
  };

  // Handler for closing defeat screen
  const handleCloseDefeatScreen = () => {
    // Stop any audio just in case
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current = null;
    }
    setShowLossPopup(false);
    onClose();
  };

  // Handler for spectator trying to exit
  const handleSpectatorExitClick = () => {
    // If spectator has betting credits, show confirmation modal
    const creditsBalance = bettingCreditsData?.balance || 0;
    if (isSpectatorMode && creditsBalance > 0) {
      setShowExitConfirmation(true);
    } else {
      // No credits, just exit
      handleConfirmExit();
    }
  };

  // Confirm exit - convert credits and leave
  const handleConfirmExit = async () => {
    if (!roomId || !playerAddress) {
      onClose();
      return;
    }

    setIsLeaving(true);
    try {
      const result = await leaveSpectateMutation({
        roomId,
        address: playerAddress,
      });

      console.log("Left spectator mode:", result);

      if (result.converted > 0) {
        toast.success(`Converted ${result.converted} credits to TESTVBMS!`);
      }

      if (result.roomDeleted) {
        toast.info("CPU Arena room closed (you were the last spectator)");
      }
    } catch (error) {
      console.error("Error leaving spectate:", error);
    } finally {
      setIsLeaving(false);
      setShowExitConfirmation(false);
      onClose();
    }
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
      if (isSpectatorMode) {
        // Spectators see both cards
        setPlayerSelectedCard(gs.hostSelectedCard);
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (isHost && gs.guestSelectedCard) {
        setOpponentSelectedCard(gs.guestSelectedCard);
      } else if (!isHost && gs.hostSelectedCard) {
        setOpponentSelectedCard(gs.hostSelectedCard);
      }

      // Sync opponent's action
      if (isSpectatorMode) {
        // Spectators see both actions
        setPlayerAction(gs.hostAction as CardAction);
        setOpponentAction(gs.guestAction as CardAction);
      } else if (isHost && gs.guestAction) {
        setOpponentAction(gs.guestAction as CardAction);
      } else if (!isHost && gs.hostAction) {
        setOpponentAction(gs.hostAction as CardAction);
      }

      // Sync bankrolls and boost coins from room
      if (room.hostBankroll !== undefined && room.guestBankroll !== undefined) {
        if (isHost) {
          setPlayerBankroll(room.hostBankroll);
          setOpponentBankroll(room.guestBankroll);
        } else {
          setPlayerBankroll(room.guestBankroll);
          setOpponentBankroll(room.hostBankroll);
        }
      }

      // Sync boost coins from room (default to 1000 if not set for old rooms)
      if (isHost) {
        setPlayerBoostCoins(room.hostBoostCoins ?? 1000);
        setOpponentBoostCoins(room.guestBoostCoins ?? 1000);
      } else {
        setPlayerBoostCoins(room.guestBoostCoins ?? 1000);
        setOpponentBoostCoins(room.hostBoostCoins ?? 1000);
      }
    }
  }, [room, isCPUMode, isHost, currentView]);

  // Play audio when game ends (for players, not spectators)
  useEffect(() => {
    if (phase === 'game-over' && !isSpectatorMode && soundEnabled && !gameOverShown) {
      // Play appropriate sound based on result
      if (playerScore > opponentScore) {
        AudioManager.win(); // Victory sound
      } else if (playerScore < opponentScore) {
        AudioManager.lose(); // Defeat sound
      } else {
        AudioManager.tie(); // Tie sound
      }
    }
  }, [phase, playerScore, opponentScore, isSpectatorMode, soundEnabled, gameOverShown]);

  // NOTE: Victory music is now handled by GamePopups component via <audio autoPlay>
  // This prevents duplicate audio playback

  // Show spectator entry modal when entering spectator mode (regardless of game state)
  useEffect(() => {
    if (isSpectatorMode && !hasBettingCredits && !showSpectatorEntryModal) {
      setShowSpectatorEntryModal(true);
    }
  }, [isSpectatorMode, hasBettingCredits, showSpectatorEntryModal]);

  // Spectator mode: Detect when a round ends via roundHistory changes
  // This is important for CPU vs CPU mode where resolution happens in backend
  const prevRoundHistoryLength = useRef(0);
  useEffect(() => {
    if (!isSpectatorMode || !room?.roundHistory) return;

    const currentLength = room.roundHistory.length;
    if (currentLength > prevRoundHistoryLength.current && prevRoundHistoryLength.current > 0) {
      // A new round was resolved
      const lastResult = room.roundHistory[currentLength - 1];
      if (lastResult && lastResult.winner !== 'tie') {
        // Determine winner address from last round
        const winnerAddress = lastResult.winner === 'player'
          ? room.hostAddress
          : room.guestAddress;

        if (winnerAddress) {
          console.log('[Spectator] Round resolved, showing bet feedback for:', winnerAddress);
          setLastRoundWinnerAddress(winnerAddress);
          setShowBetResult(true);

          // Hide after 3 seconds
          setTimeout(() => {
            setShowBetResult(false);
          }, 3000);
        }
      }
    }
    prevRoundHistoryLength.current = currentLength;
  }, [isSpectatorMode, room?.roundHistory, room?.hostAddress, room?.guestAddress]);

  // Resolve bets when game ends (PvP mode only)
  useEffect(() => {
    if (phase === 'game-over' && !isCPUMode && roomId && room) {
      // Determine winner address
      const winnerAddress = playerScore > opponentScore
        ? (isHost ? room.hostAddress : room.guestAddress)
        : (isHost ? room.guestAddress : room.hostAddress);

      if (winnerAddress) {
        // Resolve all bets for this room
        resolveBetsMutation({
          roomId,
          winnerAddress,
        }).then((result) => {
          console.log(`🎰 Betting pool resolved:`, {
            totalBets: result.betsResolved,
            totalPool: result.totalPool,
            houseFee: result.houseFee,
            paidToWinners: result.totalPaidOut,
          });
        }).catch((error) => {
          console.error('[PokerBattle] Failed to resolve bets:', error);
        });
      }
    }
  }, [phase, playerScore, opponentScore, isCPUMode, roomId, room, isHost, resolveBetsMutation]);

  // Convert remaining betting credits to TESTVBMS when game ends (spectator only)
  useEffect(() => {
    if (phase === 'game-over' && isSpectatorMode && playerAddress && !isCPUMode) {
      console.log('[PokerBattle] Game over - converting remaining betting credits to TESTVBMS');

      convertCreditsMutation({
        address: playerAddress,
        roomId,
      }).then((result) => {
        if (result.converted > 0) {
          console.log(`💰 Converted ${result.converted} betting credits to TESTVBMS`);
          toast.success(result.message);
        }
      }).catch((error) => {
        console.error('[PokerBattle] Failed to convert credits:', error);
      });
    }
  }, [phase, isSpectatorMode, playerAddress, isCPUMode, roomId, convertCreditsMutation]);

  // Record match when game ends
  useEffect(() => {
    if (phase === 'game-over' && selectedAnte !== 0 && !isSpectatorMode && playerScore !== opponentScore && !matchRecordedRef.current) {
      const result = playerScore > opponentScore ? 'win' : 'loss';
      const matchType = isCPUMode ? 'poker-cpu' : 'poker-pvp';

      // Mark as recorded immediately to prevent duplicate calls
      matchRecordedRef.current = true;

      // Record match to history
      recordMatchMutation({
        playerAddress,
        type: matchType,
        result,
        playerPower: 0, // Poker doesn't use power
        opponentPower: 0,
        playerCards: playerHand.slice(0, 3), // First 3 cards of hand as sample
        opponentCards: opponentHand.slice(0, 3),
        opponentAddress: isCPUMode ? undefined : (isHost ? room?.guestAddress : room?.hostAddress),
        opponentUsername: isCPUMode ? 'CPU' : (isHost ? room?.guestUsername : room?.hostUsername),
        coinsEarned: result === 'win' ? Math.round((selectedAnte * 2) * 0.95) : 0,
        entryFeePaid: selectedAnte,
        difficulty: isCPUMode ? difficulty : undefined,
        playerScore,
        opponentScore,
      }).then((matchId) => {
        console.log('[PokerBattle] Match recorded to history', matchId);
        // Save matchId for TESTVBMS inbox integration
        if (matchId) {
          setCreatedMatchId(matchId);
        }
      }).catch((error) => {
        console.error('[PokerBattle] Failed to record match:', error);
      });

      // Room cleanup is now automatic - handled by the useEffect that watches room.status === 'finished'
      // VBMS: Auto-calls finishBattle TX → then deletes room
      // Non-VBMS: Deletes room immediately
      console.log('[PokerBattle] Match recorded - room cleanup will happen automatically when backend marks as finished');
    }
  }, [phase, selectedAnte, isSpectatorMode, playerScore, opponentScore, isCPUMode, playerAddress, recordMatchMutation, playerHand, opponentHand, isHost, room, difficulty, roomId, finishGameMutation, roomFinished, selectedToken, finishVBMSBattle]);

  // TESTVBMS rewards go to inbox for ALL modes (TESTVBMS, NFT, and VBMS)
  useEffect(() => {
    // ALL battles send TESTVBMS to inbox when won
    if (phase === 'game-over' && !isSpectatorMode && !battleFinalized) {
      const result = playerScore > opponentScore ? 'win' : 'loss';

      // Only proceed if player won and has a valid match
      if (result === 'win' && createdMatchId && selectedAnte > 0) {
        const rewardAmount = Math.round((selectedAnte * 2) * 0.95);

        console.log('[PokerBattle] 💰 Sending TESTVBMS to inbox', {
          address: playerAddress,
          matchId: createdMatchId,
          amount: rewardAmount,
          selectedToken,
          mode: isCPUMode ? 'CPU' : 'PvP'
        });

        // Use secure sendToInbox with matchId validation
        sendToInbox({
          address: playerAddress,
          matchId: createdMatchId,
        })
          .then((result) => {
            console.log('[PokerBattle] ✅ coins sent to inbox:', result);
            setBattleFinalized(true);

            toast.success(`Victory! ${rewardAmount} coins sent to inbox!`, {
              description: 'Check your inbox to claim',
              duration: 5000,
            });
          })
          .catch((error) => {
            console.error('[PokerBattle] ❌ Failed to send TESTVBMS to inbox:', error);
            setBattleFinalized(true);

            toast.error('Failed to send reward to inbox', {
              description: error.message || 'Server error',
            });
          });
      }
    }
  }, [phase, isCPUMode, isSpectatorMode, battleFinalized, playerScore, opponentScore, createdMatchId, selectedAnte, selectedToken, sendToInbox, playerAddress, difficulty]);

  // Auto-delete finished rooms (V5: No TX needed, just cleanup Convex)
  // Triggers when: room.status === 'finished' OR when phase === 'game-over' in PvP
  useEffect(() => {
    // Only for PvP mode (not CPU)
    if (isCPUMode || !room || roomFinished || roomDeletionRef.current) return;

    // Check if should delete:
    // 1. Room status is explicitly 'finished' (backend marked it)
    // 2. OR phase is 'game-over' and we have a winner (fallback for realtime delay)
    const shouldDelete =
      room.status === 'finished' ||
      (phase === 'game-over' && (playerScore >= 4 || opponentScore >= 4));

    if (shouldDelete) {
      console.log('[PokerBattle] 🗑️ Room finished - deleting from Convex...', {
        status: room.status,
        phase,
        playerScore,
        opponentScore
      });

      roomDeletionRef.current = true; // Mark as deletion in progress

      // Determine winner (for finishGame mutation)
      const winnerId = playerScore >= 4 ? playerAddress : (room.guestAddress || room.hostAddress);
      const winnerUsername = playerScore >= 4 ? playerUsername : (room.guestUsername || room.hostUsername);
      const finalPot = room.finalPot || 0;

      finishGameMutation({
        roomId: room.roomId,
        winnerId: winnerId.toLowerCase(),
        winnerUsername: winnerUsername || 'Unknown',
        finalPot,
      }).then(() => {
        console.log('[PokerBattle] ✅ Room deleted from Convex');
        setRoomFinished(true);
      }).catch((error) => {
        console.error('[PokerBattle] ❌ Failed to delete room:', error);
        setRoomFinished(true);
        // Reset ref on error so user can retry if needed
        roomDeletionRef.current = false;
      });
    }
  }, [room, isCPUMode, roomFinished, finishGameMutation, phase, playerScore, opponentScore, playerAddress, playerUsername]);

  // Set gameOverShown flag when phase becomes game-over and configure GamePopups
  // Uses ref to prevent multiple executions (performance optimization)
  useEffect(() => {
    // Skip if already configured or not in game-over phase
    if (phase !== 'game-over' || gameOverPopupsConfiguredRef.current) return;

    // Mark as configured immediately to prevent re-runs
    gameOverPopupsConfiguredRef.current = true;
    setGameOverShown(true);
    console.log('[PokerBattle] Game over - configuring popups (once)');

    // Custom result screen for spectator mode (Mecha Arena)
    // Uses GamePopups based on betting profit: win > 0, loss < 0, tie = 0
    if (isSpectatorMode && spectatorType === 'betting' && playerAddress && roomId) {
      console.log('[PokerBattle] Spectator mode - calculating betting results');

      // Fetch all bets for this room by this spectator
      convex.query(api.roundBetting.getSpectatorBetsForRoom, {
        roomId,
        spectatorAddress: playerAddress,
      }).then((bets) => {
        // Calculate net gains: (total winnings) - (total bet amount)
        const totalBet = bets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
        const totalWinnings = bets.reduce((sum: number, bet: any) => {
          if (bet.status === 'won' && bet.payout) {
            return sum + bet.payout;
          }
          return sum;
        }, 0);

        const netGain = totalWinnings - totalBet;
        console.log('[PokerBattle] Betting results:', { totalBet, totalWinnings, netGain });

        // Determine popup type and victory image before setting state
        const victoryIndex = Math.floor(Math.random() * VICTORY_CONFIGS.length);
        const victoryConfig = VICTORY_CONFIGS[victoryIndex];

        // Batch all state updates together
        setSpectatorNetGains(netGain);
        setLastBattleResult({
          coinsEarned: netGain,
          type: 'mecha',
          playerPower: totalWinnings,
          opponentPower: totalBet,
          opponentName: 'Mecha Arena',
        });

        // Show appropriate popup based on profit/loss
        if (netGain > 0) {
          setCurrentVictoryImage(victoryConfig.image);
          setShowWinPopup(true);
        } else if (netGain < 0) {
          setShowLossPopup(true);
        } else {
          setShowTiePopup(true);
        }
      }).catch((err) => {
        console.error('[PokerBattle] Failed to fetch betting results:', err);
        // Batch error state updates
        setSpectatorNetGains(0);
        setLastBattleResult({
          coinsEarned: 0,
          type: 'mecha',
          playerPower: 0,
          opponentPower: 0,
          opponentName: 'Mecha Arena',
        });
        setShowTiePopup(true);
      });

      return;
    }

    // Don't show victory/defeat popups for other spectator modes
    if (isSpectatorMode) {
      console.log('[PokerBattle] Spectator mode - skipping victory/defeat popups');
      return;
    }

    // Determine victory image before setting state (non-spectator mode)
    const victoryIndex = Math.floor(Math.random() * VICTORY_CONFIGS.length);
    const victoryConfig = VICTORY_CONFIGS[victoryIndex];
    const opponentName = room?.guestUsername || room?.hostUsername || 'Opponent';

    // Configure victory/defeat/tie popups - batch state updates
    if (playerScore > opponentScore) {
      setCurrentVictoryImage(victoryConfig.image);
      setLastBattleResult({
        coinsEarned: selectedAnte > 0 ? Math.round((selectedAnte * 2) * 0.95) : 0,
        type: isCPUMode ? 'pve' : 'pvp',
        playerPower: playerScore,
        opponentPower: opponentScore,
        opponentName,
      });
      setShowWinPopup(true);
    } else if (playerScore < opponentScore) {
      setLastBattleResult({
        coinsEarned: 0,
        type: isCPUMode ? 'pve' : 'pvp',
        playerPower: playerScore,
        opponentPower: opponentScore,
        opponentName,
      });
      setShowLossPopup(true);
    } else {
      setLastBattleResult({
        coinsEarned: selectedAnte,
        type: isCPUMode ? 'pve' : 'pvp',
        playerPower: playerScore,
        opponentPower: opponentScore,
        opponentName,
      });
      setShowTiePopup(true);
    }
  }, [phase, playerScore, opponentScore, selectedAnte, isCPUMode, room, isSpectatorMode, spectatorType, playerAddress, roomId]);

  // REMOVED: Auto-close room (user wants to see victory screen without auto-closing)
  // Room is marked as 'finished' in database but UI stays open for user to close manually

  // Note: VBMS battles are finalized via blockchain contract (finishVBMSBattle) in the useEffect above
  // No inbox system for VBMS battles - rewards are transferred directly via smart contract

  // Auto-close game after it ends (with ref to prevent dependency issues)
  const gameOverHandled = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // Keep ref updated

  useEffect(() => {
    if (phase === 'game-over' && !isSpectatorMode && !gameOverHandled.current) {
      gameOverHandled.current = true; // Prevent running multiple times
      console.log('[PokerBattle] Game over - will auto-close in 15 seconds', {
        selectedToken,
        roomFinished,
        isCPUMode
      });

      const timer = setTimeout(() => {
        console.log('[PokerBattle] Auto-closing game...');
        // Stop victory music before closing
        if (victoryAudioRef.current) {
          victoryAudioRef.current.pause();
          victoryAudioRef.current = null;
        }
        onCloseRef.current();
      }, 15000); // 15 seconds to see victory screen

      return () => clearTimeout(timer);
    }
    // Reset flag when phase changes away from game-over
    if (phase !== 'game-over') {
      gameOverHandled.current = false;
    }
  }, [phase, isSpectatorMode, selectedToken, roomFinished, isCPUMode]);

  // Early returns for matchmaking flow
  if (currentView === 'matchmaking') {
    // Check if player has enough cards before showing matchmaking
    if (playerCards.length < 10) {
      return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4">
          <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-lg w-full p-4 shadow-neon">
            <h2 className="text-xl font-display font-bold text-center mb-2 text-vintage-gold">
              POKER BATTLE
            </h2>
            <NotEnoughCardsGuide
              currentCards={playerCards.length}
              requiredCards={10}
              gameMode="poker"
              onClose={onClose}
              t={t}
            />
          </div>
        </div>
      );
    }
    return (
      <PokerMatchmaking
        onClose={onClose}
        onRoomJoined={handleRoomJoined}
        playerAddress={playerAddress}
        playerUsername={playerUsername}
      />
    );
  }

  if (currentView === 'waiting') {
    if (isSpectatorMode) {
      // Spectator view for waiting room
      return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-3xl border-4 border-vintage-gold/50 max-w-2xl w-full p-8 shadow-2xl shadow-vintage-gold/20">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 bg-vintage-gold text-vintage-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:bg-vintage-burnt-gold transition"
            >
              X
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-vintage-gold mb-4">
                SPECTATING
              </h2>
              <div className="bg-vintage-black/50 border border-vintage-gold/30 rounded-lg p-4 mb-4">
                <p className="text-vintage-burnt-gold text-base mb-2">
                  Waiting for the game to start...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-vintage-gold rounded-full animate-pulse"></div>
                  <span className="text-sm text-vintage-ice/70">{t('gameWillBegin')}</span>
                </div>
              </div>
              {room && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-vintage-black/30 rounded-lg p-3">
                    <span className="text-vintage-burnt-gold">{t('host')}:</span>
                    <span className="text-vintage-gold font-bold">{room.hostUsername || 'Player 1'}</span>
                  </div>
                  {room.guestUsername && (
                    <div className="flex justify-between items-center bg-vintage-black/30 rounded-lg p-3">
                      <span className="text-vintage-burnt-gold">{t('guest')}:</span>
                      <span className="text-vintage-gold font-bold">{room.guestUsername}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-vintage-black/30 rounded-lg p-3">
                    <span className="text-vintage-burnt-gold">{t('stakes')}:</span>
                    <span className="text-vintage-gold font-bold">{room.ante} {room.token}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

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
          onClick={isSpectatorMode ? handleSpectatorExitClick : onClose}
          className="absolute -top-2 -right-2 z-10 bg-vintage-gold text-vintage-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:bg-vintage-burnt-gold transition"
        >
          X
        </button>

        {/* SPECTATOR VIEW - Deck Building Phase */}
        {phase === 'deck-building' && isSpectatorMode && (
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-xl border-2 border-vintage-gold/50 p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-vintage-gold mb-3">
                SPECTATING
              </h2>
              <div className="bg-vintage-black/50 border border-vintage-gold/30 rounded-lg p-4 mb-4">
                <p className="text-vintage-burnt-gold text-base mb-3">
                  Players are building their decks...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-vintage-gold rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-vintage-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-vintage-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
              {room && (
                <div className="space-y-1 text-sm">
                  <p className="text-vintage-ice/70">
                    {room.ante} {room.token}
                  </p>
                  <p className="text-vintage-gold">
                    {room.hostUsername} vs {room.guestUsername}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DECK BUILDING PHASE - Skip for spectators */}
        {phase === 'deck-building' && !isSpectatorMode && (
          <div className="bg-vintage-charcoal rounded-xl sm:rounded-2xl border-2 sm:border-4 border-vintage-gold p-2 sm:p-4 md:p-6 h-full flex flex-col overflow-hidden">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold mb-2 sm:mb-3 text-center flex-shrink-0">
              {t('deckBuilderTitle')}
            </h2>

            {/* Not enough cards warning */}
            {playerCards.length < 10 && (
              <NotEnoughCardsGuide
                currentCards={playerCards.length}
                requiredCards={10}
                gameMode="poker"
                onClose={onClose}
                t={t}
              />
            )}

            {/* Normal deck building UI - only show if enough cards */}
            {playerCards.length >= 10 && (
            <>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 gap-2 flex-shrink-0">
              <p className="text-vintage-burnt-gold text-center text-sm sm:text-base">
                {t('pokerSelectCards').replace('{selected}', String(selectedDeck.length))}
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
                {sortByPower ? t('deckBuilderSortedByPower') : t('deckBuilderSortByPower')}
              </button>
            </div>

            {/* Selected Deck Display */}
            <div className="mb-3 sm:mb-4 bg-vintage-black/40 border-2 border-vintage-gold/50 rounded-lg sm:rounded-xl p-2 sm:p-3 flex-shrink-0">
              <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-1 sm:gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] border-2 border-dashed border-vintage-gold/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
                  >
                    {selectedDeck[i] ? (
                      <>
                        {(selectedDeck[i].imageUrl || selectedDeck[i].image) ? (
                          <CardMedia
                            src={convertIpfsUrl(selectedDeck[i].imageUrl || selectedDeck[i].image) || ''}
                            alt={selectedDeck[i].name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-lg flex flex-col items-center justify-center p-2"
                            style={{ background: getRarityGradient(selectedDeck[i].rarity) }}
                          >
                            <div className="text-white text-xs font-bold text-center mb-1">{selectedDeck[i].name}</div>
                            <div className="text-white text-lg font-bold">{Math.round(getDisplayPower(selectedDeck[i])).toLocaleString()}</div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-xs font-bold text-center">
                          {Math.round(getDisplayPower(selectedDeck[i])).toLocaleString()}
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
            <div className="flex-1 overflow-y-auto mb-3 sm:mb-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-2 pb-20 sm:pb-4">
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
                      <CardMedia
                        src={convertIpfsUrl(card.imageUrl || card.image) || ''}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-1"
                        style={{ background: getRarityGradient(card.rarity) }}
                      >
                        <div className="text-white text-[0.5rem] font-bold text-center mb-0.5 leading-tight">{card.name}</div>
                        <div className="text-white text-sm font-bold">{Math.round(getDisplayPower(card)).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-[0.6rem] font-bold text-center">
                      {Math.round(getDisplayPower(card)).toLocaleString()}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-vintage-gold/20 flex items-center justify-center">
                        <span className="text-4xl text-vintage-gold font-bold">OK</span>
                      </div>
                    )}
                  </button>
                );
              })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4 flex-shrink-0">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-base transition ${
                    currentPage === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                  }`}
                >
                  {t('deckBuilderPrevPage')}
                </button>
                <span className="text-vintage-gold font-bold text-xs sm:text-base">
                  {currentPage + 1}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-base transition ${
                    currentPage === totalPages - 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                  }`}
                >
                  {t('deckBuilderNextPage')}
                </button>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={startGame}
              disabled={selectedDeck.length !== 10}
              className={`w-full py-3 sm:py-4 rounded-xl font-display font-bold text-base sm:text-xl transition flex-shrink-0 ${
                selectedDeck.length === 10
                  ? 'bg-vintage-gold text-vintage-black hover:bg-vintage-burnt-gold'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedDeck.length === 10 ? t('pokerStartGame') : t('deckBuilderSelectMore').replace('{count}', String(10 - selectedDeck.length))}
            </button>
            </>
            )}
          </div>
        )}

        {/* SPECTATOR VIEW - Active during gameplay */}
        {false && phase !== 'deck-building' && phase !== 'game-over' && isSpectatorMode && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-t-2xl p-2 md:p-3">
              <div className="flex justify-between items-center text-sm md:text-base">
                <div className="text-vintage-gold font-display font-bold">
                  ROUND {currentRound}/7 • Score: {playerScore}-{opponentScore}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/50 flex items-center gap-1 animate-pulse">
                    <EyeIcon className="inline-block text-blue-400" size={16} /> SPECTATOR MODE
                  </div>
                  {phase === 'card-selection' && (
                    <div className="text-vintage-burnt-gold text-xs animate-pulse">{t('playersSelectingCards')}</div>
                  )}
                  {phase === 'reveal' && (
                    <div className="text-yellow-400 text-xs animate-pulse">{t('cardsRevealedChoosingActions')}</div>
                  )}
                  {phase === 'resolution' && (
                    <div className="text-green-400 text-xs font-bold animate-pulse">{t('battleInProgress')}</div>
                  )}
                </div>
                <div className="text-vintage-gold font-display font-bold">
                  POT: {pot} {selectedToken}
                </div>
              </div>
            </div>

            {/* Split screen - Both players side by side (or vertical on mobile) */}
            <div className={`flex-1 p-2 bg-vintage-deep-black rounded-b-2xl border-2 border-vintage-gold border-t-0 ${isInFarcaster ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-2'} relative`}>
              {/* VS Indicator - Shows in center when cards are revealed */}
              {playerSelectedCard && opponentSelectedCard && (phase === 'resolution' || showRoundWinner) && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="bg-vintage-deep-black/90 border-4 border-vintage-gold rounded-full w-24 h-24 flex items-center justify-center shadow-2xl animate-in zoom-in duration-500">
                    <div className="text-center">
                      <div className="text-vintage-gold font-display font-bold text-2xl">{t('vsLabel')}</div>
                      {phase === 'resolution' && (() => {
                        const playerPower = getDisplayPower(playerSelectedCard) * (playerAction === 'BOOST' ? 1.3 : playerAction === 'DOUBLE' ? 2 : 1);
                        const opponentPower = getDisplayPower(opponentSelectedCard) * (opponentAction === 'BOOST' ? 1.3 : opponentAction === 'DOUBLE' ? 2 : 1);
                        if (playerPower > opponentPower) {
                          return <div className="text-blue-400 text-xs mt-1">{t('hostPlus')}</div>;
                        } else if (opponentPower > playerPower) {
                          return <div className="text-red-400 text-xs mt-1">{t('guestPlus')}</div>;
                        } else {
                          return <div className="text-yellow-400 text-xs mt-1">{t('tieLabel')}</div>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* HOST SIDE */}
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-xl border-2 border-blue-500/50 p-3 flex flex-col">
                {/* Host Profile */}
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {hostProfile?.twitterProfileImageUrl ? (
                      <img
                        src={hostProfile?.twitterProfileImageUrl}
                        alt={room?.hostUsername}
                        className={isInFarcaster ? "w-12 h-12 rounded-full border-2 border-blue-400" : "w-10 h-10 rounded-full border-2 border-blue-400"}
                      />
                    ) : (
                      <div className={`${isInFarcaster ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white font-bold`}>
                        {room?.hostUsername?.charAt(0).toUpperCase() || 'H'}
                      </div>
                    )}
                    <div>
                      <div className={`text-blue-400 font-display font-bold ${isInFarcaster ? 'text-base' : 'text-sm'} max-w-[120px] truncate`}>
                        {room?.hostUsername || 'HOST'}
                        {isHost && <span className="text-yellow-400 ml-1">(YOU)</span>}
                      </div>
                      <div className={`text-vintage-gold ${isInFarcaster ? 'text-sm' : 'text-xs'}`}>{isHost ? playerBankroll : opponentBankroll} {selectedToken}</div>
                    </div>
                  </div>

                </div>

                {/* Host's selected card */}
                <div className="flex-1 flex items-center justify-center mb-3">
                  <div className={`w-24 sm:w-32 aspect-[2/3] border-2 border-dashed ${playerSelectedCard ? 'border-blue-400' : 'border-blue-400/30'} rounded-lg flex items-center justify-center bg-black/30`}
                  >
                    {playerSelectedCard && (phase === 'resolution' || phase === 'reveal') ? (
                      <div className="relative w-full h-full">
                        {playerSelectedCard?.imageUrl || playerSelectedCard?.image ? (
                          <CardMedia src={convertIpfsUrl(playerSelectedCard?.imageUrl || playerSelectedCard?.image) || ''} alt={playerSelectedCard?.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-lg" style={{ background: getRarityGradient(playerSelectedCard?.rarity) }}>
                            <div className="text-white text-xs font-bold text-center">{playerSelectedCard?.name}</div>
                            <div className="text-white text-lg font-bold">{Math.round(getDisplayPower(playerSelectedCard))}</div>
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 bg-black/80 p-0.5 text-center text-blue-300 ${isInFarcaster ? 'text-xs' : 'text-[10px]'} flex items-center justify-center gap-0.5`}>
                          {Math.round(getDisplayPower(playerSelectedCard) * (playerAction === 'BOOST' ? 1.3 : playerAction === 'DOUBLE' ? 2 : 1))}
                          {playerAction === 'BOOST' && <SwordIcon className="inline-block text-blue-300" size={12} />}
                          {playerAction === 'DOUBLE' && <BoltIcon className="inline-block text-blue-300" size={12} />}
                          {playerAction === 'SHIELD' && <ShieldIcon className="inline-block text-blue-300" size={12} />}
                        </div>
                      </div>
                    ) : playerSelectedCard ? (
                      <img src={getCardBack(room?.cpuCollection)} alt="Hidden" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-blue-400 text-2xl animate-pulse">?</span>
                    )}
                  </div>
                </div>

                {/* Host's hand (hidden for spectators) */}
                <div className="grid grid-cols-5 gap-1">
                  {playerHand.map((card, i) => (
                    <div key={i} className={`aspect-[2/3] rounded border ${playerSelectedCard?.tokenId === card.tokenId ? 'border-2 border-yellow-400 ring-2 ring-yellow-400' : 'border border-blue-500/30'} overflow-hidden bg-black/50`}>
                      {/* Show card back for spectators, real cards for players */}
                      <img src={getCardBack(room?.cpuCollection)} alt="Hidden" className="w-full h-full object-cover" />
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
                        src={guestProfile?.twitterProfileImageUrl}
                        alt={room?.guestUsername}
                        className={isInFarcaster ? "w-12 h-12 rounded-full border-2 border-red-400" : "w-10 h-10 rounded-full border-2 border-red-400"}
                      />
                    ) : (
                      <div className={`${isInFarcaster ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center text-white font-bold`}>
                        {room?.guestUsername?.charAt(0).toUpperCase() || 'G'}
                      </div>
                    )}
                    <div>
                      <div className={`text-red-400 font-display font-bold ${isInFarcaster ? 'text-base' : 'text-sm'} max-w-[120px] truncate`}>
                        {room?.guestUsername || 'GUEST'}
                        {!isHost && <span className="text-yellow-400 ml-1">(YOU)</span>}
                      </div>
                      <div className={`text-vintage-gold ${isInFarcaster ? 'text-sm' : 'text-xs'}`}>{isHost ? opponentBankroll : playerBankroll} {selectedToken}</div>
                    </div>
                  </div>

                </div>

                {/* Guest's selected card */}
                <div className="flex-1 flex items-center justify-center mb-3">
                  <div className={`w-24 sm:w-32 aspect-[2/3] border-2 border-dashed ${opponentSelectedCard ? 'border-red-400' : 'border-red-400/30'} rounded-lg flex items-center justify-center bg-black/30`}
                  >
                    {opponentSelectedCard && (phase === 'resolution' || showRoundWinner) ? (
                      <div className="relative w-full h-full">
                        {opponentSelectedCard?.imageUrl || opponentSelectedCard?.image ? (
                          <CardMedia src={convertIpfsUrl(opponentSelectedCard?.imageUrl || opponentSelectedCard?.image) || ''} alt={opponentSelectedCard?.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-lg" style={{ background: getRarityGradient(opponentSelectedCard?.rarity) }}>
                            <div className="text-white text-xs font-bold text-center">{opponentSelectedCard?.name}</div>
                            <div className="text-white text-lg font-bold">{Math.round(getDisplayPower(opponentSelectedCard))}</div>
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 bg-black/80 p-0.5 text-center text-red-300 ${isInFarcaster ? 'text-xs' : 'text-[10px]'} flex items-center justify-center gap-0.5`}>
                          {Math.round(getDisplayPower(opponentSelectedCard) * (opponentAction === 'BOOST' ? 1.3 : opponentAction === 'DOUBLE' ? 2 : 1))}
                          {opponentAction === 'BOOST' && <SwordIcon className="inline-block text-red-300" size={12} />}
                          {opponentAction === 'DOUBLE' && <BoltIcon className="inline-block text-red-300" size={12} />}
                          {opponentAction === 'SHIELD' && <ShieldIcon className="inline-block text-red-300" size={12} />}
                        </div>
                      </div>
                    ) : opponentSelectedCard ? (
                      <img src={getCardBack(room?.cpuCollection)} alt="Hidden" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-red-400 text-2xl animate-pulse">?</span>
                    )}
                  </div>
                </div>

                {/* Guest's hand (hidden for spectators) */}
                <div className="grid grid-cols-5 gap-1">
                  {opponentHand.map((card, i) => (
                    <div key={i} className={`aspect-[2/3] rounded border ${opponentSelectedCard?.tokenId === card.tokenId ? 'border-2 border-yellow-400 ring-2 ring-yellow-400' : 'border border-red-500/30'} overflow-hidden bg-black/50`}>
                      {/* Show card back for spectators, real cards for players */}
                      <img src={getCardBack(room?.cpuCollection)} alt="Hidden" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REGULAR GAME TABLE - POKER FELT DESIGN (for players AND spectators) */}
        {phase !== 'deck-building' && phase !== 'game-over' && (selectedAnte !== 0 || isSpectatorMode) && (
          <div className="h-full flex flex-col relative">

            {/* REMOVED - Round History Panel showing "ROUNDS" title with R1-R7 */}

            {/* Sound Panel - Collapsible on LEFT side */}
            <div className="absolute left-2 top-12 sm:top-14 z-20">
              {showSoundsPanel ? (
                <div className="bg-vintage-charcoal/95 border border-vintage-gold/30 rounded-lg p-1.5 shadow-lg">
                  <button
                    onClick={() => setShowSoundsPanel(false)}
                    className="w-full text-vintage-gold font-bold text-[9px] mb-1 text-center hover:text-vintage-burnt-gold"
                  >
                    SFX X
                  </button>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => playMemeSound('/let-him-cook-now.mp3', 'COOK', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Let Him Cook"
                    >
                      COOK
                    </button>
                    <button
                      onClick={() => playMemeSound('/nya_ZtXOXLx.mp3', 'NYA', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Nya~"
                    >
                      NYA
                    </button>
                    <button
                      onClick={() => playMemeSound('/quandale-dingle-meme.mp3', 'QD', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Quandale"
                    >
                      QD
                    </button>
                    <button
                      onClick={() => playMemeSound('/this-is-not-poker.mp3', 'NP', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Not Poker"
                    >
                      NP
                    </button>
                    <button
                      onClick={() => playMemeSound('/sounds/receba-luva.mp3', 'REC', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Receba"
                    >
                      REC
                    </button>
                    <button
                      onClick={() => playMemeSound('/sounds/dry-fart.mp3', 'FRT', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Fart"
                    >
                      FRT
                    </button>
                    <button
                      onClick={() => playMemeSound('/sounds/corteze.MP3', 'CTZ', '')}
                      className="bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 rounded text-[8px] text-vintage-ice p-1"
                      title="Corteze"
                    >
                      CTZ
                    </button>
                  </div>
                  {/* Voice Chat - PvP and Mecha Arena spectators */}
                  <VoiceChannelPanel
                    voiceState={groupVoice}
                    onJoinChannel={handleJoinVoice}
                    onLeaveChannel={groupVoice.leaveChannel}
                    onToggleMute={groupVoice.toggleMute}
                    onToggleUserMute={groupVoice.toggleUserMute}
                    onSetUserVolume={groupVoice.setUserVolume}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowSoundsPanel(true)}
                  className="bg-vintage-charcoal/95 border border-vintage-gold/30 rounded-lg px-2 py-1 shadow-lg hover:bg-vintage-gold/10 transition-all text-vintage-gold text-[10px] font-bold"
                  title="Open Sounds"
                >
                  SFX
                </button>
              )}
            </div>

            {/* Game info header */}
            <div className={`bg-vintage-charcoal border-b-2 border-vintage-gold/50 ${
              isInFarcaster
                ? 'p-1.5 flex flex-col gap-1 text-[11px]'
                : 'p-2 md:p-3 flex justify-between items-center text-sm md:text-base'
            }`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`text-vintage-gold font-display font-bold ${isInFarcaster ? 'text-[11px]' : ''}`}>
                  R{currentRound}/7 | {playerScore}-{opponentScore}
                </div>
                {(selectedAnte === 0 || isSpectatorMode) && (
                  <div className={`bg-vintage-gold/10 text-vintage-burnt-gold font-bold rounded border border-vintage-gold/30 flex items-center gap-1 ${
                    isInFarcaster ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-xs'
                  }`}>
                    <EyeIcon className="inline-block text-vintage-burnt-gold" size={isInFarcaster ? 12 : 14} /> SPEC
                  </div>
                )}
              </div>
              <div className={`text-vintage-gold font-display font-bold ${isInFarcaster ? 'text-sm' : 'text-lg'}`}>
                {isCPUMode ? (
                  getCollectionDisplayName(room?.cpuCollection)
                ) : (
                  `POT: ${pot} ${selectedToken}`
                )}
              </div>
              <div className={`text-vintage-burnt-gold font-bold ${isInFarcaster ? 'text-[10px]' : 'text-sm'}`}>
                Boost: {playerBoostCoins}
              </div>
            </div>

            {/* BATTLE TABLE - Vintage Dark Style */}
            <div
              className="flex-1 relative rounded-b-2xl overflow-hidden bg-gradient-to-b from-vintage-charcoal to-vintage-black"
            >
              {/* Border - vintage gold */}
              <div className="absolute inset-0 border-2 border-vintage-gold/30 rounded-b-2xl pointer-events-none" />

              {/* Table content */}
              <div className={`relative h-full flex flex-col justify-between ${
                isInFarcaster ? 'p-2' : 'p-4 md:p-6'
              }`}>

                {/* OPPONENT SECTION - Removed for cleaner UI in Mecha Arena */}

                {/* CENTER - CARD BATTLE AREA */}
                <div className="text-center flex-1 flex flex-col items-center justify-center">
                  {/* BATTLE CARDS - Always visible */}
                  <div className={`flex items-center justify-center mb-2 ${
                    isInFarcaster ? 'gap-2' : 'gap-3 sm:gap-6 mb-3'
                  }`}>
                    {/* Opponent Card */}
                    <div className="flex flex-col items-center">
                      <div className={`text-vintage-gold font-bold mb-1 ${
                        isInFarcaster ? 'text-[10px]' : 'text-xs sm:text-sm'
                      }`}>
                        <span className="max-w-[100px] truncate inline-block">{isSpectatorMode && room?.guestUsername ? room.guestUsername.toUpperCase() : 'OPPONENT'}</span>
                      </div>
                      <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all duration-700 ${
                        isInFarcaster ? 'w-20' : isSpectatorMode ? 'w-28 sm:w-32 md:w-36' : 'w-24 sm:w-28 md:w-32'
                      } ${
                        phase === 'card-reveal-animation' || phase === 'resolution'
                          ? 'border-vintage-gold shadow-lg shadow-vintage-gold/30'
                          : 'border-vintage-gold/30'
                      }`}>
                        {opponentSelectedCard && (phase === 'card-reveal-animation' || phase === 'resolution' || showRoundWinner) ? (
                          <div className={`relative w-full h-full ${isSpectator ? 'animate-[flip_0.6s_ease-out,glow_1.5s_ease-in-out_infinite]' : 'animate-in fade-in zoom-in duration-700'}`}>
                            <FoilCardEffect foilType={opponentSelectedCard.foil as 'Standard' | 'Prize' | null} className="w-full h-full">
                              {(opponentSelectedCard.imageUrl || opponentSelectedCard.image) ? (
                                <CardMedia
                                  src={convertIpfsUrl(opponentSelectedCard.imageUrl || opponentSelectedCard.image) || ''}
                                  alt={opponentSelectedCard.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center p-2"
                                  style={{ background: getRarityGradient(opponentSelectedCard.rarity) }}
                                >
                                  <div className="text-white text-xs font-bold text-center mb-1">{opponentSelectedCard.name}</div>
                                  <div className="text-white text-2xl font-bold">{Math.round(getDisplayPower(opponentSelectedCard)).toLocaleString()}</div>
                                </div>
                              )}
                            </FoilCardEffect>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold text-center">
                              <div className="flex items-center justify-center gap-1">
                                {Math.round(getDisplayPower(opponentSelectedCard) * (
                                  opponentAction === 'BOOST' ? 1.3 :
                                  opponentAction === 'DOUBLE' ? 2 : 1
                                )).toLocaleString()}
                                {opponentAction === 'BOOST' && <SwordIcon className="inline-block text-yellow-400 animate-pulse" size={14} />}
                                {opponentAction === 'DOUBLE' && <BoltIcon className="inline-block text-red-400 animate-pulse" size={14} />}
                                {opponentAction === 'SHIELD' && <ShieldIcon className="inline-block text-blue-400 animate-pulse" size={14} />}
                              </div>
                            </div>
                          </div>
                        ) : opponentSelectedCard ? (
                          <img
                            src={getCardBack(room?.cpuCollection)}
                            alt="Hidden Card"
                            className="w-full h-full object-cover animate-pulse"
                          />
                        ) : (
                          <div className="w-full h-full bg-vintage-deep-black/30 border-2 border-dashed border-vintage-gold/30 flex items-center justify-center">
                            <span className="text-vintage-gold text-4xl animate-pulse">?</span>
                          </div>
                        )}
                      </div>
                      {opponentAction && opponentAction !== 'PASS' && (phase === 'card-reveal-animation' || phase === 'resolution') && (
                        <div className={`mt-2 bg-red-900/50 border border-red-700 px-3 py-1 rounded animate-in slide-in-from-top duration-500 ${isSpectator ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                          <span className="text-red-300 text-xs font-bold flex items-center justify-center gap-1">
                            {opponentAction === 'BOOST' && <><SwordIcon className="inline-block text-yellow-400" size={12} /> BOOST</>}
                            {opponentAction === 'SHIELD' && <><ShieldIcon className="inline-block text-blue-400" size={12} /> SHIELD</>}
                            {opponentAction === 'DOUBLE' && <><BoltIcon className="inline-block text-red-400" size={12} /> CRIT</>}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* VS Indicator */}
                    <div className={`text-vintage-gold font-display font-bold animate-pulse ${
                      isInFarcaster ? 'text-xl' : 'text-2xl sm:text-4xl'
                    }`}>
                      VS
                    </div>

                    {/* Player Card */}
                    <div className="flex flex-col items-center">
                      <div className={`text-vintage-gold font-bold mb-1 ${
                        isInFarcaster ? 'text-[10px]' : 'text-xs sm:text-sm mb-2'
                      }`}>
                        <span className="max-w-[100px] truncate inline-block">{isSpectatorMode && room?.hostUsername ? room.hostUsername.toUpperCase() : 'YOU'}</span>
                      </div>
                      <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all duration-700 ${
                        isInFarcaster ? 'w-20' : isSpectatorMode ? 'w-28 sm:w-32 md:w-36' : 'w-32 sm:w-40 md:w-48'
                      } ${
                        phase === 'card-reveal-animation' || phase === 'resolution'
                          ? 'border-vintage-gold shadow-lg shadow-vintage-gold/30'
                          : 'border-vintage-gold/30'
                      }`}>
                        {playerSelectedCard && (phase === 'card-reveal-animation' || phase === 'resolution' || showRoundWinner) ? (
                          <div className={`relative w-full h-full ${isSpectator ? 'animate-[flip_0.6s_ease-out,glow_1.5s_ease-in-out_infinite]' : 'animate-in fade-in zoom-in duration-700'}`}>
                            <FoilCardEffect foilType={playerSelectedCard.foil as 'Standard' | 'Prize' | null} className="w-full h-full">
                              {(playerSelectedCard.imageUrl || playerSelectedCard.image) ? (
                                <CardMedia
                                  src={convertIpfsUrl(playerSelectedCard.imageUrl || playerSelectedCard.image) || ''}
                                  alt={playerSelectedCard.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center p-2"
                                  style={{ background: getRarityGradient(playerSelectedCard.rarity) }}
                                >
                                  <div className="text-white text-xs font-bold text-center mb-1">{playerSelectedCard.name}</div>
                                  <div className="text-white text-2xl font-bold">{Math.round(getDisplayPower(playerSelectedCard)).toLocaleString()}</div>
                                </div>
                              )}
                            </FoilCardEffect>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold text-center">
                              <div className="flex items-center justify-center gap-1">
                                {Math.round(getDisplayPower(playerSelectedCard) * (
                                  playerAction === 'BOOST' ? 1.3 :
                                  playerAction === 'DOUBLE' ? 2 : 1
                                )).toLocaleString()}
                                {playerAction === 'BOOST' && <SwordIcon className="inline-block text-yellow-400 animate-pulse" size={14} />}
                                {playerAction === 'DOUBLE' && <BoltIcon className="inline-block text-red-400 animate-pulse" size={14} />}
                                {playerAction === 'SHIELD' && <ShieldIcon className="inline-block text-blue-400 animate-pulse" size={14} />}
                              </div>
                            </div>
                          </div>
                        ) : playerSelectedCard ? (
                          <img
                            src={getCardBack(room?.cpuCollection)}
                            alt="Hidden Card"
                            className="w-full h-full object-cover animate-pulse"
                          />
                        ) : (
                          <div className="w-full h-full bg-vintage-deep-black/30 border-2 border-dashed border-vintage-gold/30 flex items-center justify-center">
                            <span className="text-vintage-gold text-4xl animate-pulse">?</span>
                          </div>
                        )}
                      </div>
                      {playerAction && playerAction !== 'PASS' && (phase === 'card-reveal-animation' || phase === 'resolution') && (
                        <div className="mt-2 bg-green-900/50 border border-green-700 px-3 py-1 rounded animate-in slide-in-from-top duration-500">
                          <span className="text-green-300 text-xs font-bold flex items-center justify-center gap-1">
                            {playerAction === 'BOOST' && <><SwordIcon className="inline-block text-yellow-400" size={12} /> BOOST</>}
                            {playerAction === 'SHIELD' && <><ShieldIcon className="inline-block text-blue-400" size={12} /> SHIELD</>}
                            {playerAction === 'DOUBLE' && <><BoltIcon className="inline-block text-red-400" size={12} /> CRIT</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timer Display */}
                  {(phase === 'card-selection' || phase === 'reveal') && (
                    <div className="mt-2 sm:mt-3">
                      <div className={`inline-block px-3 sm:px-6 py-1 sm:py-2 rounded-lg border-2 transition-all ${
                        timeRemaining === 0 && phase === 'card-selection'
                          ? 'bg-purple-900/50 border-purple-500 animate-pulse'
                          : timeRemaining <= 5
                          ? 'bg-red-900/50 border-red-500 animate-pulse'
                          : timeRemaining <= 10
                          ? 'bg-yellow-900/50 border-yellow-500'
                          : 'bg-vintage-deep-black/50 border-vintage-gold'
                      }`}>
                        <div className={`font-display font-bold text-lg sm:text-2xl ${
                          timeRemaining === 0 && phase === 'card-selection'
                            ? 'text-purple-300'
                            : timeRemaining <= 5
                            ? 'text-red-300'
                            : timeRemaining <= 10
                            ? 'text-yellow-300'
                            : 'text-vintage-gold'
                        }`}>
                          {timeRemaining === 0 && phase === 'card-selection' ? (
                            <>REVEALING...</>
                          ) : (
                            <><ClockIcon className="inline-block" size={24} /> {timeRemaining}s</>
                          )}
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
                            {isInFarcaster ? 'WAITING...' : 'WAITING FOR OPPONENT TO SELECT CARD...'}
                          </span>
                        )}
                        {phase === 'card-selection' && (isCPUMode || !playerSelectedCard) && (
                          isInFarcaster ? 'SELECT CARD' : 'SELECT A CARD FROM YOUR HAND'
                        )}

                        {phase === 'reveal' && !isCPUMode && playerAction && !opponentAction && (
                          <span className="animate-pulse">
                            {isInFarcaster ? 'WAITING...' : 'WAITING FOR OPPONENT TO CHOOSE ACTION...'}
                          </span>
                        )}
                        {phase === 'reveal' && (isCPUMode || !playerAction) && (
                          <span className="flex items-center justify-center gap-2">
                            <SwordIcon className="inline-block text-vintage-gold" size={20} />
                            {isInFarcaster ? 'CHOOSE ACTION' : 'CHOOSE YOUR ACTION'}
                          </span>
                        )}

                        {phase === 'card-reveal-animation' && (
                          <span className="animate-pulse text-xl sm:text-2xl">
                            REVEALING CARDS...
                          </span>
                        )}

                        {phase === 'resolution' && (
                          <span className="animate-pulse">
                            {isInFarcaster ? 'CALCULATING...' : 'CALCULATING WINNER...'}
                          </span>
                        )}
                      </div>
                    </div>
                    {phase === 'resolution' && playerSelectedCard && opponentSelectedCard && (
                      <div className="mt-3 text-vintage-burnt-gold font-modern text-sm">
                        Your card: {playerSelectedCard.name} ({Math.round(getDisplayPower(playerSelectedCard)).toLocaleString()})
                        <br/>
                        vs Opponent: {opponentSelectedCard.name} ({Math.round(getDisplayPower(opponentSelectedCard)).toLocaleString()})
                      </div>
                    )}
                  </div>
                </div>

                {/* PLAYER SECTION - YOUR HAND */}
                <div className="text-center">
                  {!isSpectatorMode && (
                    <div className="text-vintage-gold font-display font-bold mb-2 text-sm">
                      YOUR HAND
                    </div>
                  )}

                  {/* Hand cards - Hidden for spectators */}
                  <div className="flex justify-center gap-1 sm:gap-2 mb-2">
                    {playerHand.map((card, index) => (
                      <button
                        key={`player-hand-${index}-${card.tokenId}`}
                        onClick={() => phase === 'card-selection' && !showRoundWinner && selectCard(card)}
                        disabled={phase !== 'card-selection' || selectedAnte === 0 || isSpectatorMode || showRoundWinner}
                        style={{ animationDelay: `${index * 100}ms` }}
                        className={`${isInFarcaster ? 'w-14' : 'w-16 sm:w-20'} aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                          playerSelectedCard?.tokenId === card.tokenId
                            ? 'border-vintage-gold shadow-gold scale-110 -translate-y-2'
                            : 'border-vintage-gold/50 hover:border-vintage-gold hover:scale-105 hover:-translate-y-1'
                        } ${phase !== 'card-selection' || selectedAnte === 0 || isSpectatorMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                      >
                        {isSpectatorMode ? (
                          // Show card back for spectators (collection-specific)
                          <img src={getCardBack(room?.cpuCollection)} alt="Hidden" className="w-full h-full object-cover" />
                        ) : (
                          <FoilCardEffect foilType={card.foil as 'Standard' | 'Prize' | null} className="w-full h-full">
                            {(card.imageUrl || card.image) ? (
                              <CardMedia
                                src={convertIpfsUrl(card.imageUrl || card.image) || ''}
                                alt={card.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex flex-col items-center justify-center p-1"
                                style={{ background: getRarityGradient(card.rarity) }}
                              >
                                <div className="text-white text-[0.5rem] font-bold text-center mb-1">{card.name}</div>
                                <div className="text-white text-sm font-bold">{Math.round(getDisplayPower(card)).toLocaleString()}</div>
                              </div>
                            )}
                          </FoilCardEffect>
                        )}
                        {!isSpectatorMode && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-vintage-gold font-bold transition-colors">
                            {Math.round(getDisplayPower(card)).toLocaleString()}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>


                  {phase === 'reveal' && !isSpectatorMode && selectedAnte !== 0 && (
                    <div className={`animate-in fade-in slide-in-from-bottom duration-500 w-full mx-auto ${
                      isInFarcaster ? 'space-y-1' : 'space-y-1 sm:space-y-2 max-w-md'
                    }`}>
                      <div className={`text-center text-vintage-burnt-gold font-bold mb-1 ${
                        isInFarcaster ? 'text-[10px]' : 'text-xs sm:text-sm'
                      }`}>
                        BOOST SHOP - {playerBoostCoins}
                      </div>
                      {/* Mobile/Farcaster: 2x2 Grid, Desktop: 4 buttons in row */}
                      <div className={`grid gap-1 ${
                        isInFarcaster ? 'grid-cols-2' : 'grid-cols-2 md:flex md:justify-center sm:gap-2'
                      }`}>
                        <button
                          onClick={() => showConfirmAction('BOOST')}
                          disabled={selectedAnte === 0 || isSpectatorMode || playerBoostCoins < getBoostPrice('BOOST')}
                          className={`font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            isInFarcaster ? 'px-2 py-2 min-h-[60px]' : 'px-2 sm:px-4 py-1 sm:py-2'
                          } ${
                            playerBoostCoins >= getBoostPrice('BOOST') && selectedAnte !== 0 && !isSpectatorMode
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <SwordIcon className={playerBoostCoins >= getBoostPrice('BOOST') && selectedAnte !== 0 && !isSpectatorMode ? "text-black" : "text-gray-500"} size={isInFarcaster ? 20 : 24} />
                          <div className={`font-bold ${isInFarcaster ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{t('boostLabel')}</div>
                          <span className={isInFarcaster ? 'text-[8px]' : 'text-[8px] sm:text-[10px]'}>+30%</span>
                          <span className={`opacity-80 ${isInFarcaster ? 'text-[7px]' : 'text-[7px] sm:text-[9px]'}`}>{getBoostPrice('BOOST')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('SHIELD')}
                          disabled={selectedAnte === 0 || isSpectatorMode || playerBoostCoins < getBoostPrice('SHIELD')}
                          className={`font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            isInFarcaster ? 'px-2 py-2 min-h-[60px]' : 'px-2 sm:px-4 py-1 sm:py-2'
                          } ${
                            playerBoostCoins >= getBoostPrice('SHIELD') && selectedAnte !== 0 && !isSpectatorMode
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <ShieldIcon className={playerBoostCoins >= getBoostPrice('SHIELD') && selectedAnte !== 0 && !isSpectatorMode ? "text-white" : "text-gray-500"} size={isInFarcaster ? 20 : 24} />
                          <div className={`font-bold ${isInFarcaster ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{t('shieldLabel')}</div>
                          <span className={isInFarcaster ? 'text-[8px]' : 'text-[8px] sm:text-[10px]'}>{t('blockLabel')}</span>
                          <span className={`opacity-80 ${isInFarcaster ? 'text-[7px]' : 'text-[7px] sm:text-[9px]'}`}>{getBoostPrice('SHIELD')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('DOUBLE')}
                          disabled={selectedAnte === 0 || isSpectatorMode || playerBoostCoins < getBoostPrice('DOUBLE')}
                          className={`font-bold rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex flex-col items-center justify-center ${
                            isInFarcaster ? 'px-2 py-2 min-h-[60px]' : 'px-2 sm:px-4 py-1 sm:py-2'
                          } ${
                            playerBoostCoins >= getBoostPrice('DOUBLE') && selectedAnte !== 0 && !isSpectatorMode
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <BoltIcon className={playerBoostCoins >= getBoostPrice('DOUBLE') && selectedAnte !== 0 && !isSpectatorMode ? "text-white" : "text-gray-500"} size={isInFarcaster ? 20 : 24} />
                          <div className={`font-bold ${isInFarcaster ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{t('critLabel')}</div>
                          <span className={isInFarcaster ? 'text-[8px]' : 'text-[8px] sm:text-[10px]'}>x2</span>
                          <span className={`opacity-80 ${isInFarcaster ? 'text-[7px]' : 'text-[7px] sm:text-[9px]'}`}>{getBoostPrice('DOUBLE')}</span>
                        </button>

                        <button
                          onClick={() => showConfirmAction('PASS')}
                          disabled={selectedAnte === 0 || isSpectatorMode}
                          className={`bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center ${
                            isInFarcaster ? 'px-2 py-2 min-h-[60px]' : 'px-2 sm:px-4 py-1 sm:py-2'
                          }`}
                        >
                          <HandIcon className={selectedAnte === 0 || isSpectatorMode ? "text-gray-500" : "text-white"} size={isInFarcaster ? 20 : 24} />
                          <div className={`font-bold ${isInFarcaster ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{t('passLabel')}</div>
                          <span className={isInFarcaster ? 'text-[8px]' : 'text-[8px] sm:text-[10px]'}>{t('freeLabel')}</span>
                          <span className={`opacity-80 ${isInFarcaster ? 'text-[7px]' : 'text-[7px] sm:text-[9px]'}`}>{t('saveCoinsLabel')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

        {/* SPECTATOR SCREEN - Shows game result for spectators */}
        {phase === 'game-over' && gameOverShown && isSpectatorMode && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[400]">
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-xl border-2 border-vintage-gold/50 p-6 text-center shadow-2xl max-w-md mx-4">
              <h2 className="text-2xl font-display font-bold text-vintage-gold mb-4">
                GAME OVER
              </h2>

              {/* Score Display */}
              <div className="bg-vintage-black/50 rounded-lg p-4 mb-4 border border-vintage-gold/30">
                <p className="text-sm text-vintage-burnt-gold mb-3">Final Score</p>
                <div className="flex justify-center items-center gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-vintage-ice/50 mb-1 max-w-[100px] truncate">{room?.hostUsername || 'Player 1'}</p>
                    <p className={`text-3xl font-bold ${playerScore > opponentScore ? 'text-vintage-gold' : 'text-vintage-ice/70'}`}>
                      {playerScore}
                    </p>
                  </div>
                  <span className="text-xl text-vintage-gold/50">-</span>
                  <div className="text-center">
                    <p className="text-xs text-vintage-ice/50 mb-1 max-w-[100px] truncate">{room?.guestUsername || 'Player 2'}</p>
                    <p className={`text-3xl font-bold ${opponentScore > playerScore ? 'text-vintage-gold' : 'text-vintage-ice/70'}`}>
                      {opponentScore}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-vintage-gold">
                  {playerScore > opponentScore ? `${room?.hostUsername || 'Player 1'} Wins` : playerScore < opponentScore ? `${room?.guestUsername || 'Player 2'} Wins` : "Tie"}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* ROUND WINNER ANNOUNCEMENT - Semi-transparent overlay positioned at top */}
        {/* Hide for spectators - they have their own bet feedback */}
        {showRoundWinner && roundWinner && !isSpectatorMode && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-start justify-center pt-12 z-[100] animate-in fade-in duration-300 pointer-events-none">
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
                {/* Floating Chat Messages on Table */}
        {!isCPUMode && currentView === 'game' && roomId && floatingMessages.length > 0 && (
          <div className="fixed bottom-24 right-24 z-[240] space-y-2 pointer-events-none">
            {floatingMessages.map((msg) => (
              <div
                key={msg.id}
                className="animate-in slide-in-from-right duration-300 pointer-events-auto"
              >
                <div className={`px-4 py-2 rounded-xl shadow-2xl border-2 max-w-xs ${
                  msg.isOwnMessage
                    ? 'bg-vintage-gold text-vintage-black border-vintage-gold'
                    : 'bg-vintage-charcoal/95 text-vintage-gold border-vintage-gold/50'
                }`}>
                  <div className="text-xs font-bold mb-1 opacity-70">{msg.sender}</div>
                  <div className="text-sm">{msg.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Emojis - Like a live stream */}
        {currentView === 'game' && floatingEmojis.length > 0 && (
          <div className="fixed inset-0 z-[235] pointer-events-none">
            {floatingEmojis.map((emoji) => (
              <div
                key={emoji.id}
                className="absolute animate-[float-up_3s_ease-out_forwards]"
                style={{
                  left: `${emoji.x}%`,
                  top: `${emoji.y}%`,
                  fontSize: '4rem',
                  textShadow: '0 0 10px rgba(0,0,0,0.5)',
                }}
              >
                {emoji.emoji}
              </div>
            ))}
          </div>
        )}

        {!isCPUMode && currentView === 'game' && roomId && (
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
                    messages.map((msg: any, idx: number) => {
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
                      No messages yet. Say hi!
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

      {/* Spectator Entry Modal */}
      {showSpectatorEntryModal && (
        <SpectatorEntryModal
          isOpen={showSpectatorEntryModal}
          onClose={() => setShowSpectatorEntryModal(false)}
          onSuccess={(credits) => {
            console.log(`🎰 Received ${credits} betting credits`);
            setSpectatorType('betting');
            setHasBettingCredits(true);
            setShowSpectatorEntryModal(false);
          }}
          onJoinFree={() => {
            console.log('👁️ Joined as free spectator');
            setSpectatorType('free');
            setIsSpectatorMode(true);
            setHasBettingCredits(true); // Set to true to prevent modal from reopening
            setShowSpectatorEntryModal(false);
          }}
          battleId={roomId}
          playerAddress={playerAddress}
        />
      )}

      {/* Incoming Voice Call Modal - "John Pork is calling" */}
      {showIncomingCall && !groupVoice.isInChannel && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[500] p-4">
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-3xl border-2 border-vintage-gold/50 max-w-sm w-full p-6 shadow-2xl shadow-vintage-gold/20">
            {/* John Pork Profile Picture */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-4 border-vintage-gold overflow-hidden animate-pulse shadow-lg shadow-vintage-gold/50">
                  <img
                    src="/john-pork.jpg"
                    alt="John Pork"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Ringing indicator */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-vintage-gold rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-lg text-vintage-black font-bold">!</span>
                </div>
              </div>
            </div>

            {/* Caller Info */}
            <div className="text-center mb-6">
              <p className="text-vintage-burnt-gold text-sm mb-1">incoming call...</p>
              <h2 className="text-2xl font-display font-bold text-vintage-gold mb-1">
                {incomingCaller?.username || 'Someone'}
              </h2>
              <p className="text-vintage-ice text-sm font-medium">
                wants to voice chat
              </p>
            </div>

            {/* Accept/Reject Buttons */}
            <div className="flex justify-center gap-16">
              <button
                onClick={handleRejectCall}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-red-500/30">
                  <CloseIcon className="text-white" size={28} />
                </div>
                <span className="text-red-400 text-xs font-medium">Decline</span>
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 bg-vintage-gold hover:bg-vintage-burnt-gold rounded-full flex items-center justify-center transition-all hover:scale-110 animate-pulse shadow-lg shadow-vintage-gold/30">
                  <span className="text-vintage-black font-bold text-xl">OK</span>
                </div>
                <span className="text-vintage-gold text-xs font-medium">Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Betting Overlay - Restored without R{round}/7 display */}
      {isSpectatorMode && spectatorType === 'betting' && hasBettingCredits && room &&
       (phase === 'card-selection' || phase === 'reveal') && (
        <SimpleBettingOverlay
          roomId={roomId}
          currentRound={currentRound}
          player1Address={room.guestAddress || ''}
          player1Username={room.guestUsername || 'Player 1'}
          player2Address={room.hostAddress || ''}
          player2Username={room.hostUsername || 'Player 2'}
          spectatorAddress={playerAddress || ''}
          cpuCollection={room?.cpuCollection}
          onBetPlaced={() => {
            console.log('✅ Bet placed successfully!');
          }}
        />
      )}

      {/* Spectator Bet Feedback - History panel + win/loss animations */}
      {isSpectatorMode && spectatorType === 'betting' && hasBettingCredits && room && (
        <SpectatorBetFeedback
          roomId={roomId}
          spectatorAddress={playerAddress || ''}
          currentRound={currentRound}
          lastRoundWinner={lastRoundWinnerAddress}
          showResultAnimation={showBetResult}
        />
      )}

      {/* Exit Confirmation Modal for Spectators */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[300] animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-4 border-vintage-gold p-6 text-center shadow-2xl max-w-md mx-4 animate-in zoom-in duration-300">
            <div className="text-5xl mb-4 text-vintage-gold font-bold">$</div>
            <h3 className="text-2xl font-display font-bold text-vintage-gold mb-4">
              Exit CPU Arena?
            </h3>
            <div className="mb-6 space-y-3">
              <p className="text-vintage-ice text-lg">
                You have <span className="text-yellow-400 font-bold">{bettingCreditsData?.balance || 0}</span> betting credits
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm">
                  If you leave, your credits will be converted to <span className="font-bold">TESTVBMS</span> and added to your balance.
                </p>
              </div>
              {room?.isCpuVsCpu && room?.spectators?.length === 1 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-orange-300 text-sm">
                    Warning: You are the last spectator. The CPU Arena room will be closed.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowExitConfirmation(false)}
                disabled={isLeaving}
                className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExit}
                disabled={isLeaving}
                className="px-6 py-3 bg-gradient-to-br from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isLeaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Leaving...
                  </>
                ) : (
                  <>Exit & Convert</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Spectator Badge - Show if watching for free */}
      {isSpectatorMode && spectatorType === 'free' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-vintage-charcoal/90 backdrop-blur-md border border-vintage-gold/50 rounded-lg px-3 py-1.5">
          <p className="text-vintage-gold text-xs font-bold">
            Free Viewer
          </p>
        </div>
      )}

      {/* Spectator Betting Result (Mecha Arena) - Now uses GamePopups based on profit/loss */}
      {/* Victory: netGain > 0, Loss: netGain < 0, Tie: netGain = 0 */}

      {/* Game result popups - Victory/Defeat/Tie */}
      <GamePopups
        showWinPopup={showWinPopup}
        currentVictoryImage={currentVictoryImage}
        isInFarcaster={isInFarcaster}
        lastBattleResult={lastBattleResult}
        userProfile={null}
        soundEnabled={soundEnabled}
        handleCloseVictoryScreen={handleCloseVictoryScreen}
        showLossPopup={showLossPopup}
        handleCloseDefeatScreen={handleCloseDefeatScreen}
        showTiePopup={showTiePopup}
        setShowTiePopup={setShowTiePopup}
        tieGifLoaded={false}
        errorMessage={null}
        setErrorMessage={() => {}}
        successMessage={null}
        setSuccessMessage={() => {}}
        showDailyClaimPopup={false}
        setShowDailyClaimPopup={() => {}}
        loginBonusClaimed={false}
        isClaimingBonus={false}
        handleClaimLoginBonus={() => {}}
        showWelcomePackPopup={false}
        setShowWelcomePackPopup={() => {}}
        isClaimingWelcomePack={false}
        handleClaimWelcomePack={() => {}}
        t={(key: string) => key} // Simple mock translation
      />

      {/* Custom animations for spectator mode */}
      <style jsx>{`
        @keyframes flip {
          0% {
            transform: rotateY(90deg) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: rotateY(45deg) scale(1.05);
          }
          100% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.9));
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
