/**
 * PvP Menu Modals Component
 *
 * Handles all PvP menu screens:
 * - Game mode selection (PvE vs PvP)
 * - PvP menu (Auto-match, Create Room, Join Room)
 * - Mode selection (Casual vs Ranked)
 * - Auto-match searching
 * - Create room (code display)
 * - Join room (code input)
 */

import { Dispatch, SetStateAction } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { ConvexPvPService } from '@/lib/convex-pvp';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UnlockedDifficulties {
  has: (difficulty: string) => boolean;
}

interface PlayerEconomy {
  coins: number;
}

interface UserProfile {
  username?: string;
}

type PvPModeType = 'createRoom' | 'joinRoom' | 'selectMode' | 'autoMatch' | 'menu' | 'pvpMenu' | 'inRoom' | null;

interface PvPMenuModalsProps {
  // State
  pvpMode: PvPModeType;
  roomCode: string;
  isSearching: boolean;
  selectedRoomMode: 'casual' | 'ranked';
  aiDifficulty: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad';
  unlockedDifficulties: UnlockedDifficulties;
  playerEconomy: PlayerEconomy | null | undefined;
  userProfile: UserProfile | null | undefined;
  address: string | undefined;
  soundEnabled: boolean;

  // Setters
  setPvpMode: Dispatch<SetStateAction<PvPModeType>>;
  setRoomCode: Dispatch<SetStateAction<string>>;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  setSelectedRoomMode: Dispatch<SetStateAction<'casual' | 'ranked'>>;
  setGameMode: Dispatch<SetStateAction<'ai' | 'pvp' | null>>;
  setShowPveCardSelection: Dispatch<SetStateAction<boolean>>;
  setPveSelectedCards: Dispatch<SetStateAction<any[]>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setIsDifficultyModalOpen: Dispatch<SetStateAction<boolean>>;
  setShowEntryFeeModal: Dispatch<SetStateAction<boolean>>;

  // Translation function
  t: any;
}

