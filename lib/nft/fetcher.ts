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
// Multiple RPC endpoints for fallback (rotate to avoid rate limiting)
const BASE_RPCS = [
  'https://base.llamarpc.com',
  'https://base-mainnet.public.blastapi.io',
  'https://mainnet.base.org',
];

// Image URL cache
const imageUrlCache = new Map<string, { url: string; timestamp: number }>();
const IMAGE_CACHE_TIME = 1000 * 60 * 60; // 1 hour

// NFT response cache (persisted in localStorage for longer persistence)
const NFT_CACHE_KEY = 'vbms_nft_cache_v3'; // v3 for localStorage migration
const NFT_CACHE_TIME = 1000 * 60 * 10; // 10 minutes cache

// Balance cache (to detect changes without Alchemy)
const BALANCE_CACHE_KEY = 'vbms_balance_cache_v1';
const BALANCE_CACHE_TIME = 1000 * 60 * 5; // 5 minutes for balance check

// Lock to prevent duplicate balance checks (Page and Context calling simultaneously)
let balanceCheckInProgress: Promise<{ collectionsWithNfts: any[]; balances: Record<string, number> }> | null = null;
let balanceCheckOwner: string | null = null;

// Track if Alchemy API is blocked
let alchemyBlocked = false;
let lastAlchemyError: string | null = null;

interface NftCacheEntry {
  owner: string;
  contract: string;
  nfts: any[];
  timestamp: number;
  paginationComplete: boolean;
}

interface BalanceCacheEntry {
  owner: string;
  balances: Record<string, number>; // contract -> balance
  timestamp: number;
}

/**
 * Check NFT balance for a single contract
 */
