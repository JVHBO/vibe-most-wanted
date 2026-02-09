/**
 * Neynar API Integration
 *
 * Fetches Farcaster user data including the Neynar User Score
 * Docs: https://docs.neynar.com/docs/neynar-user-quality-score
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
const NEYNAR_API_BASE = 'https://api.neynar.com/v2';

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 BANDWIDTH FIX: In-memory cache for API responses
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache stores: key -> { data, expiresAt }
const userCache = new Map<number, CacheEntry<any>>();
const castCache = new Map<string, CacheEntry<any>>();

// Cache TTLs (in milliseconds)
const USER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - user profiles rarely change
const CAST_CACHE_TTL = 60 * 60 * 1000; // 1 hour - cast content never changes

// Helper to get from cache if not expired
function getFromCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  // Expired or not found - delete if expired
  if (entry) cache.delete(key);
  return null;
}

// Helper to set in cache
function setInCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

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
  custody_address: string; // The wallet that holds the FID
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
 * 🚀 BANDWIDTH FIX: Uses 10-minute cache for user data
 */
export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is not configured');
  }

  // 🚀 BANDWIDTH FIX: Check cache first
  const cached = getFromCache<NeynarUser>(userCache, fid);
  if (cached) {
    return cached;
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

    const user = data.users[0];
    // 🚀 BANDWIDTH FIX: Cache for 10 minutes
    setInCache(userCache, fid, user, USER_CACHE_TTL);
    return user;
  } catch (error) {
    console.error('Error fetching Neynar user:', error);
    return null;
  }
}

/**
 * Calculate card rarity based on Neynar User Score
 *
 * Using VibeFID collection trait names (5 rarities):
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

  // 🚀 BANDWIDTH FIX: Check cache first
  const cached = getFromCache<NeynarCast>(castCache, castHash);
  if (cached) {
    return cached;
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

    const cast = data.cast as NeynarCast;
    // 🚀 BANDWIDTH FIX: Cache for 1 hour
    setInCache(castCache, castHash, cast, CAST_CACHE_TTL);
    return cast;
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

  // 🚀 BANDWIDTH FIX: Check cache first
  const cached = getFromCache<NeynarCast>(castCache, warpcastUrl);
  if (cached) {
    return cached;
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

    const cast = data.cast as NeynarCast;
    // 🚀 BANDWIDTH FIX: Cache for 1 hour
    setInCache(castCache, warpcastUrl, cast, CAST_CACHE_TTL);
    return cast;
  } catch (error) {
    console.error('Error fetching Neynar cast by URL:', error);
    return null;
  }
}


// ============================================================================
// NEYNAR NOTIFICATIONS API
// ============================================================================

/**
 * Notification delivery status from Neynar API
 */
export interface NotificationDelivery {
  fid: number;
  status: 'success' | 'failed' | 'invalid_token' | 'rate_limited' | 'token_not_found' | 'token_disabled' | 'http_error' | 'invalid_target_url';
}

/**
 * Send notification to users via Neynar API
 * Docs: https://docs.neynar.com/reference/publish-frame-notifications
 *
 * @param title - Notification title (max 32 chars)
 * @param body - Notification body (max 128 chars)
 * @param targetFids - Array of FIDs to send to (empty = all users with notifications enabled, max 100)
 * @param targetUrl - URL to open when notification is clicked (max 256 chars)
 * @returns Delivery results for each FID
 */
