/**
 * NFT Fetching Utilities
 *
 * Extracted from app/page.tsx for reusability
 * Handles Alchemy API interactions and image caching
 *
 * FALLBACK SYSTEM:
 * - Caches NFT data in localStorage (persists across sessions)
 * - Falls back to cached data when Alchemy fails (403/429)
 * - Reports API status for debugging
 *
 * OPTIMIZATION (Jan 2026):
 * - Uses free Base RPC to check balanceOf before fetching
 * - Only fetches from Alchemy for collections where user has NFTs
 * - Reduces Alchemy CUs by ~70-90%
 */

import { normalizeUrl } from "./attributes";
import { devWarn } from "@/lib/utils/logger";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;
// Multiple RPC endpoints for fallback - 12 RPCs for maximum reliability
const BASE_RPCS = [
  'https://base.llamarpc.com',
  'https://base-mainnet.public.blastapi.io',
  'https://mainnet.base.org',
  'https://base.meowrpc.com',
  'https://1rpc.io/base',
  'https://base.drpc.org',
  'https://base.publicnode.com',
  'https://base-rpc.publicnode.com',
  'https://rpc.ankr.com/base',
  'https://base.gateway.tenderly.co',
  'https://gateway.tenderly.co/public/base',
  'https://base.blockpi.network/v1/rpc/public',
];

// Basescan API key for fallback
const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '1ZFQ27H4QDE5ESCVWPIJUNTFP3776Y1AJ5';

// ============================================
// WIELD API CONFIGURATION (Jan 2026)
// More reliable than Alchemy for Vibechain collections
// ============================================
const WIELD_API_KEY = 'YUEPI-G3KJ7-5FCXV-ANSPV-BZ3DA';
const WIELD_BASE_URL = 'https://build.wield.xyz/vibe/boosterbox';

// Mapping of contract addresses to Wield slugs
const WIELD_SLUGS: Record<string, string> = {
  '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728': 'vibe-most-wanted',
  '0x120c612d79a3187a3b8b4f4bb924cebe41eb407a': 'vibe-rot-bangers',
  '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150': 'meowverse',
  '0xefe512e73ca7356c20a21aa9433bad5fc9342d46': 'gm-vbrs',
  '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f': 'viberuto',
  '0xc7f2d8c035b2505f30a5417c0374ac0299d88553': 'vibefx',
  '0x319b12e8eba0be2eae1112b357ba75c2c178b567': 'history-of-computer',
  '0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea': 'team-pothead',
  '0x34d639c63384a00a2d25a58f73bea73856aa0550': 'tarot',
  '0x3ff41af61d092657189b1d4f7d74d994514724bb': 'baseball-cabal',
  '0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8': 'poorly-drawn-pepes',
  '0xfeabae8bdb41b2ae507972180df02e70148b38e1': 'cu-mi-oh',
};

// Cache for Wield API responses
const WIELD_CACHE_KEY = 'vbms_wield_cache_v1';
const WIELD_CACHE_TIME = 1000 * 60 * 10; // 10 minutes for owner list

// Image URL cache
const imageUrlCache = new Map<string, { url: string; timestamp: number }>();
const IMAGE_CACHE_TIME = 1000 * 60 * 60; // 1 hour

// NFT response cache (persisted in localStorage for longer persistence)
const NFT_CACHE_KEY = 'vbms_nft_cache_v3'; // v3 for localStorage migration
const NFT_CACHE_TIME = 1000 * 60 * 30; // 🚀 INCREASED: 30 minutes cache (was 10)

// Balance cache (to detect changes without Alchemy)
const BALANCE_CACHE_KEY = 'vbms_balance_cache_v1';
const BALANCE_CACHE_TIME = 1000 * 60 * 15; // 🚀 INCREASED: 15 minutes (was 5)

// VibeFID Alchemy metadata refresh (once per day to get updated Neynar scores)
const VIBEFID_REFRESH_KEY = 'vbms_vibefid_alchemy_refresh';
const VIBEFID_REFRESH_TIME = 1000 * 60 * 60 * 24; // 24 hours
const VIBEFID_CONTRACT = '0x60274a138d026e3cb337b40567100fdec3127565';

function shouldRefreshVibeFIDMetadata(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lastRefresh = localStorage.getItem(VIBEFID_REFRESH_KEY);
    if (!lastRefresh) return true;
    return Date.now() - parseInt(lastRefresh) > VIBEFID_REFRESH_TIME;
  } catch {
    return true;
  }
}

function markVibeFIDRefreshed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIBEFID_REFRESH_KEY, Date.now().toString());
  } catch { /* ignore */ }
}

// Lock to prevent duplicate balance checks (Page and Context calling simultaneously)
let balanceCheckInProgress: Promise<{ collectionsWithNfts: any[]; balances: Record<string, number> }> | null = null;
let balanceCheckOwner: string | null = null;

// Track if Alchemy API is blocked
let alchemyBlocked = false;
let lastAlchemyError: string | null = null;

// 📊 STATS TRACKING (for debugging Alchemy usage)
let stats = {
  rpcCalls: 0,
  rpcSuccess: 0,
  rpcFailed: 0,
  alchemyCalls: 0,
  cacheHits: 0,
  lastReset: Date.now(),
};

// 🚀 PERSISTENT STATS: Send to Convex via API (fire-and-forget)
function trackStatPersistent(key: string, amount: number = 1) {
  if (typeof window === 'undefined') return; // Skip on server
  fetch('/api/track-stat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, amount }),
  }).catch(() => {}); // Fire-and-forget
}

function logStats() {
  const hoursSinceReset = (Date.now() - stats.lastReset) / (1000 * 60 * 60);
  if (hoursSinceReset >= 1) {
    const rpcSuccessRate = stats.rpcCalls > 0 ? ((stats.rpcSuccess / stats.rpcCalls) * 100).toFixed(1) : 'N/A';
    console.log(`📊 [NFT STATS] Hourly: RPC=${stats.rpcCalls} (${rpcSuccessRate}% success), Alchemy=${stats.alchemyCalls}, Cache=${stats.cacheHits}`);
    stats = { rpcCalls: 0, rpcSuccess: 0, rpcFailed: 0, alchemyCalls: 0, cacheHits: 0, lastReset: Date.now() };
  }
}