export function PvPMenuModals({
  pvpMode,
  roomCode,
  isSearching,
  selectedRoomMode,
  aiDifficulty,
  unlockedDifficulties,
  playerEconomy,
  userProfile,
  address,
  soundEnabled,
  setPvpMode,
  setRoomCode,
  setIsSearching,
  setSelectedRoomMode,
  setGameMode,
  setShowPveCardSelection,
  setPveSelectedCards,
  setErrorMessage,
  setIsDifficultyModalOpen,
  setShowEntryFeeModal,
  t,
}: PvPMenuModalsProps) {
  // Check if player has a valid entry fee
  const entryFeeCheck = useQuery(
    api.pvp.checkEntryFee,
    address ? { address } : "skip"
  );

  // Modal de Seleção de Modo de Jogo (PvE vs PvP)
  if (pvpMode === 'menu') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setPvpMode(null)}>
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
            {t('selectMode') || 'SELECT MODE'}
          </h2>
          <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
            {t('chooseBattleMode') || 'CHOOSE YOUR BATTLE MODE'}
          </p>

          <div className="space-y-4">
            {/* Jogar vs IA */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonSuccess();
                setPvpMode(null);
                setShowPveCardSelection(true);
                setPveSelectedCards([]);
              }}
              className="w-full px-6 py-4 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-display font-bold text-lg shadow-neon transition-all hover:scale-105"
            >
              ♣ {t('playVsAI')}
            </button>

            {/* Jogar vs Jogador */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                setGameMode('pvp');
                setPvpMode('pvpMenu');
              }}
              className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-lg shadow-gold transition-all hover:scale-105"
            >
              ♥ {t('playVsPlayer')}
            </button>

            {/* Cancelar */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonNav();
                setPvpMode(null);
                setGameMode(null);
              }}
              className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de Menu PvP
  if (pvpMode === 'pvpMenu') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setPvpMode(null)}>
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
            {t('pvp')}
          </h2>
          <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
            {t('choosePvpMode') || 'CHOOSE HOW TO FIND OPPONENT'}
          </p>

          <div className="space-y-4">
            {/* Busca Automática */}
            <button
              disabled={isSearching}
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonSuccess();

                // Check if player has a valid entry fee
                if (!entryFeeCheck?.hasEntryFee) {
                  setShowEntryFeeModal(true);
                  setPvpMode(null); // Close this modal
                  if (soundEnabled) AudioManager.buttonError();
                  return;
                }

                setPvpMode('autoMatch');
                setIsSearching(true);
                try {
                  // Entry fee will be used when battle actually starts (both players ready)
                  const code = await ConvexPvPService.findMatch(address || '', userProfile?.username);
                  if (code) {
                    // Encontrou uma sala imediatamente
                    setRoomCode(code);
                    setPvpMode('inRoom');
                    setIsSearching(false);
                  }
                  // Se não encontrou (code === ''), continua em autoMatch aguardando
                } catch (error: any) {
                  setErrorMessage('Error finding match: ' + error.message);
                  setIsSearching(false);
                  setPvpMode('pvpMenu');
                }
              }}
              className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-lg shadow-gold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center justify-between">
                <span>◊ {t('autoMatch')}</span>
                <span className="text-sm font-modern bg-vintage-black/30 px-2 py-1 rounded">20 VBMS</span>
              </div>
            </button>

            {/* Criar Sala */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                // Show mode selection screen
                setPvpMode('selectMode');
              }}
              className="w-full px-6 py-4 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-display font-bold text-lg shadow-neon transition-all hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <span>＋ {t('createRoom')}</span>
                <span className="text-sm font-modern bg-vintage-black/30 px-2 py-1 rounded">Free / Ranked</span>
              </div>
            </button>

            {/* Entrar na Sala */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                setPvpMode('joinRoom');
              }}
              className="w-full px-6 py-4 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-display font-bold text-lg shadow-lg transition-all hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <span>→ {t('joinRoom')}</span>
                <span className="text-sm font-modern bg-vintage-black/30 px-2 py-1 rounded">20 VBMS</span>
              </div>
            </button>

            {/* Voltar */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonNav();
                setPvpMode(null);
                setGameMode(null);
              }}
              className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
            >
              ← {t('back') || 'BACK'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de Seleção de Modo (Casual vs Ranked)
  if (pvpMode === 'selectMode') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4" onClick={() => setPvpMode('pvpMenu')}>
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-3xl font-display font-bold text-center mb-2 text-vintage-gold">
            {t('createRoom')}
          </h2>
          <p className="text-center text-vintage-burnt-gold mb-8 text-sm font-modern">
            CHOOSE MATCH TYPE
          </p>

          <div className="space-y-4">
            {/* Casual Mode - Free */}
            <button
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonClick();
                setSelectedRoomMode('casual');

                try {
                  // Remove from matchmaking before creating manual room
                  await ConvexPvPService.cancelMatchmaking(address || '');
                  const code = await ConvexPvPService.createRoom(address || '', userProfile?.username, 'casual');
                  setRoomCode(code);
                  setPvpMode('createRoom');
                } catch (error: any) {
                  setErrorMessage('Error creating room: ' + error.message);
                  if (soundEnabled) AudioManager.buttonError();
                }
              }}
              className="w-full px-6 py-4 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-display font-bold text-lg shadow-neon transition-all hover:scale-105"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center justify-between w-full mb-2">
                  <span>🎮 CASUAL</span>
                  <span className="text-sm font-modern bg-green-500/30 px-3 py-1 rounded">FREE</span>
                </div>
                <p className="text-xs text-left text-vintage-black/70 font-modern">
                  Just for fun • No coins required • No rewards
                </p>
              </div>
            </button>

            {/* Ranked Mode - 20 VBMS */}
            <button
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonClick();

                // Check if player has a valid entry fee
                if (!entryFeeCheck?.hasEntryFee) {
                  setShowEntryFeeModal(true);
                  setPvpMode(null); // Close this modal
                  if (soundEnabled) AudioManager.buttonError();
                  return;
                }

                setSelectedRoomMode('ranked');

                try {
                  // Entry fee will be used when battle actually starts (both players ready)
                  // Remove from matchmaking before creating manual room
                  await ConvexPvPService.cancelMatchmaking(address || '');
                  const code = await ConvexPvPService.createRoom(address || '', userProfile?.username, 'ranked');
                  setRoomCode(code);
                  setPvpMode('createRoom');
                } catch (error: any) {
                  setErrorMessage('Error creating room: ' + error.message);
                  if (soundEnabled) AudioManager.buttonError();
                }
              }}
              className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-lg shadow-gold transition-all hover:scale-105"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center justify-between w-full mb-2">
                  <span>⚔️ RANKED</span>
                  <span className="text-sm font-modern bg-vintage-black/30 px-3 py-1 rounded">20 VBMS</span>
                </div>
                <p className="text-xs text-left text-vintage-black/70 font-modern">
                  Competitive • Entry fee • Win VBMS in inbox
                </p>
              </div>
            </button>

            {/* Voltar */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonNav();
                setPvpMode('pvpMenu');
              }}
              className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
            >
              ← {t('back') || 'BACK'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de Busca Automática
  if (pvpMode === 'autoMatch' && isSearching && !roomCode) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-md w-full p-8 shadow-gold">
          <div className="text-center">
            <div className="mb-6">
              <LoadingSpinner size="xl" variant="gold" />
            </div>
            <h2 className="text-2xl font-display font-bold text-vintage-gold mb-2">
              {t('searching')}
            </h2>
            <p className="text-vintage-burnt-gold mb-8 font-modern">
              {t('waitingForOpponent')}
            </p>
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonError();
                setIsSearching(false);
                setPvpMode('pvpMenu');
                ConvexPvPService.cancelMatchmaking(address || '');
              }}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition"
            >
              {t('cancelSearch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de Criar Sala
  if (pvpMode === 'createRoom' && roomCode) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-neon-blue max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-center text-blue-400 mb-2">
            {t('roomCreated')}
          </h2>
          <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
            {t('shareCode')}
          </p>

          <div className="bg-vintage-charcoal rounded-xl p-6 mb-6 border-2 border-vintage-gold shadow-gold">
            <p className="text-vintage-burnt-gold text-sm mb-2 text-center font-modern">{t('roomCode')}</p>
            <p className="text-4xl font-bold text-center text-vintage-neon-blue tracking-wider font-display">
              {roomCode}
            </p>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonSuccess();
              navigator.clipboard.writeText(roomCode);
            }}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold mb-4 transition"
          >
            ◊ {t('copyCode')}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              setPvpMode('inRoom');
            }}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold mb-2 transition"
          >
            ✓ {t('ready') || 'Ready'}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              setPvpMode('pvpMenu');
              setRoomCode('');
              ConvexPvPService.leaveRoom(roomCode, address || '');
            }}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Modal de Entrar na Sala
  if (pvpMode === 'joinRoom') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-gold max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-center text-vintage-gold mb-2">
            {t('joinRoom')}
          </h2>
          <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
            {t('enterRoomCode')}
          </p>

          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold rounded-xl text-center text-2xl font-bold text-vintage-neon-blue tracking-wider mb-6 focus:outline-none focus:ring-2 focus:ring-vintage-gold font-display shadow-gold"
          />

          <button
            onClick={async () => {
              if (soundEnabled) AudioManager.buttonClick();

              // Check if player has a valid entry fee
              if (!entryFeeCheck?.hasEntryFee) {
                setShowEntryFeeModal(true);
                setPvpMode(null); // Close this modal
                if (soundEnabled) AudioManager.buttonError();
                return;
              }

              try {
                // Entry fee will be used when battle actually starts (both players ready)
                // Remove do matchmaking antes de entrar em sala manual
                await ConvexPvPService.cancelMatchmaking(address || '');
                await ConvexPvPService.joinRoom(roomCode, address || '', userProfile?.username);
                setPvpMode('inRoom');
                if (soundEnabled) AudioManager.buttonSuccess();
              } catch (error: any) {
                alert(error.message);
                if (soundEnabled) AudioManager.buttonError();
              }
            }}
            disabled={roomCode.length !== 6}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold mb-2 transition"
          >
            <div className="flex items-center justify-between">
              <span>{t('join')}</span>
              <span className="text-sm font-modern bg-white/20 px-2 py-1 rounded">20 VBMS</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              setPvpMode('pvpMenu');
              setRoomCode('');
            }}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
