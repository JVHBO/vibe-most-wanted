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
  stats: {
    totalCards: number;
    totalPower: number;
    pveWins: number;
    pveLosses: number;
    pvpWins: number;
    pvpLosses: number;
  };
}

export interface MatchHistory {
  id: string;
  playerAddress: string;
  type: 'pve' | 'pvp';
  result: 'win' | 'loss' | 'tie';
  playerPower: number;
  opponentPower: number;
  opponentAddress?: string; // Para PvP
  timestamp: number;
  playerCards: any[];
  opponentCards: any[];
}

export class PvPService {
  // Cria uma sala personalizada
  static async createRoom(hostAddress: string): Promise<string> {
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

    await set(roomRef, room);
    return code;
  }

  // Entra em uma sala com código
  static async joinRoom(code: string, guestAddress: string): Promise<boolean> {
    const roomRef = ref(database, `rooms/${code}`);
    const snapshot = await get(roomRef);

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

    await update(roomRef, {
      guest: {
        address: guestAddress,
        ready: false,
        cards: [],
        power: 0
      },
      status: 'ready'
    });

    return true;
  }

  // Busca automática de oponente
  static async findMatch(playerAddress: string): Promise<string> {
    console.log('🔍 findMatch called for:', playerAddress);

    const matchmakingRef = ref(database, 'matchmaking');
    const snapshot = await get(matchmakingRef);

    if (snapshot.exists()) {
      const players = snapshot.val();
      const now = Date.now();

      // Filtra jogadores válidos (não é o próprio jogador e está online há menos de 30 segundos)
      const waitingPlayers = Object.entries(players).filter(
        ([addr, data]: [string, any]) => {
          const age = now - data.timestamp;
          const isValid = addr !== playerAddress && age < 30000; // Reduzido para 30s

          if (!isValid && addr !== playerAddress) {
            console.log('⚠️ Removing stale matchmaking entry:', addr, 'age:', age / 1000, 'seconds');
            // Remove entrada antiga
            remove(ref(database, `matchmaking/${addr}`)).catch(console.error);
          }

          return isValid;
        }
      );

      console.log('📊 Found', waitingPlayers.length, 'waiting players');

      if (waitingPlayers.length > 0) {
        const [opponentAddress] = waitingPlayers[0];
        console.log('✅ Matched with:', opponentAddress);

        // Remove ambos do matchmaking
        await remove(ref(database, `matchmaking/${opponentAddress}`));
        await remove(ref(database, `matchmaking/${playerAddress}`));

        // Cria sala automaticamente
        const code = await this.createRoom(playerAddress);
        await this.joinRoom(code, opponentAddress);

        console.log('🎮 Room created:', code);
        return code;
      }
    }

    // Adiciona à fila de matchmaking com timestamp
    console.log('⏳ Added to matchmaking queue');
    await set(ref(database, `matchmaking/${playerAddress}`), {
      timestamp: Date.now()
    });

    return '';
  }

  // Remove da fila de matchmaking
  static async cancelMatchmaking(playerAddress: string): Promise<void> {
    await remove(ref(database, `matchmaking/${playerAddress}`));
  }

  // Observa mudanças no matchmaking para detectar quando a sala é criada
  static watchMatchmaking(playerAddress: string, callback: (roomCode: string | null) => void): () => void {
    const playerRef = ref(database, `matchmaking/${playerAddress}`);
    const roomsRef = ref(database, 'rooms');

    // Escuta quando o jogador é removido do matchmaking (significa que uma sala foi criada)
    const matchmakingListener = onValue(playerRef, async (snapshot) => {
      if (!snapshot.exists()) {
        // Jogador foi removido do matchmaking, procura por sala criada
        console.log('🔍 Player removed from matchmaking, searching for room...');

        // Espera um pouco para dar tempo da sala ser criada
        await new Promise(resolve => setTimeout(resolve, 500));

        // Procura por salas onde o jogador é guest ou host
        const roomsSnapshot = await get(roomsRef);
        if (roomsSnapshot.exists()) {
          const rooms = roomsSnapshot.val();
          for (const [code, room] of Object.entries(rooms)) {
            const r = room as GameRoom;
            if (r.host.address === playerAddress || r.guest?.address === playerAddress) {
              console.log('✅ Found room:', code);
              callback(code);
              return;
            }
          }
        }

        // Se não encontrou sala, pode ter sido cancelado
        console.log('⚠️ No room found, matchmaking may have been cancelled');
        callback(null);
      }
    });

    return () => off(playerRef, 'value', matchmakingListener);
  }

