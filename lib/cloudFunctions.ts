import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp, getApps } from 'firebase/app';

// Firebase config (same as firebase.ts)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const functions = getFunctions(app);

// Cloud Function wrappers
export const CloudFunctions = {
  // Create profile
  async createProfile(address: string, username: string) {
    const createProfileFn = httpsCallable(functions, 'createProfile');
    const result = await createProfileFn({ address, username });
    return result.data;
  },

  // Record match
  async recordMatch(
    playerAddress: string,
    type: 'pve' | 'pvp',
    result: 'win' | 'loss' | 'tie',
    playerPower: number,
    opponentPower: number,
    playerCards: any[],
    opponentCards: any[],
    opponentAddress?: string
  ) {
    const recordMatchFn = httpsCallable(functions, 'recordMatch');
    const res = await recordMatchFn({
      playerAddress,
      type,
      result,
      playerPower,
      opponentPower,
      playerCards,
      opponentCards,
      opponentAddress
    });
    return res.data;
  },

  // Update stats
  async updateStats(address: string, totalCards: number, totalPower: number) {
    const updateStatsFn = httpsCallable(functions, 'updateStats');
    const result = await updateStatsFn({ address, totalCards, totalPower });
    return result.data;
  },

  // Update Twitter
  async updateTwitter(address: string, twitter: string) {
    const updateTwitterFn = httpsCallable(functions, 'updateTwitter');
    const result = await updateTwitterFn({ address, twitter });
    return result.data;
  }
};