interface NftCacheEntry {
  owner: string;
  contract: string;
  nfts: any[];
  timestamp: number;
  paginationComplete: boolean;
  balance?: number; // 🚀 OPTIMIZATION: Store balance to detect changes
  alchemyRefreshed?: boolean; // 🔄 VibeFID: marks if cache was created with refreshCache=true
}

interface BalanceCacheEntry {
  owner: string;
  balances: Record<string, number>; // contract -> balance
  timestamp: number;
}

/**
 * Single RPC attempt with timeout (helper function)
 */
async function tryRpcCall(
  rpc: string,
  data: string,
  contractAddress: string,
  timeout: number
): Promise<number | null> {
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: contractAddress, data }, 'latest'],
        id: 1,
      }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;

    // '0x' means 0 balance - this is VALID, not an error!
    if (json.result === '0x' || json.result === '0x0' || json.result === '0x00') {
      return 0;
    }

    if (json.result) {
      const balance = parseInt(json.result, 16);
      if (!isNaN(balance) && balance >= 0) {
        return balance;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try Basescan API as last resort (different REST format)
 */
async function tryBasescan(owner: string, contractAddress: string): Promise<number | null> {
  const balanceOfSelector = '0x70a08231';
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
  const data = balanceOfSelector + ownerPadded;

  try {
    const url = `https://api.basescan.org/api?module=proxy&action=eth_call&to=${contractAddress}&data=${data}&tag=latest&apikey=${BASESCAN_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) return null;
    const json = await res.json();

    if (json.error || json.message === 'NOTOK') return null;

    const result = json.result;
    if (result === '0x' || result === '0x0' || result === '0x00') {
      return 0;
    }

    if (result) {
      const balance = parseInt(result, 16);
      if (!isNaN(balance) && balance >= 0) {
        return balance;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try all RPCs in parallel, return first success
 */
async function tryAllRpcsParallel(
  data: string,
  contractAddress: string,
  owner: string,
  timeout: number
): Promise<number | null> {
  const rpcPromises = BASE_RPCS.map(rpc => tryRpcCall(rpc, data, contractAddress, timeout));
  const basescanPromise = tryBasescan(owner, contractAddress);
  const allPromises = [...rpcPromises, basescanPromise];

  return new Promise<number | null>((resolve) => {
    let pending = allPromises.length;
    let resolved = false;

    allPromises.forEach(promise => {
      promise.then(result => {
        if (!resolved && result !== null) {
          resolved = true;
          resolve(result);
        } else {
          pending--;
          if (pending === 0 && !resolved) {
            resolve(null);
          }
        }
      }).catch(() => {
        pending--;
        if (pending === 0 && !resolved) {
          resolve(null);
        }
      });
    });
  });
}

/**
 * Check NFT balance for a single contract - ALL RPCs in parallel for speed and reliability
 * Returns: number >= 0 for valid balance, -1 for RPC error
 */
async function checkSingleBalance(
  owner: string,
  contractAddress: string,
  _rpc: string // ignored, we use all RPCs in parallel
): Promise<number> {
  const balanceOfSelector = '0x70a08231';
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
  const data = balanceOfSelector + ownerPadded;

  stats.rpcCalls++;
  trackStatPersistent('rpc_total');
  logStats();

  // Try ALL 13 sources in parallel - first success wins
  let result = await tryAllRpcsParallel(data, contractAddress, owner, 5000);
  if (result !== null) {
    stats.rpcSuccess++;
    trackStatPersistent('rpc_success');
    return result;
  }

  // Retry with longer timeout
  result = await tryAllRpcsParallel(data, contractAddress, owner, 10000);
  if (result !== null) {
    stats.rpcSuccess++;
    trackStatPersistent('rpc_success');
    return result;
  }

  // All 13 sources failed twice - extremely rare
  stats.rpcFailed++;
  trackStatPersistent('rpc_failed');
  return -1;
}

/**
 * Check NFT balances for multiple contracts using batched parallel calls
 * Uses batches of 4 contracts with 50ms delay between batches
 * Total time: ~200ms for 13 contracts instead of 4s sequential
 */
async function checkBalancesBatched(
  owner: string,
  contractAddresses: string[]
): Promise<Record<string, number>> {
  const BATCH_SIZE = 4;
  const DELAY_BETWEEN_BATCHES = 50; // 50ms between batches

  const balances: Record<string, number> = {};

  console.log(`🚀 Checking ${contractAddresses.length} contracts in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < contractAddresses.length; i += BATCH_SIZE) {
    const batch = contractAddresses.slice(i, i + BATCH_SIZE);

    // Add delay between batches (except first)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }

    // Check this batch in parallel using Promise.allSettled
    // NOTE: checkSingleBalance already tries ALL 13 RPCs in parallel, no need for extra loop!
    const results = await Promise.allSettled(
      batch.map(async (addr) => {
        const balance = await checkSingleBalance(owner, addr, '');
        return { addr, balance };
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        balances[result.value.addr.toLowerCase()] = result.value.balance;
      } else {
        // This shouldn't happen but handle it
        const addr = batch[results.indexOf(result)];
        balances[addr.toLowerCase()] = -1;
      }
    }
  }

  const nonZero = Object.values(balances).filter(b => b > 0).length;
  const errors = Object.values(balances).filter(b => b === -1).length;
  console.log(`✅ Balance check complete: ${nonZero} with NFTs, ${errors} errors`);

  return balances;
}

/**
 * Check balances for all collections using free RPC
 * Returns only collections where user has NFTs
 *
 * OPTIMIZATION (Jan 2026):
 * - Uses batched parallel calls (4 at a time with 50ms delay)
 * - Rotates between 3 RPC endpoints to avoid rate limiting
 * - Total time: ~200ms for 13 contracts (was 4s sequential)
 */
export async function checkCollectionBalances(
  owner: string,
  collections: Array<{ id: string; contractAddress: string; displayName: string }>
): Promise<{ collectionsWithNfts: typeof collections; balances: Record<string, number> }> {
  // Check cache first (fastest path)
  // Pass expected collection count to invalidate cache if new collections were added
  const collectionsWithContract = collections.filter(c => c.contractAddress);
  const cached = getBalanceCache(owner, collectionsWithContract.length);
  if (cached) {
    trackStatPersistent('balance_check_cached');
    console.log(`📦 Using cached balances for ${owner.slice(0, 10)}...`);
    // BUG FIX: If contract is NOT in cache, include it (need to fetch)
    // Only skip if contract IS in cache AND has balance 0
    let collectionsWithNfts = collections.filter(c => {
      if (!c.contractAddress) return false;
      const contractLower = c.contractAddress.toLowerCase();
      if (!(contractLower in cached.balances)) {
        console.log(`⚠️ ${c.displayName} not in cache - will fetch`);
        return true;
      }
      return cached.balances[contractLower] > 0;
    });
    return { collectionsWithNfts, balances: cached.balances };
  }

  // If another check is in progress for the same owner, wait for it
  if (balanceCheckInProgress && balanceCheckOwner === owner.toLowerCase()) {
    console.log(`⏳ Waiting for existing balance check...`);
    return balanceCheckInProgress as Promise<{ collectionsWithNfts: typeof collections; balances: Record<string, number> }>;
  }

  // Start new check with lock
  balanceCheckOwner = owner.toLowerCase();
  trackStatPersistent('balance_check_total');
  balanceCheckInProgress = (async () => {
    const collectionsWithContract = collections.filter(c => c.contractAddress);
    const contractAddresses = collectionsWithContract.map(c => c.contractAddress);

    // Use batched parallel calls
    const balances = await checkBalancesBatched(owner, contractAddresses);

    // Log results
    let nftsFound = 0;
    let errors = 0;
    for (const collection of collectionsWithContract) {
      const balance = balances[collection.contractAddress.toLowerCase()] || 0;
      if (balance > 0) {
        console.log(`  ✅ ${collection.displayName}: ${balance} NFTs`);
        nftsFound++;
      } else if (balance === -1) {
        errors++;
      }
    }

    // Cache the results if we got valid responses (no -1 errors)
    // IMPORTANT: Cache even if user has 0 NFTs - this is valid and saves future RPC calls!
    const hasErrors = Object.values(balances).some(b => b === -1);
    const hasAnyNfts = Object.values(balances).some(b => b > 0);

    if (!hasErrors) {
      setBalanceCache(owner, balances);
      console.log(`💾 Cached balances for ${owner.slice(0, 10)}... (${hasAnyNfts ? nftsFound + ' NFTs found' : '0 NFTs - user has none'})`);
    } else {
      console.log(`⚠️ Not caching - had ${errors} RPC errors`);
    }

    // 🚀 OPTIMIZATION: Only fetch collections where user CONFIRMED has NFTs (balance > 0)
    // RPC errors (-1) NO LONGER trigger Alchemy fetch - use cached data instead
    // This reduces Alchemy calls significantly when RPCs are unreliable
    let collectionsWithNfts = collections.filter(c =>
      c.contractAddress && (balances[c.contractAddress.toLowerCase()] || 0) > 0
    );

    // Count errors for logging
    const errorCollections = collections.filter(c =>
      c.contractAddress && balances[c.contractAddress.toLowerCase()] === -1
    );

    // Only fetch ALL if EVERY single RPC failed (all -1 errors) AND user has no cached data
    const allFailed = Object.values(balances).every(b => b === -1);
    if (allFailed && collections.length > 0) {
      // Check if we have ANY cached NFT data for this user
      const hasCachedData = collections.some(c => {
        if (!c.contractAddress) return false;
        const cached = getNftCache(owner, c.contractAddress);
        return cached && cached.nfts.length > 0;
      });

      if (hasCachedData) {
        console.log('⚠️ All RPCs failed but user has cached data - using cache only');
        // Don't fetch from Alchemy, let the cache be used
        collectionsWithNfts = [];
      } else {
        console.warn('⚠️ All RPCs failed AND no cache - fetching ALL as last resort');
        collectionsWithNfts = collections.filter(c => c.contractAddress);
      }
    } else if (collectionsWithNfts.length === 0 && collections.length > 0 && !hasErrors) {
      // User genuinely has 0 NFTs across all collections - this is valid!
      console.log('✅ User has 0 NFTs across all collections - no Alchemy calls needed');
    }

    if (errorCollections.length > 0) {
      console.log(`⚠️ ${errorCollections.length} collections had RPC errors - will use cache if available`);
    }
    console.log(`📊 Found NFTs in ${nftsFound} of ${collections.length} collections`);

    // Clear lock
    balanceCheckInProgress = null;
    balanceCheckOwner = null;

    return { collectionsWithNfts, balances };
  })();

  return balanceCheckInProgress as Promise<{ collectionsWithNfts: typeof collections; balances: Record<string, number> }>;
}

function getBalanceCache(owner: string, expectedCollectionCount?: number): BalanceCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
    if (!cached) return null;
    const entry: BalanceCacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > BALANCE_CACHE_TIME) {
      localStorage.removeItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
      return null;
    }
    // 🚀 INVALIDATE if collection count changed (new collection added)
    if (expectedCollectionCount !== undefined) {
      const cachedCount = Object.keys(entry.balances).length;
      if (cachedCount < expectedCollectionCount) {
        console.log(`🔄 Cache invalidated: ${cachedCount} cached vs ${expectedCollectionCount} expected collections`);
        localStorage.removeItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
        return null;
      }
    }
    return entry;
  } catch {
    return null;
  }
}