async function checkSingleBalance(
  owner: string,
  contractAddress: string,
  rpc: string
): Promise<number> {
  const balanceOfSelector = '0x70a08231';
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
  const data = balanceOfSelector + ownerPadded;

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
    });

    const json = await res.json();

    if (json.error) {
      return -1;
    }

    if (json.result && json.result !== '0x') {
      return parseInt(json.result, 16);
    }

    return 0;
  } catch {
    return -1;
  }
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
  let currentRpcIndex = 0;

  console.log(`🚀 Checking ${contractAddresses.length} contracts in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < contractAddresses.length; i += BATCH_SIZE) {
    const batch = contractAddresses.slice(i, i + BATCH_SIZE);

    // Add delay between batches (except first)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }

    // Check this batch in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      batch.map(async (addr) => {
        // Try each RPC until one works
        for (let rpcTry = 0; rpcTry < BASE_RPCS.length; rpcTry++) {
          const rpc = BASE_RPCS[(currentRpcIndex + rpcTry) % BASE_RPCS.length];
          const balance = await checkSingleBalance(owner, addr, rpc);
          if (balance !== -1) {
            return { addr, balance };
          }
        }
        return { addr, balance: -1 };
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

    // Rotate RPC for next batch to distribute load
    currentRpcIndex = (currentRpcIndex + 1) % BASE_RPCS.length;
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
  const cached = getBalanceCache(owner);
  if (cached) {
    console.log(`📦 Using cached balances for ${owner.slice(0, 10)}...`);
    const collectionsWithNfts = collections.filter(c =>
      c.contractAddress && (cached.balances[c.contractAddress.toLowerCase()] || 0) > 0
    );
    return { collectionsWithNfts, balances: cached.balances };
  }

  // If another check is in progress for the same owner, wait for it
  if (balanceCheckInProgress && balanceCheckOwner === owner.toLowerCase()) {
    console.log(`⏳ Waiting for existing balance check...`);
    return balanceCheckInProgress as Promise<{ collectionsWithNfts: typeof collections; balances: Record<string, number> }>;
  }

  // Start new check with lock
  balanceCheckOwner = owner.toLowerCase();
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

    // Cache the results ONLY if we got valid responses (no -1 errors) and at least one collection has NFTs
    const hasErrors = Object.values(balances).some(b => b === -1);
    const hasAnyNfts = Object.values(balances).some(b => b > 0);

    if (hasAnyNfts && !hasErrors) {
      setBalanceCache(owner, balances);
      console.log(`💾 Cached balances for ${owner.slice(0, 10)}...`);
    } else if (hasErrors) {
      console.log(`⚠️ Not caching - had ${errors} RPC errors`);
    } else {
      console.log(`⚠️ Not caching - no NFTs found for ${owner.slice(0, 10)}...`);
    }

    // Collections with NFTs OR with errors (need to check via Alchemy)
    const collectionsWithNfts = collections.filter(c =>
      c.contractAddress && (
        (balances[c.contractAddress.toLowerCase()] || 0) > 0 ||
        balances[c.contractAddress.toLowerCase()] === -1
      )
    );

    console.log(`📊 Found NFTs in ${nftsFound} of ${collections.length} collections`);

    // Clear lock
    balanceCheckInProgress = null;
    balanceCheckOwner = null;

    return { collectionsWithNfts, balances };
  })();

  return balanceCheckInProgress as Promise<{ collectionsWithNfts: typeof collections; balances: Record<string, number> }>;
}

function getBalanceCache(owner: string): BalanceCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
    if (!cached) return null;
    const entry: BalanceCacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > BALANCE_CACHE_TIME) {
      localStorage.removeItem(`${BALANCE_CACHE_KEY}_${owner.toLowerCase()}`);
      return null;
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

function getNftCache(owner: string, contract: string): { nfts: any[]; complete: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    // Try localStorage first (new), then sessionStorage (legacy)
    let cached = localStorage.getItem(`${NFT_CACHE_KEY}_${owner}_${contract}`);
    if (!cached) {
      cached = sessionStorage.getItem(`vbms_nft_cache_v2_${owner}_${contract}`);
    }
    if (!cached) return null;
    const entry: NftCacheEntry = JSON.parse(cached);
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

function setNftCache(owner: string, contract: string, nfts: any[], paginationComplete: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: NftCacheEntry = {
      owner,
      contract,
      nfts,
      timestamp: Date.now(),
      paginationComplete,
    };
    localStorage.setItem(`${NFT_CACHE_KEY}_${owner}_${contract}`, JSON.stringify(entry));
    console.log(`💾 Cached ${nfts.length} NFTs (pagination complete: ${paginationComplete})`);
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
    // Also clear legacy sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('vbms_nft_cache')) {
        sessionStorage.removeItem(key);
      }
    }
    console.log(`🗑️ Cleared ${keysToRemove.length} cache entries`);
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
  if (typeof val === 'object' && val.url) return val.url;
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
    // 🎬 VibeFID MUST use VIDEO URL, never PNG!
    // Priority 1: animation_url (video)
    const animationUrl = nft?.raw?.metadata?.animation_url || nft?.metadata?.animation_url;
    if (animationUrl) {
      console.log(`🎬 VibeFID #${tid} using animation_url:`, animationUrl);
      setCache(tid, animationUrl);
      return animationUrl;
    }

    // Priority 2: raw.metadata.image with filebase.io (video URL)
    const metadataImage = nft?.raw?.metadata?.image || nft?.metadata?.image;
    if (metadataImage && metadataImage.includes('filebase.io')) {
      console.log(`🎬 VibeFID #${tid} using filebase video:`, metadataImage);
      setCache(tid, metadataImage);
      return metadataImage;
    }

    // Priority 3: metadata.image with ipfs (likely video)
    if (metadataImage && (metadataImage.includes('ipfs') || metadataImage.includes('Qm'))) {
      console.log(`🎬 VibeFID #${tid} using IPFS metadata.image:`, metadataImage);
      const normalized = normalizeUrl(metadataImage);
      setCache(tid, normalized);
      return normalized;
    }

    // Priority 4: originalUrl if it's IPFS (likely video)
    const originalUrl = nft?.image?.originalUrl;
    if (originalUrl && (originalUrl.includes('ipfs') || originalUrl.includes('Qm'))) {
      console.log(`🎬 VibeFID #${tid} using originalUrl:`, originalUrl);
      setCache(tid, originalUrl);
      return originalUrl;
    }

    // Priority 5: Try fetching directly from tokenUri to get fresh video URL
    const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
    if (tokenUri) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(tokenUri, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          // Check animation_url first
          if (json.animation_url) {
            console.log(`🎬 VibeFID #${tid} using tokenUri animation_url:`, json.animation_url);
            setCache(tid, json.animation_url);
            return json.animation_url;
          }
          // Then check image
          if (json.image && (json.image.includes('filebase.io') || json.image.includes('ipfs') || json.image.includes('Qm'))) {
            console.log(`🎬 VibeFID #${tid} using tokenUri image:`, json.image);
            const normalized = normalizeUrl(json.image);
            setCache(tid, normalized);
            return normalized;
          }
        }
      } catch (e) {
        console.warn(`⚠️ VibeFID #${tid} tokenUri fetch failed:`, e);
      }
    }

    // Priority 6: cachedUrl but ONLY if it's NOT a PNG (PNG = thumbnail, not video!)
    const cachedUrl = nft?.image?.cachedUrl;
    if (cachedUrl && !cachedUrl.includes('.png') && !cachedUrl.includes('nft-cdn.alchemy')) {
      console.warn(`⚠️ VibeFID #${tid} using cachedUrl fallback:`, cachedUrl);
      setCache(tid, cachedUrl);
      return cachedUrl;
    }

    // ❌ NEVER use PNG for VibeFID! Log error and continue to standard flow
    console.error(`❌ VibeFID #${tid} could not find video URL! All sources returned PNG or undefined. Will use placeholder.`);
    // Return placeholder instead of PNG
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

  // Try Alchemy URLs
  const alchemyUrls = [
    extractUrl(nft?.image?.cachedUrl),
    extractUrl(nft?.image?.thumbnailUrl),
    extractUrl(nft?.image?.pngUrl),
    extractUrl(nft?.image?.originalUrl),
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

/**
 * Fetch all NFTs for an owner from Alchemy API
 * With caching and fallback for when API is blocked/rate-limited
 *
 * @param owner Wallet address
 * @param contractAddress Optional contract filter (defaults to env var)
 * @param onProgress Optional progress callback (page, totalCards)
 * @returns Array of NFT objects
 */
export async function fetchNFTs(
  owner: string,
  contractAddress?: string,
  onProgress?: (page: number, cards: number) => void
): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  const contract = contractAddress || CONTRACT_ADDRESS;
  if (!contract) throw new Error("Contract address não configurado");

  // Check cache first - only use if pagination was complete
  const cached = getNftCache(owner, contract);

  if (cached && cached.nfts.length > 0 && cached.complete) {
    console.log(`📦 Using cached NFTs for ${contract.slice(0, 10)}...: ${cached.nfts.length} cards (pagination complete)`);
    if (onProgress) onProgress(1, cached.nfts.length);
    return cached.nfts;
  }

  console.log(`🔄 Fetching fresh NFTs for ${contract.slice(0, 10)}... (no cache)`)

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20;

  try {
    do {
      pageCount++;
      const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;

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

    // Cache successful results with pagination status
    if (allNfts.length > 0) {
      setNftCache(owner, contract, allNfts, paginationComplete);
      console.log(`✅ Fetched ${allNfts.length} NFTs in ${pageCount} page(s), pagination complete: ${paginationComplete}`);
    }

    return allNfts;

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
        setNftCache(owner, contract, convexCards, true);
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

  // OPTIMIZATION: Check balances first to avoid unnecessary Alchemy calls
  if (!skipBalanceCheck) {
    console.log(`🚀 OPTIMIZATION: Checking balances via free RPC before Alchemy...`);
    const { collectionsWithNfts } = await checkCollectionBalances(owner, nftCollections);
    collectionsToFetch = collectionsWithNfts;

    if (collectionsToFetch.length < nftCollections.length) {
      console.log(`💰 Saved ${nftCollections.length - collectionsToFetch.length} Alchemy calls!`);
    }
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
