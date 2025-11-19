/**
 * Neynar API Integration
 *
 * Fetches Farcaster user data including the Neynar User Score
 * Docs: https://docs.neynar.com/docs/neynar-user-quality-score
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
const NEYNAR_API_BASE = 'https://api.neynar.com/v2';

export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
  verified_addresses: {
    eth_addresses: string[];
  };
  power_badge: boolean;
  experimental: {
    neynar_user_score: number; // 0-1+ score
  };
}

export interface NeynarUserResponse {
  users: NeynarUser[];
}

/**
 * Fetch user data by FID
 */
export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`Neynar API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: NeynarUserResponse = await response.json();

    if (!data.users || data.users.length === 0) {
      console.error(`No user found for FID: ${fid}`);
      return null;
    }

    return data.users[0];
  } catch (error) {
    console.error('Error fetching Neynar user:', error);
    return null;
  }
}

/**
 * Calculate card rarity based on Neynar User Score
 *
 * Ranges:
 * - Common: ≤ 0.69
 * - Rare: 0.70 - 0.78
 * - Epic: 0.80 - 0.89
 * - Legendary: 0.90 - 0.99
 * - Mythic: ≥ 1.00
 */
export function calculateRarityFromScore(score: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' {
  if (score >= 1.0) return 'Mythic';
  if (score >= 0.90) return 'Legendary';
  if (score >= 0.80) return 'Epic';
  if (score >= 0.70) return 'Rare';
  return 'Common';
}

/**
 * Calculate base power from rarity
 */
export function getBasePowerFromRarity(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'): number {
  const basePowers = {
    Common: 60,
    Rare: 80,
    Epic: 100,
    Legendary: 125,
    Mythic: 150,
  };
  return basePowers[rarity];
}

/**
 * Generate random foil type
 */
export function generateRandomFoil(): 'Prize' | 'Standard' | 'None' {
  const random = Math.random();
  if (random < 0.05) return 'Prize'; // 5% chance
  if (random < 0.25) return 'Standard'; // 20% chance
  return 'None'; // 75% chance
}

/**
 * Generate random wear condition
 */
export function generateRandomWear(): 'Pristine' | 'Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' {
  const random = Math.random();
  if (random < 0.10) return 'Pristine'; // 10%
  if (random < 0.35) return 'Mint'; // 25%
  if (random < 0.65) return 'Lightly Played'; // 30%
  if (random < 0.85) return 'Moderately Played'; // 20%
  return 'Heavily Played'; // 15%
}