function setBalanceCache(owner: string, balances: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: BalanceCacheEntry = {
      owner,
      balances,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`, JSON.stringify(entry));
  } catch (e) {
    console.warn('⚠️ Failed to cache balances:', e);
  }
}

/**
 * Clear balance cache (call when user buys/sells)
 */
export function clearBalanceCache(owner?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (owner) {
      localStorage.removeItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
    } else {
      // Clear all balance caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BALANCE_CACHE_KEY)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    console.log('🗑️ Balance cache cleared');
  } catch (e) {
    console.warn('Failed to clear balance cache:', e);
  }
}

/**
 * 🚀 OPTIMIZATION: Get NFT cache with balance comparison
 *
 * If currentBalance matches cached balance → use cache (even if "expired")
 * If currentBalance differs → return null to force Alchemy fetch
 *
 * This reduces Alchemy calls by ~90% for users who don't buy/sell NFTs frequently
 *
 * 🔄 VibeFID EXCEPTION: VibeFID uses TIME-BASED caching ONLY (24h)
 * VibeFID metadata can change (Neynar score updates) without balance changing
 * So we SKIP balance-based caching for VibeFID entirely
 */
function getNftCache(owner: string, contract: string, currentBalance?: number): { nfts: any[]; complete: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    // Try localStorage first (new), then sessionStorage (legacy)
    let cached = localStorage.getItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
    if (!cached) {
      cached = sessionStorage.getItem(`vbms_nft_cache_v2_${owner}_${contract}`);
    }
    if (!cached) return null;
    const entry: NftCacheEntry = JSON.parse(cached);

    // 🔄 VibeFID special handling: NEVER use balance-based caching!
    // VibeFID metadata can change (Neynar score updates) without balance changing
    // Use ONLY time-based expiration (24h refresh cycle)
    const isVibeFID = contract.toLowerCase() === VIBEFID_CONTRACT.toLowerCase();
    if (isVibeFID) {
      if (!entry.timestamp) {
        console.log(`🔄 VibeFID cache has no timestamp - forcing refresh`);
        localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
        return null;
      }

      const cacheAge = Date.now() - entry.timestamp;

      // VibeFID cache expires after 24 hours
      if (cacheAge > VIBEFID_REFRESH_TIME) {
        console.log(`🔄 VibeFID cache expired (${Math.floor(cacheAge / 3600000)}h old) - forcing metadata refresh`);
        localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
        return null;
      }

      // Check if this cache was created with refreshCache=true (has fresh metadata)
      // Old caches from before the fix won't have this marker
      if (!(entry as any).alchemyRefreshed) {
        console.log(`🔄 VibeFID cache was created before refreshCache fix - forcing refresh`);
        localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
        return null;
      }

      // Pagination incomplete - force refresh
      if (!entry.paginationComplete) {
        console.log(`⚠️ VibeFID cache exists but pagination was incomplete - forcing refresh`);
        localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
        return null;
      }

      // VibeFID cache is valid - use it (skip balance comparison)
      console.log(`📦 VibeFID cache valid (${Math.floor(cacheAge / 3600000)}h old, alchemyRefreshed=true) - using cached NFTs`);
      return { nfts: entry.nfts, complete: entry.paginationComplete };
    }

    // 🚀 OPTIMIZATION: If we have current balance, compare with cached balance
    // If balance is the same, NFTs haven't changed - use cache regardless of age!
    if (currentBalance !== undefined && entry.balance !== undefined) {
      if (currentBalance === entry.balance) {
        console.log(`✅ Balance unchanged (${currentBalance}) - using cached NFTs (saved Alchemy call!)`);
        if (!entry.paginationComplete) {
          console.log(`⚠️ Cache exists but pagination was incomplete - forcing refresh`);
          localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
          return null;
        }
        return { nfts: entry.nfts, complete: entry.paginationComplete };
      } else {
        console.log(`🔄 Balance changed (${entry.balance} → ${currentBalance}) - fetching fresh data`);
        localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
        return null;
      }
    }

    // Fallback to time-based expiration if no balance info
    if (Date.now() - entry.timestamp > NFT_CACHE_TIME) {
      localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
      return null;
    }
    if (!entry.paginationComplete) {
      console.log(`⚠️ Cache exists but pagination was incomplete - forcing refresh`);
      localStorage.removeItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
      return null;
    }
    return { nfts: entry.nfts, complete: entry.paginationComplete };
  } catch {
    return null;
  }
}

function setNftCache(owner: string, contract: string, nfts: any[], paginationComplete: boolean, balance?: number, alchemyRefreshed?: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: NftCacheEntry = {
      owner,
      contract,
      nfts,
      timestamp: Date.now(),
      paginationComplete,
      balance, // 🚀 Store balance for future comparison
      alchemyRefreshed, // 🔄 VibeFID: marks if cache was created with refreshCache=true
    };
    localStorage.setItem(`${NFT_CACHE_KEY}_${owner}_${contract}`, JSON.stringify(entry));
    const refreshMarker = alchemyRefreshed ? ', alchemyRefreshed=true' : '';
    console.log(`💾 Cached ${nfts.length} NFTs (balance: ${balance}, pagination complete: ${paginationComplete}${refreshMarker})`);
  } catch (e) {
    console.warn('⚠️ Failed to cache NFTs:', e);
  }
}

export function getAlchemyStatus(): { blocked: boolean; error: string | null } {
  return { blocked: alchemyBlocked, error: lastAlchemyError };
}

/**
 * Clear all NFT cache entries
 * Used when user explicitly refreshes to get fresh data
 */
export function clearAllNftCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    // Clear localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(NFT_CACHE_KEY) || key.startsWith(BALANCE_CACHE_KEY))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Also clear VibeFID refresh timestamp to force metadata refresh
    localStorage.removeItem(VIBEFID_REFRESH_KEY);
    // Also clear legacy sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('vbms_nft_cache')) {
        sessionStorage.removeItem(key);
      }
    }
    // Also clear Wield owner cache (so new mints appear)
    localStorage.removeItem('wield_owner_cache');
    console.log(`🗑️ Cleared ${keysToRemove.length} cache entries + VibeFID refresh + Wield owner cache`);
  } catch (e) {
    console.warn('Failed to clear NFT cache:', e);
  }
}

/**
 * Fallback to fetch VibeFID cards from Convex when Alchemy fails
 * Uses the /api/vibefid-fallback endpoint
 */
async function fetchVibeFIDFromConvex(owner: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/vibefid-fallback?address=${encodeURIComponent(owner)}`);
    if (!res.ok) {
      throw new Error(`Fallback API failed: ${res.status}`);
    }
    const data = await res.json();
    console.log(`📦 VibeFID fallback: ${data.ownedNfts?.length || 0} cards from Convex`);
    return data.ownedNfts || [];
  } catch (error) {
    console.error('❌ VibeFID fallback failed:', error);
    return [];
  }
}

function extractUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // Alchemy can return { gateway: "...", raw: "..." } or { url: "..." }
    return val.gateway || val.url || val.raw || null;
  }
  return null;
}

function getFromCache(tokenId: string): string | null {
  const entry = imageUrlCache.get(tokenId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > IMAGE_CACHE_TIME) {
    imageUrlCache.delete(tokenId);
    return null;
  }
  return entry.url;
}

function setCache(tokenId: string, url: string): void {
  imageUrlCache.set(tokenId, { url, timestamp: Date.now() });
}

/**
 * Get NFT image URL with fallback logic
 * Priority: tokenUri → raw metadata → Alchemy URLs → placeholder
 *
 * VibeFID FIX: VibeFID cards use VIDEO (webm) stored in metadata.image
 * MUST use filebase.io gateway directly (NOT Alchemy cached URLs which are PNG!)
 */
export async function getImage(nft: any, collection?: string): Promise<string> {
  const tid = nft.tokenId;
  const cached = getFromCache(tid);
  if (cached) return cached;

  // 🎬 VIBEFID SPECIAL HANDLING: VibeFID stores VIDEO URL in metadata.image
  // Alchemy caches these as PNG thumbnails - we need the ORIGINAL video URL
  const contractAddr = nft?.contract?.address?.toLowerCase();
  const isVibeFID = collection === 'vibefid' || contractAddr === '0x60274a138d026e3cb337b40567100fdec3127565';

  if (isVibeFID) {
    // 🎬 VibeFID MUST use VIDEO URL from IPFS/filebase, never Alchemy's converted PNG!
    // Alchemy with refreshCache=true converts videos to PNG on Cloudinary - we MUST avoid this
    // PRIORITY 1: Always try tokenUri FIRST to get the original video URL from metadata

    const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
    if (tokenUri && tokenUri.includes('vibefid.xyz')) {
      try {
        console.log(`🎬 VibeFID #${tid} fetching metadata from tokenUri:`, tokenUri);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(tokenUri, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          // VibeFID stores video in "image" field (confusing but true)
          const videoUrl = json.animation_url || json.image;
          if (videoUrl && (videoUrl.includes('filebase.io') || videoUrl.includes('.webm') || videoUrl.includes('.mp4') || videoUrl.includes('ipfs'))) {
            console.log(`🎬 VibeFID #${tid} got video from tokenUri:`, videoUrl);
            const normalized = normalizeUrl(videoUrl);
            setCache(tid, normalized);
            return normalized;
          }
        }
      } catch (e) {
        console.warn(`⚠️ VibeFID #${tid} tokenUri fetch failed:`, e);
      }
    }

    // PRIORITY 2: Use our server-side API to fetch from vibefid.xyz (avoids CORS)
    try {
      const metadataUrl = `/api/vibefid-metadata/${tid}`;
      console.log(`🎬 VibeFID #${tid} fetching via server API:`, metadataUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(metadataUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const videoUrl = json.videoUrl;
        if (videoUrl && (videoUrl.includes('filebase.io') || videoUrl.includes('.webm') || videoUrl.includes('.mp4') || videoUrl.includes('ipfs'))) {
          console.log(`🎬 VibeFID #${tid} got video from server API:`, videoUrl);
          const normalized = normalizeUrl(videoUrl);
          setCache(tid, normalized);
          return normalized;
        }
      }
    } catch (e) {
      console.warn(`⚠️ VibeFID #${tid} server API fetch failed:`, e);
    }

    // PRIORITY 3: Check Alchemy metadata for non-cloudinary video URLs
    const animationUrl = nft?.raw?.metadata?.animation_url || nft?.metadata?.animation_url;
    if (animationUrl && !animationUrl.includes('cloudinary') && !animationUrl.includes('alchemyapi')) {
      console.log(`🎬 VibeFID #${tid} using animation_url:`, animationUrl);
      setCache(tid, animationUrl);
      return animationUrl;
    }

    const metadataImage = nft?.raw?.metadata?.image || nft?.metadata?.image;
    if (metadataImage && !metadataImage.includes('cloudinary') && !metadataImage.includes('alchemyapi')) {
      if (metadataImage.includes('filebase.io') || metadataImage.includes('.webm') || metadataImage.includes('.mp4') || metadataImage.includes('ipfs')) {
        console.log(`🎬 VibeFID #${tid} using metadata.image:`, metadataImage);
        const normalized = normalizeUrl(metadataImage);
        setCache(tid, normalized);
        return normalized;
      }
    }

    // PRIORITY 4: originalUrl if it's from IPFS/filebase (not cloudinary)
    const originalUrl = nft?.image?.originalUrl;
    if (originalUrl && !originalUrl.includes('cloudinary') && !originalUrl.includes('alchemyapi')) {
      if (originalUrl.includes('ipfs') || originalUrl.includes('Qm') || originalUrl.includes('filebase.io') || originalUrl.includes('.webm')) {
        console.log(`🎬 VibeFID #${tid} using originalUrl:`, originalUrl);
        setCache(tid, originalUrl);
        return originalUrl;
      }
    }

    // LAST RESORT: Use Alchemy's cloudinary PNG (better than placeholder)
    const cachedUrl = nft?.image?.cachedUrl;
    if (cachedUrl) {
      console.warn(`⚠️ VibeFID #${tid} falling back to Alchemy cachedUrl (PNG):`, cachedUrl);
      setCache(tid, cachedUrl);
      return cachedUrl;
    }

    const pngUrl = nft?.image?.pngUrl;
    if (pngUrl) {
      console.warn(`⚠️ VibeFID #${tid} using pngUrl as last resort:`, pngUrl);
      setCache(tid, pngUrl);
      return pngUrl;
    }

    // ❌ Could not find any image
    console.error(`❌ VibeFID #${tid} could not find any image URL!`);
    const placeholder = `https://via.placeholder.com/300x420/8b5cf6/ffffff?text=VibeFID+%23${tid}`;
    setCache(tid, placeholder);
    return placeholder;
  }

  // Try tokenUri first
  const tokenUri = extractUrl(nft.tokenUri);
  if (tokenUri && !tokenUri.includes('undefined')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(tokenUri, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const imageFromUri = json?.image || json?.image_url || json?.imageUrl;
        if (imageFromUri) {
          let imageUrl = String(imageFromUri);
          if (imageUrl.includes('wieldcd.net')) {
            const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(imageUrl)}`;
            setCache(tid, proxyUrl);
            return proxyUrl;
          }
          imageUrl = normalizeUrl(imageUrl);
          if (imageUrl && !imageUrl.includes('undefined')) {
            setCache(tid, imageUrl);
            return imageUrl;
          }
        }
      }
    } catch (error) {
      devWarn(`⚠️ Failed to fetch image from tokenUri for NFT #${tid}:`, error);
    }
  }

  // Try raw metadata
  let rawImage = extractUrl(nft?.raw?.metadata?.image);
  if (rawImage) {
    if (rawImage.includes('wieldcd.net')) {
      const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(rawImage)}`;
      setCache(tid, proxyUrl);
      return proxyUrl;
    }
    rawImage = normalizeUrl(rawImage);
    if (rawImage && !rawImage.includes('undefined')) {
      setCache(tid, rawImage);
      return rawImage;
    }
  }

  // Try Alchemy URLs - cachedUrl first (reliable), thumbnail LAST (tiny 72x72!)
  const alchemyUrls = [
    extractUrl(nft?.image?.cachedUrl),    // Good quality - Alchemy CDN (most reliable)
    extractUrl(nft?.image?.originalUrl),  // Best quality - original from IPFS
    extractUrl(nft?.image?.pngUrl),       // Good quality - PNG version
    extractUrl(nft?.image?.thumbnailUrl), // LOW QUALITY - only as last resort!
  ].filter(Boolean);

  for (const url of alchemyUrls) {
    if (url) {
      if (url.includes('wieldcd.net')) {
        const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(url)}`;
        setCache(tid, proxyUrl);
        return proxyUrl;
      }
      const norm = normalizeUrl(String(url));
      if (norm && !norm.includes("undefined")) {
        setCache(tid, norm);
        return norm;
      }
    }
  }

  // Fallback to placeholder
  const placeholder = `https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`;
  setCache(tid, placeholder);
  return placeholder;
}