  // Atualiza as cartas selecionadas
  static async updateCards(code: string, playerAddress: string, cards: any[]): Promise<void> {
    console.log('🎯 updateCards called:', { code, playerAddress, cardsCount: cards.length });

    const roomRef = ref(database, `rooms/${code}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      console.error('❌ Room not found:', code);
      return;
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

    await update(ref(database, `rooms/${code}/${updatePath}`), updateData);

    console.log('✅ Firebase update complete');

    // Verify the update worked
    const verifySnapshot = await get(roomRef);
    if (verifySnapshot.exists()) {
      const updatedRoom = verifySnapshot.val() as GameRoom;
      console.log('🔍 Verification - Updated room state:', {
        hostReady: updatedRoom.host.ready,
        guestReady: updatedRoom.guest?.ready,
        roomStatus: updatedRoom.status
      });
    }
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

  // Cria um novo perfil
  static async createProfile(address: string, username: string): Promise<void> {
    const normalizedUsername = username.toLowerCase();

    // IMPORTANTE: Verifica se a wallet já tem um perfil
    const existingProfile = await this.getProfile(address);
    if (existingProfile) {
      throw new Error('Esta wallet já possui um perfil. Use o perfil existente.');
    }

    // Verifica se username já existe
    const exists = await this.usernameExists(normalizedUsername);
    if (exists) {
      throw new Error('Username já está em uso');
    }

    // Cria o perfil (sem twitter - será adicionado depois)
    const profile = {
      address,
      username,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      stats: {
        totalCards: 0,
        totalPower: 0,
        pveWins: 0,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0
      }
    };

    // Salva o perfil
    await set(ref(database, `profiles/${address}`), profile);

    // Reserva o username
    await set(ref(database, `usernames/${normalizedUsername}`), address);
  }

  // Busca perfil por endereço
  static async getProfile(address: string): Promise<UserProfile | null> {
    const snapshot = await get(ref(database, `profiles/${address}`));
    return snapshot.exists() ? snapshot.val() : null;
  }

  // Busca endereço por username
  static async getAddressByUsername(username: string): Promise<string | null> {
    const normalizedUsername = username.toLowerCase();
    const snapshot = await get(ref(database, `usernames/${normalizedUsername}`));
    return snapshot.exists() ? snapshot.val() : null;
  }

  // Atualiza estatísticas do perfil
  static async updateStats(address: string, totalCards: number, totalPower: number): Promise<void> {
    console.log('📊 updateStats called:', { address, totalCards, totalPower });

    // Atualiza o objeto stats diretamente no path correto
    await update(ref(database, `profiles/${address}/stats`), {
      totalCards,
      totalPower
    });

    await update(ref(database, `profiles/${address}`), {
      lastUpdated: Date.now()
    });

    console.log('✅ Profile stats updated successfully');

    // Verify the update
    const profile = await this.getProfile(address);
    if (profile) {
      console.log('🔍 Verified profile stats:', {
        totalCards: profile.stats.totalCards,
        totalPower: profile.stats.totalPower
      });
    }
  }

  // Atualiza Twitter
  static async updateTwitter(address: string, twitter: string): Promise<void> {
    const cleanTwitter = twitter?.trim();

    if (!cleanTwitter || cleanTwitter.length === 0) {
      return; // Não atualiza se estiver vazio
    }

    await update(ref(database, `profiles/${address}`), {
      twitter: cleanTwitter,
      lastUpdated: Date.now()
    });
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
    console.log('🎮 recordMatch called:', { playerAddress, type, result, playerPower, opponentPower });

    const matchId = push(ref(database, `playerMatches/${playerAddress}`)).key;

    const match: MatchHistory = {
      id: matchId!,
      playerAddress,
      type,
      result,
      playerPower,
      opponentPower,
      opponentAddress,
      timestamp: Date.now(),
      playerCards,
      opponentCards
    };

    // Salva a partida diretamente no path do jogador (evita full scan)
    // Estrutura: playerMatches/{playerAddress}/{matchId}
    await set(ref(database, `playerMatches/${playerAddress}/${matchId}`), match);
    console.log('✅ Match saved to Firebase:', matchId);

    // Atualiza estatísticas
    const profile = await this.getProfile(playerAddress);
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
      await update(ref(database, `profiles/${playerAddress}/stats`), statsUpdate);

      // Atualiza lastUpdated no perfil
      await update(ref(database, `profiles/${playerAddress}`), {
        lastUpdated: Date.now()
      });

      console.log('✅ Profile stats updated after match');

      // Verifica a atualização
      const updatedProfile = await this.getProfile(playerAddress);
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
    // Busca diretamente as partidas do jogador (sem full scan)
    const playerMatchesRef = ref(database, `playerMatches/${playerAddress}`);
    const snapshot = await get(playerMatchesRef);

    if (!snapshot.exists()) return [];

    const matches = Object.values(snapshot.val()) as MatchHistory[];

    // Ordena por timestamp (mais recente primeiro) e limita
    return matches
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Busca leaderboard (otimizado - ainda faz full scan mas é necessário para ranking)
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
