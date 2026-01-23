/**
 * Wield API Fetcher - Optimized NFT loading for vibechain collections
 *
 * Strategy:
 * 1. /owner/{address} - Get list of tokenIds (1 call per collection)
 * 2. Cache token metadata permanently (wear/foil never change)
 * 3. Only fetch metadata for NEW tokens
 * 4. Fallback to Alchemy if Wield fails
 */

const WIELD_API_KEY = 'YUEPI-G3KJ7-5FCXV-ANSPV-BZ3DA';
const WIELD_BASE_URL = 'https://build.wield.xyz/vibe/boosterbox';

// Collections that work with Wield API (ONLY ENABLED ONES!)
// NOTE: vibefid = not boosterbox, nothing = Convex only (no contract)
export const WIELD_COLLECTIONS: Record<string, { contract: string; slug: string }> = {
  vibe: { contract: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728', slug: 'vibe-most-wanted' },
  viberotbangers: { contract: '0x120c612d79a3187a3b8b4f4bb924cebe41eb407a', slug: 'vibe-rot-bangers' },
  meowverse: { contract: '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150', slug: 'meowverse' },
  gmvbrs: { contract: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46', slug: 'gm-vbrs' },
  viberuto: { contract: '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f', slug: 'viberuto-packs' },
  cumioh: { contract: '0xfeabae8bdb41b2ae507972180df02e70148b38e1', slug: 'cu-mi-oh' },
};

// Cache keys
const OWNER_CACHE_KEY = 'wield_owner_cache';
const TOKEN_CACHE_KEY = 'wield_token_cache';
const OWNER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface WieldToken {
  tokenId: number;
  collection: string;
  rarity: string;
  rarityName: string;
  status: string;
  foil?: string;
  wear?: string;
  wearValue?: number;
  name?: string;
  imageUrl?: string;
}

interface OwnerCache {
  [address: string]: {
    [collection: string]: {
      tokenIds: number[];
      timestamp: number;
    };
  };
}

interface TokenCache {
  [key: string]: WieldToken; // key = "collection:tokenId"
}

// Get cache from localStorage
function getOwnerCache(): OwnerCache {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(OWNER_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getTokenCache(): TokenCache {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(TOKEN_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveOwnerCache(cache: OwnerCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OWNER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save owner cache:', e);
  }
}

function saveTokenCache(cache: TokenCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save token cache:', e);
  }
}

// Fetch tokens owned by address from Wield (with pagination!)
async function fetchOwnerTokens(
  address: string,
  collection: string
): Promise<number[]> {
  const config = WIELD_COLLECTIONS[collection];
  if (!config) return [];

  const allBoxes: any[] = [];
  let currentPage = 1;
  let totalPages = 1;

  // Fetch all pages
  do {
    const url = `${WIELD_BASE_URL}/owner/${address}?contractAddress=${config.contract}&page=${currentPage}&limit=100`;

    const res = await fetch(url, {
      headers: { 'API-KEY': WIELD_API_KEY },
    });

    if (!res.ok) {
      throw new Error(`Wield owner fetch failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error('Wield API returned error');
    }

    const boxes = data.boxes || [];
    allBoxes.push(...boxes);

    // Update pagination info
    if (data.pagination) {
      totalPages = data.pagination.pages || 1;
      console.log(`[Wield] ${collection} page ${currentPage}/${totalPages}: ${boxes.length} boxes`);
    }

    currentPage++;
  } while (currentPage <= totalPages);

  // Filter to only revealed cards (rarity_assigned = card has rarity, is revealed)
  // minted = NFT exists but card not revealed yet
  const statuses = [...new Set(allBoxes.map((b: any) => b.status))];
  console.log(`[Wield] ${collection} total boxes:`, allBoxes.length, 'statuses:', statuses);

  const filtered = allBoxes.filter((b: any) => b.status === 'rarity_assigned');
  console.log(`[Wield] ${collection} after filter:`, filtered.length);

  return filtered.map((b: any) => b.tokenId);
}

// Fetch individual token metadata
async function fetchTokenMetadata(
  collection: string,
  tokenId: number
): Promise<WieldToken | null> {
  const config = WIELD_COLLECTIONS[collection];
  if (!config) return null;

  // Token metadata doesn't need API key!
  const url = `${WIELD_BASE_URL}/metadata/${config.slug}/${tokenId}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();

  // Extract attributes
  const attrs = data.attributes || [];
  const findAttr = (name: string) =>
    attrs.find((a: any) => a.trait_type?.toLowerCase() === name.toLowerCase())?.value;

  return {
    tokenId,
    collection,
    rarity: findAttr('Rarity') || 'Common',
    rarityName: findAttr('Rarity') || 'Common',
    status: findAttr('Status') || 'rarity_assigned',
    foil: findAttr('Foil') || 'None',
    wear: findAttr('Wear') || 'Lightly Played',
    wearValue: parseFloat(findAttr('Wear Value')) || 0.5,
    name: findAttr('name') || findAttr('Name') || '',
    imageUrl: data.imageUrl || data.image || '',
  };
}

// Batch fetch with rate limiting
async function fetchTokenMetadataBatch(
  collection: string,
  tokenIds: number[]
): Promise<WieldToken[]> {
  const results: WieldToken[] = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 100;

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);

    const promises = batch.map(id => fetchTokenMetadata(collection, id));
    const batchResults = await Promise.all(promises);

    results.push(...batchResults.filter((r): r is WieldToken => r !== null));

    // Small delay between batches to avoid rate limit
    if (i + BATCH_SIZE < tokenIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

/**
 * Main function: Fetch all tokens for a collection with caching
 */
export async function fetchWieldTokens(
  address: string,
  collection: string
): Promise<WieldToken[]> {
  const addrLower = address.toLowerCase();

  // 1. Check owner cache
  const ownerCache = getOwnerCache();
  const cached = ownerCache[addrLower]?.[collection];
  const now = Date.now();

  let tokenIds: number[];

  if (cached && (now - cached.timestamp) < OWNER_CACHE_TTL) {
    // Cache is fresh, use cached tokenIds
    tokenIds = cached.tokenIds;
  } else {
    // Fetch from Wield
    try {
      tokenIds = await fetchOwnerTokens(addrLower, collection);

      // Save to cache
      if (!ownerCache[addrLower]) ownerCache[addrLower] = {};
      ownerCache[addrLower][collection] = { tokenIds, timestamp: now };
      saveOwnerCache(ownerCache);
    } catch (e) {
      console.warn(`Wield fetch failed for ${collection}:`, e);
      // If cache exists (even stale), use it
      if (cached) {
        tokenIds = cached.tokenIds;
      } else {
        return []; // No data available
      }
    }
  }

  if (tokenIds.length === 0) return [];

  // 2. Check token cache for metadata
  const tokenCache = getTokenCache();
  const newTokenIds = tokenIds.filter(id => !tokenCache[`${collection}:${id}`]);

  // 3. Fetch metadata for NEW tokens only
  if (newTokenIds.length > 0) {
    console.log(`[Wield] Fetching ${newTokenIds.length} new ${collection} tokens:`, newTokenIds);
    const newTokens = await fetchTokenMetadataBatch(collection, newTokenIds);
    console.log(`[Wield] Got ${newTokens.length}/${newTokenIds.length} metadata for ${collection}`);

    // Save to token cache (permanent!)
    newTokens.forEach(t => {
      tokenCache[`${collection}:${t.tokenId}`] = t;
    });
    saveTokenCache(tokenCache);
  }

  // 4. Return all tokens from cache
  const result = tokenIds
    .map(id => tokenCache[`${collection}:${id}`])
    .filter((t): t is WieldToken => t !== undefined);

  console.log(`[Wield] ${collection} final: ${result.length}/${tokenIds.length} tokens`);
  return result;
}

/**
 * Fetch all vibechain collections for an address
 */
export async function fetchAllWieldCollections(
  address: string
): Promise<Record<string, WieldToken[]>> {
  const results: Record<string, WieldToken[]> = {};

  // Fetch all collections in parallel (with some limiting)
  const collections = Object.keys(WIELD_COLLECTIONS);
  const PARALLEL_LIMIT = 3;

  for (let i = 0; i < collections.length; i += PARALLEL_LIMIT) {
    const batch = collections.slice(i, i + PARALLEL_LIMIT);
    const promises = batch.map(c =>
      fetchWieldTokens(address, c).then(tokens => ({ collection: c, tokens }))
    );

    const batchResults = await Promise.all(promises);
    batchResults.forEach(r => {
      if (r.tokens.length > 0) {
        results[r.collection] = r.tokens;
      }
    });
  }

  return results;
}

/**
 * Check if a collection is supported by Wield
 */
export function isWieldCollection(collection: string): boolean {
  return collection in WIELD_COLLECTIONS;
}

/**
 * Clear all Wield caches (for debugging)
 */
export function clearWieldCache() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OWNER_CACHE_KEY);
  localStorage.removeItem(TOKEN_CACHE_KEY);
}