// ============================================
// WIELD API FUNCTIONS (Jan 2026)
// Primary source for Vibechain collections
// ============================================

/**
 * Get Wield slug for a contract address
 */
function getWieldSlug(contractAddress: string): string | null {
  return WIELD_SLUGS[contractAddress.toLowerCase()] || null;
}

/**
 * Check if a contract is supported by Wield API
 */
export function isWieldSupported(contractAddress: string): boolean {
  return !!getWieldSlug(contractAddress);
}

/**
 * Wield API doesn't support listing tokens by owner
 * Use Alchemy for ownership, Wield for metadata only
 */

/**
 * Fetch single token metadata from Wield API
 * NO API key required for this endpoint!
 */
async function fetchWieldMetadata(
  tokenId: string,
  contractAddress: string
): Promise<any | null> {
  const slug = getWieldSlug(contractAddress);
  if (!slug) return null;

  try {
    const url = `${WIELD_BASE_URL}/metadata/${slug}/${tokenId}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const metadata = await res.json();
    return metadata;
  } catch {
    return null;
  }
}

/**
 * Enrich NFT with Wield metadata
 * Used to fix missing/incomplete Alchemy metadata
 *
 * @param nft NFT object from Alchemy
 * @param contractAddress Contract address
 * @returns Enriched NFT with Wield metadata
 */
export async function enrichWithWieldMetadata(
  nft: any,
  contractAddress: string
): Promise<any> {
  const tokenId = nft.tokenId;
  const wieldMetadata = await fetchWieldMetadata(tokenId, contractAddress);

  if (!wieldMetadata) {
    return nft; // Return original if Wield fails
  }

  // Merge Wield metadata with Alchemy data
  // Wield has more reliable attribute data
  const enriched = {
    ...nft,
    raw: {
      ...nft.raw,
      metadata: {
        ...nft.raw?.metadata,
        name: wieldMetadata.name || nft.raw?.metadata?.name,
        image: wieldMetadata.image || wieldMetadata.imageUrl || nft.raw?.metadata?.image,
        attributes: wieldMetadata.attributes || nft.raw?.metadata?.attributes || [],
        animation_url: wieldMetadata.animation_url || nft.raw?.metadata?.animation_url,
      }
    },
    image: {
      ...nft.image,
      cachedUrl: wieldMetadata.image || wieldMetadata.imageUrl || nft.image?.cachedUrl,
      originalUrl: wieldMetadata.image || wieldMetadata.imageUrl || nft.image?.originalUrl,
    },
    _wieldEnriched: true,
  };

  return enriched;
}

/**
 * Enrich multiple NFTs with Wield metadata in batches
 * Significantly more reliable than Alchemy metadata alone
 *
 * @param nfts Array of NFTs from Alchemy
 * @param contractAddress Contract address
 * @param onProgress Optional progress callback
 * @returns Array of enriched NFTs
 */
export async function enrichNFTsWithWield(
  nfts: any[],
  contractAddress: string,
  onProgress?: (completed: number, total: number) => void
): Promise<any[]> {
  if (!isWieldSupported(contractAddress)) {
    return nfts; // Return original if contract not supported
  }

  console.log(`🔄 Wield: Enriching ${nfts.length} NFTs with metadata...`);
  trackStatPersistent('wield_enrich_attempt');

  const BATCH_SIZE = 10;
  const DELAY_MS = 100;
  const enriched: any[] = [];

  for (let i = 0; i < nfts.length; i += BATCH_SIZE) {
    const batch = nfts.slice(i, i + BATCH_SIZE);

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    const enrichPromises = batch.map(nft =>
      enrichWithWieldMetadata(nft, contractAddress)
    );

    const results = await Promise.allSettled(enrichPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        enriched.push(result.value);
      }
    }

    if (onProgress) {
      onProgress(enriched.length, nfts.length);
    }
  }

  console.log(`✅ Wield: Enriched ${enriched.length}/${nfts.length} NFTs`);
  trackStatPersistent('wield_enrich_success');

  return enriched;
}

/**
 * Fetch all NFTs for an owner from Alchemy API
 * With caching and fallback for when API is blocked/rate-limited
 *
 * 🚀 OPTIMIZATION (Jan 2026): Now accepts currentBalance parameter
 * If currentBalance matches cached balance → use cache forever (no Alchemy call!)
 * This reduces Alchemy calls by ~90% for users who don't frequently trade NFTs
 *
 * @param owner Wallet address
 * @param contractAddress Optional contract filter (defaults to env var)
 * @param onProgress Optional progress callback (page, totalCards)
 * @param currentBalance Optional current balance from RPC check (enables smart caching)
 * @returns Array of NFT objects
 */
export async function fetchNFTs(
  owner: string,
  contractAddress?: string,
  onProgress?: (page: number, cards: number) => void,
  currentBalance?: number
): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  const contract = contractAddress || CONTRACT_ADDRESS;
  if (!contract) throw new Error("Contract address não configurado");

  // 🚀 OPTIMIZATION: Check cache with balance comparison
  // If balance unchanged, use cache regardless of age!
  const cached = getNftCache(owner, contract, currentBalance);

  if (cached && cached.nfts.length > 0 && cached.complete) {
    stats.cacheHits++;
    trackStatPersistent('alchemy_cache_hit');
    logStats();
    console.log(`📦 Using cached NFTs for ${contract.slice(0, 10)}...: ${cached.nfts.length} cards`);
    if (onProgress) onProgress(1, cached.nfts.length);
    return cached.nfts;
  }

  stats.alchemyCalls++;
  trackStatPersistent('alchemy_calls');
  trackStatPersistent('fetch_nfts_total');
  logStats();
  console.log(`🔄 Fetching fresh NFTs from Alchemy for ${contract.slice(0, 10)}... (cache miss or balance changed)`)

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20;

  // ALWAYS refresh VibeFID metadata from Alchemy
  // VibeFID is a small collection and metadata can change (Neynar score updates)
  const isVibeFID = contract.toLowerCase() === VIBEFID_CONTRACT.toLowerCase();
  const needsVibeFIDRefresh = isVibeFID; // Always refresh for VibeFID
  if (needsVibeFIDRefresh) {
    console.log('🔄 VibeFID: Forcing Alchemy metadata refresh');
  }

  try {
    do {
      pageCount++;
      // Add refreshCache=true for VibeFID once per day to get updated metadata (Neynar score changes)
      const refreshParam = needsVibeFIDRefresh ? '&refreshCache=true' : '';
      const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}${refreshParam}`;

      // Retry logic for rate limiting (429) and temporary blocks
      let res: Response;
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        res = await fetch(url);

        // Handle rate limiting (429) with exponential backoff
        if (res.status === 429 && retries < maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          console.log(`⏳ Rate limited (429), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        // Handle forbidden (403) - API key blocked
        if (res.status === 403) {
          alchemyBlocked = true;
          lastAlchemyError = `API Key bloqueada (403 Forbidden)`;
          console.error(`❌ Alchemy API blocked (403). Using fallback...`);
          throw new Error('ALCHEMY_BLOCKED');
        }

        break;
      }

      if (!res!.ok) {
        lastAlchemyError = `API falhou: ${res!.status}`;
        throw new Error(lastAlchemyError);
      }

      // Success - reset blocked status
      alchemyBlocked = false;
      lastAlchemyError = null;

      const json = await res!.json();
      const pageNfts = json.ownedNfts || [];
      allNfts = allNfts.concat(pageNfts);

      if (onProgress) {
        onProgress(pageCount, allNfts.length);
      }

      pageKey = json.pageKey;
    } while (pageKey && pageCount < maxPages);

    // Pagination is complete when there's no more pageKey
    const paginationComplete = !pageKey;

    // 🚀 NEW (Jan 2026): Enrich with Wield metadata for supported collections
    // Wield has more reliable metadata than Alchemy for Vibechain collections
    let finalNfts = allNfts;
    if (isWieldSupported(contract) && allNfts.length > 0) {
      console.log(`🔄 Enriching ${allNfts.length} NFTs with Wield metadata...`);
      finalNfts = await enrichNFTsWithWield(allNfts, contract);
    }

    // Cache successful results with pagination status AND balance for smart caching
    // For VibeFID: mark cache as alchemyRefreshed=true so we know it has fresh metadata
    if (finalNfts.length > 0) {
      setNftCache(owner, contract, finalNfts, paginationComplete, currentBalance, needsVibeFIDRefresh);
      console.log(`✅ Fetched ${finalNfts.length} NFTs in ${pageCount} page(s), pagination complete: ${paginationComplete}`);

      // Mark VibeFID refresh timestamp so we don't refresh again for 24h
      if (needsVibeFIDRefresh) {
        markVibeFIDRefreshed();
        console.log('✅ VibeFID metadata refresh completed, next refresh in 24h');
      }
    }

    return finalNfts;

  } catch (error: any) {
    // If we have cached data, use it as fallback (even if incomplete)
    if (cached && cached.nfts && cached.nfts.length > 0) {
      console.warn(`⚠️ Alchemy failed, using cached data: ${cached.nfts.length} cards`);
      if (onProgress) onProgress(1, cached.nfts.length);
      return cached.nfts;
    }

    // For VibeFID contract, try Convex fallback
    const vibefidContract = '0x60274a138d026e3cb337b40567100fdec3127565';
    if (contract.toLowerCase() === vibefidContract.toLowerCase()) {
      console.log('🔄 Trying VibeFID Convex fallback...');
      const convexCards = await fetchVibeFIDFromConvex(owner);
      if (convexCards.length > 0) {
        // Cache the result (VibeFID from Convex is always complete)
        // Mark as alchemyRefreshed=true since Convex data is the source of truth
        setNftCache(owner, contract, convexCards, true, currentBalance, true);
        if (onProgress) onProgress(1, convexCards.length);
        return convexCards;
      }
    }

    // No cache or fallback available - rethrow error
    console.error(`❌ Alchemy API error and no fallback available:`, error.message);
    throw error;
  }
}

/**
 * Fetch and process NFTs with full metadata enrichment
 * OPTIMIZED: Uses balanceOf check to only fetch from collections where user has NFTs
 *
 * @param owner Wallet address
 * @param options Processing options
 * @returns Array of enriched NFT objects
 */
export async function fetchAndProcessNFTs(
  owner: string,
  options: {
    maxPages?: number;
    refreshMetadata?: boolean;
    skipBalanceCheck?: boolean; // Force fetch all (for refresh button)
  } = {}
): Promise<any[]> {
  const { maxPages = 20, refreshMetadata = false, skipBalanceCheck = false } = options;

  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");

  // Get all enabled collections
  const { getEnabledCollections, getCollectionContract } = await import('@/lib/collections/index');
  const enabledCollections = getEnabledCollections();

  // Filter out 'nothing' collection (no contract)
  const nftCollections = enabledCollections.filter(c => c.contractAddress);

  let collectionsToFetch = nftCollections;

  // OPTIMIZATION RE-ENABLED (Jan 2026): Fixed RPC balance check
  // - '0x' is now correctly treated as 0 balance (not error)
  // - Caching works for users with 0 NFTs
  // - Only falls back to Alchemy ALL if ALL RPCs fail
  // - RPC errors now use cache instead of Alchemy fallback
  let balances: Record<string, number> = {};

  if (!skipBalanceCheck) {
    console.log(`🚀 OPTIMIZATION: Checking balances via free RPC before Alchemy...`);
    const result = await checkCollectionBalances(owner, nftCollections);
    collectionsToFetch = result.collectionsWithNfts as typeof nftCollections;
    balances = result.balances;

    if (collectionsToFetch.length < nftCollections.length) {
      console.log(`💰 Saved ${nftCollections.length - collectionsToFetch.length} Alchemy calls!`);
    } else if (collectionsToFetch.length === 0) {
      // Check if we have cached data for collections with RPC errors
      const errorCollections = nftCollections.filter(c =>
        c.contractAddress && balances[c.contractAddress.toLowerCase()] === -1
      );

      if (errorCollections.length > 0) {
        console.log(`📦 Checking cache for ${errorCollections.length} collections with RPC errors...`);
      } else {
        console.log(`✅ User has 0 NFTs - no Alchemy calls needed`);
      }
    }
  } else {
    console.log(`📦 Fetching ALL ${nftCollections.length} collections from Alchemy (balance check skipped)`);
  }

  const allNfts: any[] = [];

  // Fetch NFTs only from collections where user has balance > 0
  for (const collection of collectionsToFetch) {
    try {
      const nfts = await fetchNFTs(owner, collection.contractAddress);
      // Tag each NFT with its collection
      const tagged = nfts.map(nft => ({ ...nft, collection: collection.id }));
      allNfts.push(...tagged);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch from ${collection.displayName}:`, error);
    }
  }

  // 🚀 NEW: Also include cached NFTs for collections with RPC errors
  // This ensures users still see their NFTs even when RPCs are unreliable
  if (!skipBalanceCheck) {
    const errorCollections = nftCollections.filter(c =>
      c.contractAddress && balances[c.contractAddress.toLowerCase()] === -1
    );

    for (const collection of errorCollections) {
      const cached = getNftCache(owner, collection.contractAddress);
      if (cached && cached.nfts.length > 0) {
        console.log(`📦 Using cached NFTs for ${collection.displayName}: ${cached.nfts.length} cards`);
        const tagged = cached.nfts.map((nft: any) => ({ ...nft, collection: collection.id }));
        allNfts.push(...tagged);
      }
    }
  }

  // Also include 'nothing' collection cards from Convex (if any)
  // These are free cards stored in the database, not on-chain

  // Enrich with metadata if requested
  const enriched = await Promise.all(
    allNfts.map(async (nft) => {
      const contractAddr = nft?.contract?.address?.toLowerCase();
      const isVibeFID = contractAddr === getCollectionContract('vibefid')?.toLowerCase();

      // Get image URL (handles VibeFID video detection)
      const imageUrl = await getImage(nft, isVibeFID ? 'vibefid' : undefined);

      // Extract attributes
      const { findAttr, isUnrevealed, calcPower } = await import('./attributes');

      const rarity = findAttr(nft, 'rarity');
      const wear = findAttr(nft, 'wear');
      const foil = findAttr(nft, 'foil');
      const power = calcPower(nft, isVibeFID);

      // Skip unopened cards
      if (isUnrevealed(nft)) {
        return null;
      }

      return {
        ...nft,
        imageUrl,
        rarity,
        wear,
        foil,
        power,
        name: nft?.raw?.metadata?.name || nft?.name || `#${nft.tokenId}`,
      };
    })
  );

  // Filter out null values (unopened cards) and deduplicate by unique ID
  const validCards = enriched.filter(Boolean);

  // Deduplicate using collection + tokenId as unique key
  const seen = new Set<string>();
  const deduped = validCards.filter((card: any) => {
    const uniqueId = card.collection ? `${card.collection}_${card.tokenId}` : card.tokenId;
    if (seen.has(uniqueId)) {
      console.warn(`⚠️ Duplicate card filtered: ${uniqueId}`);
      return false;
    }
    seen.add(uniqueId);
    return true;
  });

  return deduped;
}

