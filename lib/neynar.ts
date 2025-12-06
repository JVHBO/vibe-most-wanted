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
 * Using Vibe Most Wanted collection trait names (5 rarities):
 * - Common: ≤ 0.69
 * - Rare: 0.70 - 0.78
 * - Epic: 0.79 - 0.89
 * - Legendary: 0.90 - 0.99
 * - Mythic: ≥ 1.00
 */
export function calculateRarityFromScore(score: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' {
  if (score >= 0.99) return 'Mythic';
  if (score >= 0.90) return 'Legendary';
  if (score >= 0.79) return 'Epic';
  if (score >= 0.70) return 'Rare';
  return 'Common';
}

/**
 * Calculate base power from rarity (matching VBMS, GM VBRS, AFCL collections)
 */
export function getBasePowerFromRarity(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'): number {
  const basePowers = {
    Common: 5,
    Rare: 20,
    Epic: 80,
    Legendary: 240,
    Mythic: 800,
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

/**
 * Card suits
 */
export type CardSuit = 'hearts' | 'diamonds' | 'spades' | 'clubs';

/**
 * Card ranks
 */
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

/**
 * Generate random suit (first RNG)
 */
export function generateRandomSuit(): CardSuit {
  const suits: CardSuit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
  return suits[Math.floor(Math.random() * suits.length)];
}

/**
 * Generate DETERMINISTIC suit from FID
 */
export function getSuitFromFid(fid: number): CardSuit {
  const suits: CardSuit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
  return suits[fid % 4];
}

/**
 * Get suit symbol
 */
export function getSuitSymbol(suit: CardSuit): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    spades: '♠',
    clubs: '♣',
  };
  return symbols[suit];
}

/**
 * Get suit color
 */
export function getSuitColor(suit: CardSuit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Generate rank based on rarity (second RNG, score-based)
 *
 * - Common (≤0.69): 2, 3, 4, 5, 6
 * - Rare (0.70-0.78): 7, 8
 * - Epic (0.79-0.89): 9, 10, J
 * - Legendary (0.90-0.99): Q, K
 * - Mythic (≥1.0): A
 */
export function generateRankFromRarity(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'): CardRank {
  const ranksByRarity: Record<string, CardRank[]> = {
    Common: ['2', '3', '4', '5', '6'],
    Rare: ['7', '8'],
    Epic: ['9', '10', 'J'],
    Legendary: ['Q', 'K'],
    Mythic: ['A'],
  };

  const availableRanks = ranksByRarity[rarity];
  return availableRanks[Math.floor(Math.random() * availableRanks.length)];
}

/**
 * Neynar Cast interface for embedded casts
 */
export interface NeynarCast {
  hash: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
  };
  text: string;
  timestamp: string;
  embeds: Array<{
    url?: string;
    metadata?: {
      image?: { url: string };
    };
  }>;
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
}

/**
 * Fetch cast data by hash from Neynar API
 * Docs: https://docs.neynar.com/reference/lookup-cast-by-hash-or-warpcast-url
 */
export async function getCastByHash(castHash: string): Promise<NeynarCast | null> {
  if (!NEYNAR_API_KEY) {
    console.error('NEYNAR_API_KEY is not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${NEYNAR_API_BASE}/farcaster/cast?identifier=${castHash}&type=hash`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`Neynar Cast API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.cast) {
      console.error(`No cast found for hash: ${castHash}`);
      return null;
    }

    return data.cast as NeynarCast;
  } catch (error) {
    console.error('Error fetching Neynar cast:', error);
    return null;
  }
}


/**
 * Fetch cast data by Warpcast URL from Neynar API
 * This is more reliable than using truncated hashes
 */
export async function getCastByUrl(warpcastUrl: string): Promise<NeynarCast | null> {
  if (!NEYNAR_API_KEY) {
    console.error('NEYNAR_API_KEY is not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${NEYNAR_API_BASE}/farcaster/cast?identifier=${encodeURIComponent(warpcastUrl)}&type=url`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`Neynar Cast API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.cast) {
      console.error(`No cast found for URL: ${warpcastUrl}`);
      return null;
    }

    return data.cast as NeynarCast;
  } catch (error) {
    console.error('Error fetching Neynar cast by URL:', error);
    return null;
  }
}

/**
 * Check if a user has interacted with a cast (like, recast, or reply)
 */
export interface CastInteractions {
  liked: boolean;
  recasted: boolean;
  replied: boolean;
}

export async function checkCastInteractions(
  castIdentifier: string,
  viewerFid: number
): Promise<CastInteractions> {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
  const NEYNAR_API_BASE = 'https://api.neynar.com/v2';

  if (!NEYNAR_API_KEY) {
    console.error('NEYNAR_API_KEY is not configured');
    return { liked: false, recasted: false, replied: false };
  }

  // Determine if identifier is a URL or hash
  const isUrl = castIdentifier.startsWith('http');
  const identifierType = isUrl ? 'url' : 'hash';
  const encodedIdentifier = isUrl ? encodeURIComponent(castIdentifier) : castIdentifier;

  console.log(`[Neynar] Checking interactions: identifier=${castIdentifier}, type=${identifierType}, viewerFid=${viewerFid}`);

  try {
    // Fetch cast with viewer context to check reactions
    const response = await fetch(
      `${NEYNAR_API_BASE}/farcaster/cast?identifier=${encodedIdentifier}&type=${identifierType}&viewer_fid=${viewerFid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Neynar API error: ${response.status}`, errorText);
      return { liked: false, recasted: false, replied: false };
    }

    const data = await response.json();
    const cast = data.cast;

    console.log(`[Neynar] Cast found:`, cast?.hash, `viewer_context:`, cast?.viewer_context);

    if (!cast) {
      console.log('[Neynar] No cast found in response');
      return { liked: false, recasted: false, replied: false };
    }

    // Check viewer context for reactions
    const liked = cast.viewer_context?.liked === true;
    const recasted = cast.viewer_context?.recasted === true;

    // For replies, check conversation using the actual cast hash
    let replied = false;
    const actualCastHash = cast.hash;

    if (actualCastHash) {
      try {
        const convResponse = await fetch(
          `${NEYNAR_API_BASE}/farcaster/cast/conversation?identifier=${actualCastHash}&type=hash&reply_depth=1&include_chronological_parent_casts=false`,
          {
            headers: {
              'accept': 'application/json',
              'api_key': NEYNAR_API_KEY,
            },
          }
        );

        if (convResponse.ok) {
          const convData = await convResponse.json();
          const replies = convData.conversation?.cast?.direct_replies || [];
          replied = replies.some((reply: { author: { fid: number } }) => reply.author.fid === viewerFid);
        }
      } catch (e) {
        console.error('Error checking replies:', e);
      }
    }

    console.log(`[Neynar] Interactions: liked=${liked}, recasted=${recasted}, replied=${replied}`);
    return { liked, recasted, replied };
  } catch (error) {
    console.error('Error checking cast interactions:', error);
    return { liked: false, recasted: false, replied: false };
  }
}
