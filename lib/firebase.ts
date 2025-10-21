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
    const roomRef = ref(database, `rooms/${code}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) return;

    const room = snapshot.val() as GameRoom;
    const isHost = room.host.address === playerAddress;
    const power = cards.reduce((sum, c) => sum + (c.power || 0), 0);

    const updatePath = isHost ? 'host' : 'guest';
    await update(ref(database, `rooms/${code}/${updatePath}`), {
      cards,
      power,
      ready: true
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