export async function sendNeynarNotification(
  title: string,
  body: string,
  targetFids: number[] = [],
  targetUrl: string = 'https://vibefid.xyz'
): Promise<{
  success: boolean;
  deliveries: NotificationDelivery[];
  error?: string;
}> {
  if (!NEYNAR_API_KEY) {
    console.error('[Neynar] NEYNAR_API_KEY is not configured');
    return { success: false, deliveries: [], error: 'API key not configured' };
  }

  try {
    // Validate and truncate to API limits
    const validatedTitle = title.slice(0, 32);
    const validatedBody = body.slice(0, 128);
    const validatedUrl = targetUrl.slice(0, 256);

    // Generate valid UUID v4 format for idempotency
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const payload = {
      notification: {
        title: validatedTitle,
        body: validatedBody,
        target_url: validatedUrl,
        uuid,
      },
      target_fids: targetFids, // Empty array = all users with notifications enabled
    };

    console.log(`[Neynar] Sending notification: "${validatedTitle}" to ${targetFids.length || 'all'} users`);

    const response = await fetch(
      'https://api.neynar.com/v2/farcaster/frame/notifications/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Neynar] Notification API error: ${response.status}`, errorText);
      return { success: false, deliveries: [], error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const deliveries: NotificationDelivery[] = (data.notification_deliveries || []).map((d: { fid: number; status: string }) => ({
      fid: d.fid,
      status: d.status as NotificationDelivery['status'],
    }));

    const successCount = deliveries.filter(d => d.status === 'success').length;
    const failedCount = deliveries.length - successCount;

    console.log(`[Neynar] Notification sent: ${successCount} success, ${failedCount} failed`);

    return { success: true, deliveries };
  } catch (error) {
    console.error('[Neynar] Error sending notification:', error);
    return { success: false, deliveries: [], error: String(error) };
  }
}

/**
 * Send notification to ALL users with notifications enabled via Neynar
 * This is a convenience wrapper that sends to empty target_fids array
 */
export async function broadcastNeynarNotification(
  title: string,
  body: string,
  targetUrl: string = 'https://vibefid.xyz'
): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  error?: string;
}> {
  const result = await sendNeynarNotification(title, body, [], targetUrl);

  const successCount = result.deliveries.filter(d => d.status === 'success').length;
  const failedCount = result.deliveries.filter(d => d.status !== 'success').length;

  return {
    success: result.success,
    successCount,
    failedCount,
    error: result.error,
  };
}

// ============================================================================
// CAST INTERACTIONS
// ============================================================================

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
    const recasted = cast.viewer_context?.recasted === true || cast.viewer_context?.recast === true;

    // For replies, check user's recent casts to find replies to target cast
    let replied = false;
    const actualCastHash = cast.hash;

    if (actualCastHash) {
      try {
        // Fetch user's recent casts (including replies)
        const userCastsResponse = await fetch(
          `${NEYNAR_API_BASE}/farcaster/feed/user/casts?fid=${viewerFid}&limit=50&include_replies=true`,
          {
            headers: {
              'accept': 'application/json',
              'api_key': NEYNAR_API_KEY,
            },
          }
        );

        if (userCastsResponse.ok) {
          const userCastsData = await userCastsResponse.json();
          const userCasts = userCastsData.casts || [];
          console.log(`[Neynar] User casts count: ${userCasts.length}, looking for parent_hash: ${actualCastHash}`);
          
          // Check if any of user's casts is a reply to the target cast
          replied = userCasts.some((userCast: { parent_hash?: string }) => 
            userCast.parent_hash === actualCastHash
          );
          
          if (replied) {
            console.log(`[Neynar] Found reply to target cast!`);
          }
        } else {
          const errorText = await userCastsResponse.text();
          console.error(`[Neynar] User casts API error: ${userCastsResponse.status}`, errorText);
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

// ============================================================================
// OPENRANK GLOBAL RANKING
// ============================================================================

// Cache for OpenRank results (15 minutes TTL)
const openRankCache = new Map<number, CacheEntry<{ rank: number; score: number }>>();
const OPENRANK_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get global rank from OpenRank API
 * Endpoint: POST https://graph.cast.k3l.io/scores/global/engagement/fids
 * Returns rank position among all Farcaster users
 */
export async function getGlobalRankFromOpenRank(fid: number): Promise<{
  rank: number | null;
  score: number | null;
  source: 'openrank' | 'estimate';
}> {
  // Check cache first
  const cached = getFromCache(openRankCache, fid);
  if (cached) {
    return { rank: cached.rank, score: cached.score, source: 'openrank' };
  }

  try {
    const response = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([fid]),
    });

    if (!response.ok) {
      console.error(`[OpenRank] API error: ${response.status}`);
      return { rank: null, score: null, source: 'estimate' };
    }

    const data = await response.json();

    // Response format: [{ fid, rank, score }]
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const rankData = { rank: result.rank, score: result.score };
      setInCache(openRankCache, fid, rankData, OPENRANK_CACHE_TTL);
      return { rank: result.rank, score: result.score, source: 'openrank' };
    }

    return { rank: null, score: null, source: 'estimate' };
  } catch (error) {
    console.error('[OpenRank] Error fetching global rank:', error);
    return { rank: null, score: null, source: 'estimate' };
  }
}

/**
 * Estimate global rank based on Neynar score
 * These are rough estimates based on typical score distributions
 */
export function estimateGlobalRankFromScore(neynarScore: number): {
  estimatedRank: string;
  percentile: string;
} {
  // Estimates based on Neynar score distribution
  // ~800k+ Farcaster users, score distribution is roughly:
  // 1.00+: Top ~50 users
  // 0.99+: Top ~200 users
  // 0.95+: Top ~1,000 users
  // 0.90+: Top ~2,500 users
  // 0.80+: Top ~10,000 users
  // 0.70+: Top ~25,000 users
  // 0.50+: Top ~100,000 users

  if (neynarScore >= 1.00) {
    return { estimatedRank: 'Top 50', percentile: 'Top 0.01%' };
  } else if (neynarScore >= 0.99) {
    return { estimatedRank: 'Top 200', percentile: 'Top 0.03%' };
  } else if (neynarScore >= 0.95) {
    return { estimatedRank: 'Top 1k', percentile: 'Top 0.1%' };
  } else if (neynarScore >= 0.90) {
    return { estimatedRank: 'Top 2.5k', percentile: 'Top 0.3%' };
  } else if (neynarScore >= 0.85) {
    return { estimatedRank: 'Top 5k', percentile: 'Top 0.6%' };
  } else if (neynarScore >= 0.80) {
    return { estimatedRank: 'Top 10k', percentile: 'Top 1.3%' };
  } else if (neynarScore >= 0.70) {
    return { estimatedRank: 'Top 25k', percentile: 'Top 3%' };
  } else if (neynarScore >= 0.60) {
    return { estimatedRank: 'Top 50k', percentile: 'Top 6%' };
  } else if (neynarScore >= 0.50) {
    return { estimatedRank: 'Top 100k', percentile: 'Top 12%' };
  } else {
    return { estimatedRank: 'Top 50%', percentile: 'Top 50%' };
  }
}
