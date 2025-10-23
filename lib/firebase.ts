import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, push, remove, update, get } from 'firebase/database';

// IMPORTANTE: Substitua estas credenciais pelas suas do Firebase Console
// Vá em: https://console.firebase.google.com/ -> Seu Projeto -> Project Settings -> General
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDEMO-KEY-REPLACE-ME",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://your-project-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Inicializa Firebase apenas uma vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Função auxiliar para adicionar timeout às operações do Firebase
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000, operation: string = 'Firebase operation'): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error: any) {
    console.error(`❌ ${operation} failed:`, error);
    throw error;
  }
}

// Sistema de debounce para evitar múltiplas chamadas simultâneas
const pendingOperations = new Map<string, Promise<any>>();

async function withDebounce<T>(key: string, operation: () => Promise<T>): Promise<T> {
  // Se já existe uma operação pendente com essa chave, retorna ela
  if (pendingOperations.has(key)) {
    console.log('⏳ Reusing pending operation:', key);
    return pendingOperations.get(key) as Promise<T>;
  }

  const promise = operation().finally(() => {
    // Remove da lista de pendentes quando terminar
    pendingOperations.delete(key);
  });

  pendingOperations.set(key, promise);
  return promise;
}

// Sistema de retry para operações que podem falhar temporariamente
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} - Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ ${operationName} failed on attempt ${attempt}:`, error.message);

      // Se não for o último retry, espera antes de tentar novamente
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        // Aumenta o delay exponencialmente
        delayMs *= 2;
      }
    }
  }

  console.error(`❌ ${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}

export interface GameRoom {
  id: string;
  code: string;
  host: {
    address: string;
    ready: boolean;
    cards: any[];
    power: number;
  };
  guest?: {
    address: string;
    ready: boolean;
    cards: any[];
    power: number;
  };
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  winner?: string;
  createdAt: number;
}

export interface UserProfile {
  address: string;
  username: string;
  twitter?: string;
  createdAt: number;
  lastUpdated: number;
  userIndex?: number; // Ordem de registro do usuário (0, 1, 2, 3...)
  defenseDeck?: string[]; // 5 tokenIds for defense deck (mandatory after first set)
  attacksToday?: number; // Number of attacks made today (0-3)
  lastAttackDate?: string; // UTC date of last attack (YYYY-MM-DD)
  stats: {
    totalCards: number;
    openedCards: number;
    unopenedCards: number;
    totalPower: number;
    pveWins: number;
    pveLosses: number;
    pvpWins: number;
    pvpLosses: number;
    attackWins?: number; // Wins when attacking others
    attackLosses?: number; // Losses when attacking others
    defenseWins?: number; // Wins when defending
    defenseLosses?: number; // Losses when defending
  };
}

export interface MatchHistory {
  id: string;
  playerAddress: string;
  type: 'pve' | 'pvp' | 'attack' | 'defense'; // attack = you attacked, defense = you were attacked
  result: 'win' | 'loss' | 'tie';
  playerPower: number;
  opponentPower: number;
  opponentAddress?: string; // Para PvP e Attack/Defense
  opponentUsername?: string; // Para identificar oponente no histórico
  timestamp: number;
  playerCards: any[];
  opponentCards: any[];
}