/**
 * 🚀 NEW: Fetch NFTs using server-side cached API
 *
 * Uses /api/nfts/[address] endpoint which:
 * 1. Checks Convex cache first (10 min TTL)
 * 2. Only calls Alchemy on cache miss
 * 3. Saves results to Convex for next time
 *
 * Benefits:
 * - Server-side cache works across all users
 * - Reduces Alchemy calls by ~90%
 * - Faster than direct Alchemy for cached users
 *
 * @param owner Wallet address
 * @param forceRefresh Skip cache and force Alchemy fetch
 * @returns Array of NFT objects
 */
export async function fetchNFTsWithCache(
  owner: string,
  forceRefresh: boolean = false
): Promise<any[]> {
  console.log(`🚀 [fetchNFTsWithCache] Fetching for ${owner.slice(0, 10)}... (refresh=${forceRefresh})`);

  try {
    const url = `/api/nfts/${owner}${forceRefresh ? '?refresh=true' : ''}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'API failed');
    }

    console.log(`✅ [fetchNFTsWithCache] Got ${data.totalNfts} NFTs (cache: ${data.stats?.cacheHits || 0}, alchemy: ${data.stats?.alchemyCalls || 0})`);

    return data.nfts || [];

  } catch (error: any) {
    console.error(`❌ [fetchNFTsWithCache] Failed, falling back to direct fetch:`, error.message);
    // Fallback to existing method
    return fetchAndProcessNFTs(owner, { skipBalanceCheck: false });
  }
}

/**
 * Clear server-side NFT cache for an address
 * Call this when user buys/sells NFTs
 */
export async function clearServerNftCache(owner: string): Promise<void> {
  try {
    // This would need to call a mutation, but we can't do that directly from client
    // Instead, the next fetch with forceRefresh=true will update the cache
    console.log(`🗑️ [clearServerNftCache] Use forceRefresh=true on next fetch for ${owner.slice(0, 10)}...`);
  } catch (error) {
    console.warn('Failed to clear server cache:', error);
  }
}
