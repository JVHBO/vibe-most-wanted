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
    const matchmakingRef = ref(database, 'matchmaking');
    const snapshot = await get(matchmakingRef);

    if (snapshot.exists()) {
      const players = snapshot.val();
      const waitingPlayers = Object.entries(players).filter(
        ([addr, data]: [string, any]) => addr !== playerAddress && Date.now() - data.timestamp < 60000
      );

      if (waitingPlayers.length > 0) {
        const [opponentAddress] = waitingPlayers[0];

        // Remove ambos do matchmaking
        await remove(ref(database, `matchmaking/${opponentAddress}`));
        await remove(ref(database, `matchmaking/${playerAddress}`));

        // Cria sala automaticamente
        const code = await this.createRoom(playerAddress);
        await this.joinRoom(code, opponentAddress);

        return code;
      }
    }

    // Adiciona à fila de matchmaking
    await set(ref(database, `matchmaking/${playerAddress}`), {
      timestamp: Date.now()
    });

    return '';
  }

  // Remove da fila de matchmaking
  static async cancelMatchmaking(playerAddress: string): Promise<void> {
    await remove(ref(database, `matchmaking/${playerAddress}`));
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

  // Limpa salas antigas (> 1 hora)
  static async cleanupOldRooms(): Promise<void> {
    const roomsRef = ref(database, 'rooms');
    const snapshot = await get(roomsRef);

    if (snapshot.exists()) {
      const rooms = snapshot.val();
      const oneHourAgo = Date.now() - 3600000;

      for (const [code, room] of Object.entries(rooms)) {
        const r = room as GameRoom;
        if (r.createdAt < oneHourAgo) {
          await remove(ref(database, `rooms/${code}`));
        }
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
    await update(ref(database, `profiles/${address}`), {
      'stats.totalCards': totalCards,
      'stats.totalPower': totalPower,
      lastUpdated: Date.now()
    });
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
    const matchId = push(ref(database, 'matches')).key;

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

    // Salva a partida
    await set(ref(database, `matches/${matchId}`), match);

    // Atualiza estatísticas
    const profile = await this.getProfile(playerAddress);
    if (profile) {
      const statsUpdate: any = { lastUpdated: Date.now() };

      if (type === 'pve') {
        if (result === 'win') {
          statsUpdate['stats.pveWins'] = profile.stats.pveWins + 1;
        } else if (result === 'loss') {
          statsUpdate['stats.pveLosses'] = profile.stats.pveLosses + 1;
        }
      } else {
        if (result === 'win') {
          statsUpdate['stats.pvpWins'] = profile.stats.pvpWins + 1;
        } else if (result === 'loss') {
          statsUpdate['stats.pvpLosses'] = profile.stats.pvpLosses + 1;
        }
      }

      await update(ref(database, `profiles/${playerAddress}`), statsUpdate);
    }
  }

  // Busca histórico de partidas
  static async getMatchHistory(playerAddress: string, limit: number = 20): Promise<MatchHistory[]> {
    const matchesRef = ref(database, 'matches');
    const snapshot = await get(matchesRef);

    if (!snapshot.exists()) return [];

    const matches = snapshot.val();
    const playerMatches = Object.values(matches)
      .filter((m: any) => m.playerAddress === playerAddress)
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return playerMatches as MatchHistory[];
  }

  // Busca leaderboard
  static async getLeaderboard(): Promise<UserProfile[]> {
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) return [];

    const profiles = Object.values(snapshot.val()) as UserProfile[];

    // Ordena por total de poder
    return profiles.sort((a, b) => b.stats.totalPower - a.stats.totalPower);
  }

  // Escuta mudanças no leaderboard
  static watchLeaderboard(callback: (profiles: UserProfile[]) => void): () => void {
    const profilesRef = ref(database, 'profiles');

    const listener = onValue(profilesRef, (snapshot) => {
      if (snapshot.exists()) {
        const profiles = Object.values(snapshot.val()) as UserProfile[];
        const sorted = profiles.sort((a, b) => b.stats.totalPower - a.stats.totalPower);
        callback(sorted);
      } else {
        callback([]);
      }
    });

    return () => off(profilesRef, 'value', listener);
  }
}