export class PvPService {
  // Cria uma sala personalizada
  static async createRoom(hostAddress: string): Promise<string> {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = ref(database, `rooms/${code}`);

      const room: GameRoom = {
        id: code,
        code,
        host: {
          address: hostAddress,
          ready: false,
          cards: [],
          power: 0
        },
        status: 'waiting',
        createdAt: Date.now()
      };

      await withTimeout(
        set(roomRef, room),
        8000,
        `Create room ${code}`
      );

      console.log('✅ Room created:', code);
      return code;
    } catch (error: any) {
      console.error('❌ createRoom error:', error);
      throw new Error(`Erro ao criar sala: ${error.message}`);
    }
  }

  // Entra em uma sala com código
  static async joinRoom(code: string, guestAddress: string): Promise<boolean> {
    try {
      const roomRef = ref(database, `rooms/${code}`);

      const snapshot = await withTimeout(
        get(roomRef),
        8000,
        `Get room ${code}`
      );

      if (!snapshot.exists()) {
        throw new Error('Sala não encontrada');
      }

      const room = snapshot.val() as GameRoom;

      if (room.guest) {
        throw new Error('Sala já está cheia');
      }

      if (room.host.address === guestAddress) {
        throw new Error('Você não pode entrar na própria sala');
      }

      // Nota: Não podemos verificar se guest está em outra sala porque
      // as regras do Firebase não permitem ler todas as salas de uma vez.
      // O filtro no findMatch já previne a maioria dos casos problemáticos.

      await withTimeout(
        update(roomRef, {
          guest: {
            address: guestAddress,
            ready: false,
            cards: [],
            power: 0
          },
          status: 'ready'
        }),
        8000,
        `Join room ${code}`
      );

      console.log('✅ Joined room:', code);
      return true;
    } catch (error: any) {
      console.error('❌ joinRoom error:', error);
      throw new Error(`Erro ao entrar na sala: ${error.message}`);
    }
  }

  // Busca automática de oponente
  static async findMatch(playerAddress: string): Promise<string> {
    console.log('🔍 findMatch called for:', playerAddress);

    try {
      const matchmakingRef = ref(database, 'matchmaking');
      console.log('📡 Getting matchmaking data...');
      const snapshot = await get(matchmakingRef);
      console.log('✅ Got matchmaking snapshot, exists:', snapshot.exists());

      if (snapshot.exists()) {
        const players = snapshot.val();
        const now = Date.now();

        // Filtra jogadores válidos (não é o próprio jogador, está online há menos de 30 segundos, e NÃO tem roomCode)
        const waitingPlayers = Object.entries(players).filter(
          ([addr, data]: [string, any]) => {
            const age = now - data.timestamp;
            const hasRoomCode = !!data.roomCode; // Já está em uma sala
            const isValid = addr !== playerAddress && age < 30000 && !hasRoomCode;

            if (!isValid && addr !== playerAddress) {
              if (hasRoomCode) {
                console.log('⚠️ Removing matchmaking entry (already in room):', addr);
                remove(ref(database, `matchmaking/${addr}`)).catch(console.error);
              } else if (age >= 30000) {
                console.log('⚠️ Removing stale matchmaking entry:', addr, 'age:', age / 1000, 'seconds');
                remove(ref(database, `matchmaking/${addr}`)).catch(console.error);
              }
            }

            return isValid;
          }
        );

        console.log('📊 Found', waitingPlayers.length, 'waiting players');

        if (waitingPlayers.length > 0) {
          const [opponentAddress] = waitingPlayers[0];
          console.log('✅ Matched with:', opponentAddress);

          // Cria sala automaticamente
          console.log('🏠 Creating room...');
          const code = await this.createRoom(playerAddress);
          console.log('👥 Adding opponent to room...');
          await this.joinRoom(code, opponentAddress);

          // Atualiza matchmaking entries com roomCode (em vez de remover)
          // IMPORTANTE: Atualiza opponent PRIMEIRO para garantir que ele receba antes do cleanup
          console.log('🔗 Updating matchmaking with room code...');
          await set(ref(database, `matchmaking/${opponentAddress}`), {
            timestamp: Date.now(),
            roomCode: code
          });
          await set(ref(database, `matchmaking/${playerAddress}`), {
            timestamp: Date.now(),
            roomCode: code
          });

          console.log('🎮 Room created:', code);
          return code;
        }
      }

      // Adiciona à fila de matchmaking com timestamp
      console.log('⏳ Added to matchmaking queue');
      await set(ref(database, `matchmaking/${playerAddress}`), {
        timestamp: Date.now()
      });
      console.log('✅ Successfully added to queue');

      return '';
    } catch (error: any) {
      console.error('❌ findMatch ERROR:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  }

  // Remove da fila de matchmaking
  static async cancelMatchmaking(playerAddress: string): Promise<void> {
    await remove(ref(database, `matchmaking/${playerAddress}`));
  }

  // Observa mudanças no matchmaking para detectar quando a sala é criada
  static watchMatchmaking(playerAddress: string, callback: (roomCode: string | null) => void): () => void {
    const playerRef = ref(database, `matchmaking/${playerAddress}`);
    let hasSeenEntry = false; // Flag para rastrear se já vimos a entrada pelo menos uma vez

    // Escuta mudanças na entrada de matchmaking
    const matchmakingListener = onValue(playerRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Se nunca vimos a entrada, ignora (ainda não foi criada)
        // Se já vimos, significa que foi removida (cancelamento)
        if (hasSeenEntry) {
          console.log('⚠️ Player removed from matchmaking - cancelled');
          callback(null);
        } else {
          console.log('⏳ Waiting for matchmaking entry to be created...');
        }
        return;
      }

      // Marca que já vimos a entrada
      hasSeenEntry = true;

      const data = snapshot.val();

      // Se a entrada tem roomCode, significa que um match foi encontrado
      if (data.roomCode) {
        console.log('✅ Match found! Room:', data.roomCode);
        callback(data.roomCode);

        // Nota: NÃO removemos aqui porque causaria o listener disparar novamente
        // com !snapshot.exists() e chamar callback(null), voltando ao menu.
        // A entrada será limpa automaticamente pelo filtro do findMatch (30s).
      } else {
        // Ainda esperando por match (só tem timestamp)
        console.log('⏳ Still waiting for match...');
      }
    });

    return () => off(playerRef, 'value', matchmakingListener);
  }

  // Atualiza as cartas selecionadas
  static async updateCards(code: string, playerAddress: string, cards: any[]): Promise<void> {
    console.log('🎯 updateCards called:', { code, playerAddress, cardsCount: cards.length });

    // Usa debounce para evitar múltiplas chamadas simultâneas
    const debounceKey = `updateCards:${code}:${playerAddress}`;

    return withDebounce(debounceKey, async () => {
      // Usa retry para tentar novamente em caso de falha
      return withRetry(async () => {
        const roomRef = ref(database, `rooms/${code}`);

        // Adiciona timeout à leitura
        const snapshot = await withTimeout(
          get(roomRef),
          8000,
          `Get room ${code}`
        );

        if (!snapshot.exists()) {
          console.error('❌ Room not found:', code);
          throw new Error('Sala não encontrada');
        }

        const room = snapshot.val() as GameRoom;
        const isHost = room.host.address === playerAddress;
        const power = cards.reduce((sum, c) => sum + (c.power || 0), 0);

        console.log('📊 Player info:', { isHost, power, playerAddress });
        console.log('📊 Current room state:', {
          hostReady: room.host.ready,
          guestReady: room.guest?.ready,
          roomStatus: room.status
        });

        const updatePath = isHost ? 'host' : 'guest';
        const updateData = {
          cards,
          power,
          ready: true
        };

        console.log('💾 Updating Firebase:', { path: `rooms/${code}/${updatePath}`, data: updateData });

        // Adiciona timeout à escrita
        await withTimeout(
          update(ref(database, `rooms/${code}/${updatePath}`), updateData),
          8000,
          `Update room ${code}/${updatePath}`
        );

        console.log('✅ Firebase update complete');

        // Verify the update worked (com timeout menor)
        const verifySnapshot = await withTimeout(
          get(roomRef),
          5000,
          `Verify room ${code}`
        ).catch(err => {
          console.warn('⚠️ Verification timeout (non-critical):', err);
          return null;
        });

        if (verifySnapshot?.exists()) {
          const updatedRoom = verifySnapshot.val() as GameRoom;
          console.log('🔍 Verification - Updated room state:', {
            hostReady: updatedRoom.host.ready,
            guestReady: updatedRoom.guest?.ready,
            roomStatus: updatedRoom.status
          });
        }

        return;
      }, 2, 1000, `Update cards for room ${code}`);
    });
  }

  // Escuta mudanças na sala
  static watchRoom(code: string, callback: (room: GameRoom | null) => void): () => void {
    const roomRef = ref(database, `rooms/${code}`);

    const listener = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as GameRoom);
      } else {
        callback(null);
      }
    });

    return () => off(roomRef, 'value', listener);
  }

  // Limpa salas antigas (> 5 minutos) e entradas antigas de matchmaking
  static async cleanupOldRooms(): Promise<void> {
    console.log('🧹 Cleaning up old rooms and matchmaking entries...');

    const roomsRef = ref(database, 'rooms');
    const roomsSnapshot = await get(roomsRef);

    if (roomsSnapshot.exists()) {
      const rooms = roomsSnapshot.val();
      const fiveMinutesAgo = Date.now() - 300000; // 5 minutos
      let roomsDeleted = 0;

      for (const [code, room] of Object.entries(rooms)) {
        const r = room as GameRoom;
        if (r.createdAt < fiveMinutesAgo) {
          console.log('🗑️ Deleting old room:', code, 'age:', (Date.now() - r.createdAt) / 60000, 'minutes');
          await remove(ref(database, `rooms/${code}`));
          roomsDeleted++;
        }
      }

      if (roomsDeleted > 0) {
        console.log('✅ Deleted', roomsDeleted, 'old rooms');
      }
    }

    // Também limpa entradas antigas do matchmaking
    const matchmakingRef = ref(database, 'matchmaking');
    const matchmakingSnapshot = await get(matchmakingRef);

    if (matchmakingSnapshot.exists()) {
      const players = matchmakingSnapshot.val();
      const oneMinuteAgo = Date.now() - 60000; // 1 minuto
      let entriesDeleted = 0;

      for (const [addr, data] of Object.entries(players)) {
        const d = data as any;
        if (d.timestamp < oneMinuteAgo) {
          console.log('🗑️ Deleting stale matchmaking entry:', addr);
          await remove(ref(database, `matchmaking/${addr}`));
          entriesDeleted++;
        }
      }

      if (entriesDeleted > 0) {
        console.log('✅ Deleted', entriesDeleted, 'stale matchmaking entries');
      }
    }
  }

  // Deixa a sala
  static async leaveRoom(code: string, playerAddress: string): Promise<void> {
    const roomRef = ref(database, `rooms/${code}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) return;

    const room = snapshot.val() as GameRoom;

    if (room.host.address === playerAddress) {
      // Se o host sair, deleta a sala
      await remove(roomRef);
    } else if (room.guest?.address === playerAddress) {
      // Se o guest sair, remove apenas o guest
      await update(roomRef, {
        guest: null,
        status: 'waiting'
      });
    }
  }
}

/*
 * MIGRATION NOTE:
 *
 * Old structure (slow - requires full scan):
 *   matches/
 *     {matchId}/
 *       playerAddress: "0x..."
 *       ...
 *
 * New structure (fast - direct access):
 *   playerMatches/
 *     {playerAddress}/
 *       {matchId}/
 *         ...
 *
 * To migrate existing data, run this in Firebase Console:
 *
 * 1. Go to Firebase Realtime Database
 * 2. Export "matches" node
 * 3. Run migration script to reorganize by playerAddress
 * 4. Import to "playerMatches"
 * 5. Delete old "matches" node
 *
 * This optimization reduces getMatchHistory from O(n) to O(1) where n = total matches
 */

export class ProfileService {
  // Verifica se um username já existe
  static async usernameExists(username: string): Promise<boolean> {
    const usernamesRef = ref(database, 'usernames');
    const snapshot = await get(usernamesRef);

    if (!snapshot.exists()) return false;

    const usernames = snapshot.val();
    return Object.values(usernames).includes(username.toLowerCase());
  }

  // Obtém o próximo índice de usuário (para early tester badge)
  static async getNextUserIndex(): Promise<number> {
    try {
      const counterRef = ref(database, 'userCounter');
      const snapshot = await get(counterRef);
      const currentCount = snapshot.exists() ? snapshot.val() : 0;

      // Incrementa o contador
      await set(counterRef, currentCount + 1);

      return currentCount;
    } catch (error: any) {
      console.error('❌ getNextUserIndex error:', error);
      return 9999; // Fallback para um número alto se der erro
    }
  }

  // Cria um novo perfil
  static async createProfile(address: string, username: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const normalizedUsername = username.toLowerCase();

    try {
      // IMPORTANTE: Verifica se a wallet já tem um perfil
      const existingProfile = await withTimeout(
        this.getProfile(normalizedAddress),
        8000,
        'Check existing profile'
      );

      if (existingProfile) {
        throw new Error('Esta wallet já possui um perfil. Use o perfil existente.');
      }

      // Verifica se username já existe
      const exists = await withTimeout(
        this.usernameExists(normalizedUsername),
        8000,
        'Check username existence'
      );

      if (exists) {
        throw new Error('Username já está em uso');
      }

      // Obtém o próximo índice de usuário (para early tester badge)
      const userIndex = await this.getNextUserIndex();

      // Cria o perfil (sem twitter - será adicionado depois)
      const profile = {
        address: normalizedAddress,
        username,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        userIndex,
        stats: {
          totalCards: 0,
          openedCards: 0,
          unopenedCards: 0,
          totalPower: 0,
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0
        }
      };

      // Salva o perfil
      await withTimeout(
        set(ref(database, `profiles/${normalizedAddress}`), profile),
        8000,
        'Save profile'
      );

      // Reserva o username
      await withTimeout(
        set(ref(database, `usernames/${normalizedUsername}`), normalizedAddress),
        8000,
        'Reserve username'
      );

      console.log('✅ Profile created successfully:', username);
    } catch (error: any) {
      console.error('❌ createProfile error:', error);
      throw new Error(`Erro ao criar perfil: ${error.message}`);
    }
  }

  // Busca perfil por endereço
  static async getProfile(address: string): Promise<UserProfile | null> {
    try {
      const normalizedAddress = address.toLowerCase();
      const snapshot = await withTimeout(
        get(ref(database, `profiles/${normalizedAddress}`)),
        8000,
        `Get profile for ${normalizedAddress.substring(0, 8)}`
      );
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error: any) {
      console.error('❌ getProfile error:', error);
      return null;
    }
  }

  // Busca endereço por username
  static async getAddressByUsername(username: string): Promise<string | null> {
    try {
      const normalizedUsername = username.toLowerCase();
      const snapshot = await withTimeout(
        get(ref(database, `usernames/${normalizedUsername}`)),
        8000,
        `Get address for username ${normalizedUsername}`
      );
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error: any) {
      console.error('❌ getAddressByUsername error:', error);
      return null;
    }
  }

  // Atualiza estatísticas do perfil
  static async updateStats(address: string, totalCards: number, openedCards: number, unopenedCards: number, totalPower: number): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    console.log('📊 updateStats called:', { address: normalizedAddress, totalCards, openedCards, unopenedCards, totalPower });

    // Atualiza o objeto stats diretamente no path correto
    await update(ref(database, `profiles/${normalizedAddress}/stats`), {
      totalCards,
      openedCards,
      unopenedCards,
      totalPower
    });

    await update(ref(database, `profiles/${normalizedAddress}`), {
      lastUpdated: Date.now()
    });

    console.log('✅ Profile stats updated successfully');

    // Verify the update
    const profile = await this.getProfile(normalizedAddress);
    if (profile) {
      console.log('🔍 Verified profile stats:', {
        totalCards: profile.stats.totalCards,
        openedCards: profile.stats.openedCards,
        unopenedCards: profile.stats.unopenedCards,
        totalPower: profile.stats.totalPower
      });
    }
  }

  // Atualiza Twitter
  static async updateTwitter(address: string, twitter: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const cleanTwitter = twitter?.trim();

    if (!cleanTwitter || cleanTwitter.length === 0) {
      return; // Não atualiza se estiver vazio
    }

    await update(ref(database, `profiles/${normalizedAddress}`), {
      twitter: cleanTwitter,
      lastUpdated: Date.now()
    });
  }

  // Salva Defense Deck
  static async saveDefenseDeck(address: string, tokenIds: string[]): Promise<void> {
    if (tokenIds.length !== 5) {
      throw new Error('Defense deck must have exactly 5 cards');
    }

    const normalizedAddress = address.toLowerCase();
    await update(ref(database, `profiles/${normalizedAddress}`), {
      defenseDeck: tokenIds,
      lastUpdated: Date.now()
    });
  }

  // Verifica se tem Defense Deck
  static async hasDefenseDeck(address: string): Promise<boolean> {
    const profile = await this.getProfile(address);
    return !!(profile?.defenseDeck && profile.defenseDeck.length === 5);
  }

  // Pega Defense Deck
  static async getDefenseDeck(address: string): Promise<string[] | null> {
    const profile = await this.getProfile(address);
    return profile?.defenseDeck || null;
  }

  // Atualiza Username
  static async updateUsername(address: string, newUsername: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const normalizedNewUsername = newUsername.toLowerCase().trim();

    if (!normalizedNewUsername || normalizedNewUsername.length === 0) {
      throw new Error('Username não pode ser vazio');
    }

    if (normalizedNewUsername.length < 3) {
      throw new Error('Username deve ter no mínimo 3 caracteres');
    }

    if (normalizedNewUsername.length > 20) {
      throw new Error('Username deve ter no máximo 20 caracteres');
    }

    // Valida formato (apenas letras, números e underscore)
    if (!/^[a-z0-9_]+$/.test(normalizedNewUsername)) {
      throw new Error('Username pode conter apenas letras, números e underscore');
    }

    try {
      // Busca o perfil atual
      const currentProfile = await withTimeout(
        this.getProfile(normalizedAddress),
        8000,
        'Get current profile'
      );

      if (!currentProfile) {
        throw new Error('Perfil não encontrado');
      }

      const oldUsername = currentProfile.username.toLowerCase();

      // Se for o mesmo username, não faz nada
      if (oldUsername === normalizedNewUsername) {
        return;
      }

      // Verifica se o novo username já está em uso
      const usernameExists = await withTimeout(
        this.usernameExists(normalizedNewUsername),
        8000,
        'Check new username existence'
      );

      if (usernameExists) {
        throw new Error('Este username já está em uso');
      }

      // Remove o username antigo
      await withTimeout(
        remove(ref(database, `usernames/${oldUsername}`)),
        8000,
        'Remove old username'
      );

      // Reserva o novo username
      await withTimeout(
        set(ref(database, `usernames/${normalizedNewUsername}`), normalizedAddress),
        8000,
        'Reserve new username'
      );

      // Atualiza o username no perfil
      await withTimeout(
        update(ref(database, `profiles/${normalizedAddress}`), {
          username: newUsername.trim(),
          lastUpdated: Date.now()
        }),
        8000,
        'Update profile username'
      );

      console.log('✅ Username updated successfully:', oldUsername, '->', normalizedNewUsername);
    } catch (error: any) {
      console.error('❌ updateUsername error:', error);
      throw new Error(`Erro ao atualizar username: ${error.message}`);
    }
  }

  // Registra resultado de partida
  static async recordMatch(
    playerAddress: string,
    type: 'pve' | 'pvp',
    result: 'win' | 'loss' | 'tie',
    playerPower: number,
    opponentPower: number,
    playerCards: any[],
    opponentCards: any[],
    opponentAddress?: string
  ): Promise<void> {
    const normalizedPlayerAddress = playerAddress.toLowerCase();
    const normalizedOpponentAddress = opponentAddress?.toLowerCase();
    console.log('🎮 recordMatch called:', { playerAddress: normalizedPlayerAddress, type, result, playerPower, opponentPower });

    const matchId = push(ref(database, `playerMatches/${normalizedPlayerAddress}`)).key;

    const match: MatchHistory = {
      id: matchId!,
      playerAddress: normalizedPlayerAddress,
      type,
      result,
      playerPower,
      opponentPower,
      opponentAddress: normalizedOpponentAddress,
      timestamp: Date.now(),
      playerCards,
      opponentCards
    };

    // Salva a partida diretamente no path do jogador (evita full scan)
    // Estrutura: playerMatches/{playerAddress}/{matchId}
    await set(ref(database, `playerMatches/${normalizedPlayerAddress}/${matchId}`), match);
    console.log('✅ Match saved to Firebase:', matchId);

    // Atualiza estatísticas
    const profile = await this.getProfile(normalizedPlayerAddress);
    console.log('📝 Current profile:', profile);
    if (profile) {
      // Prepara update do objeto stats
      const statsUpdate: any = {};

      if (type === 'pve') {
        if (result === 'win') {
          statsUpdate.pveWins = profile.stats.pveWins + 1;
        } else if (result === 'loss') {
          statsUpdate.pveLosses = profile.stats.pveLosses + 1;
        }
      } else {
        if (result === 'win') {
          statsUpdate.pvpWins = profile.stats.pvpWins + 1;
        } else if (result === 'loss') {
          statsUpdate.pvpLosses = profile.stats.pvpLosses + 1;
        }
      }

      console.log('💾 Updating profile stats:', statsUpdate);

      // Atualiza stats no path correto
      await update(ref(database, `profiles/${normalizedPlayerAddress}/stats`), statsUpdate);

      // Atualiza lastUpdated no perfil
      await update(ref(database, `profiles/${normalizedPlayerAddress}`), {
        lastUpdated: Date.now()
      });

      console.log('✅ Profile stats updated after match');

      // Verifica a atualização
      const updatedProfile = await this.getProfile(normalizedPlayerAddress);
      if (updatedProfile) {
        console.log('🔍 Verified updated stats:', {
          pveWins: updatedProfile.stats.pveWins,
          pveLosses: updatedProfile.stats.pveLosses,
          pvpWins: updatedProfile.stats.pvpWins,
          pvpLosses: updatedProfile.stats.pvpLosses
        });
      }
    } else {
      console.warn('⚠️ No profile found for player:', playerAddress);
    }
  }

  // Busca histórico de partidas (otimizado - busca apenas as partidas do jogador)
  static async getMatchHistory(playerAddress: string, limit: number = 20): Promise<MatchHistory[]> {
    const normalizedAddress = playerAddress.toLowerCase();
    // Busca diretamente as partidas do jogador (sem full scan)
    const playerMatchesRef = ref(database, `playerMatches/${normalizedAddress}`);
    const snapshot = await get(playerMatchesRef);

    if (!snapshot.exists()) return [];

    const matches = Object.values(snapshot.val()) as MatchHistory[];

    // Ordena por timestamp (mais recente primeiro) e limita
    return matches
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Busca leaderboard (otimizado - ainda faz full scan mas é necessário para ranking)
  // Deleta um perfil
  static async deleteProfile(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();

    try {
      // Busca o perfil para pegar o username
      const profile = await this.getProfile(normalizedAddress);

      if (!profile) {
        throw new Error('Perfil não encontrado');
      }

      const username = profile.username.toLowerCase();

      // Remove o perfil
      await remove(ref(database, `profiles/${normalizedAddress}`));

      // Remove o username mapping
      await remove(ref(database, `usernames/${username}`));

      console.log(`✅ Profile deleted: ${normalizedAddress} (${username})`);
    } catch (error: any) {
      console.error('❌ deleteProfile error:', error);
      throw new Error(`Erro ao deletar perfil: ${error.message}`);
    }
  }

  static async getLeaderboard(limit: number = 100): Promise<UserProfile[]> {
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) return [];

    const profiles = Object.values(snapshot.val()) as UserProfile[];

    // Ordena por total de poder e limita ao top N
    return profiles
      .sort((a, b) => b.stats.totalPower - a.stats.totalPower)
      .slice(0, limit);
  }

  // Escuta mudanças no leaderboard (otimizado - limita ao top 100)
  static watchLeaderboard(callback: (profiles: UserProfile[]) => void, limit: number = 100): () => void {
    const profilesRef = ref(database, 'profiles');

    const listener = onValue(profilesRef, (snapshot) => {
      if (snapshot.exists()) {
        const profiles = Object.values(snapshot.val()) as UserProfile[];
        const sorted = profiles
          .sort((a, b) => b.stats.totalPower - a.stats.totalPower)
          .slice(0, limit); // Limita ao top N para evitar processar milhares de perfis
        callback(sorted);
      } else {
        callback([]);
      }
    });

    return () => off(profilesRef, 'value', listener);
  }
}
