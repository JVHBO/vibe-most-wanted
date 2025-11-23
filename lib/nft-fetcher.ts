/**
 * Unified NFT Fetcher
 *
 * This module provides a consistent way to fetch and process NFTs across the application.
 * Uses the same logic as the profile page which works correctly.
 */

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Image cache
const imageUrlCache = new Map<string, { url: string; time: number }>();
const IMAGE_CACHE_TIME = 1000 * 60 * 60; // 1 hour

const getFromCache = (key: string): string | null => {
  const item = imageUrlCache.get(key);
  if (!item) return null;
  const timeDiff = Date.now() - item.time;
  if (timeDiff > IMAGE_CACHE_TIME) {
    imageUrlCache.delete(key);
    return null;
  }
  return item.url;
};

const setCache = (key: string, value: string): void => {
  imageUrlCache.set(key, { url: value, time: Date.now() });
};

// URL normalization
function normalizeUrl(url: string): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.io/ipfs/' + u.slice(7);
  else if (u.startsWith('ipfs/')) u = 'https://ipfs.io/ipfs/' + u.slice(5);
  u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

// Get image URL with caching
async function getImage(nft: any): Promise<string> {
  const tid = nft.tokenId;
  const cached = getFromCache(tid);
  if (cached) return cached;

  const extractUrl = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.url || value.cachedUrl || value.originalUrl || value.gateway || null;
    return null;
  };

  try {
    const uri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
    if (uri) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(uri, { signal: controller.signal });
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
    }
  } catch (error) {
    console.warn(`⚠️ Failed to fetch image from tokenUri for NFT #${tid}:`, error);
  }

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

  const alchemyUrls = [
    extractUrl(nft?.image?.cachedUrl),
    extractUrl(nft?.image?.thumbnailUrl),
    extractUrl(nft?.image?.pngUrl),
    extractUrl(nft?.image?.originalUrl),
  ];

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

  const placeholder = `https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`;
  setCache(tid, placeholder);
  return placeholder;
}

// Find attribute helper - Flexible matching for multiple NFT metadata formats
function findAttr(nft: any, trait: string): string {
  const locs = [
    nft?.raw?.metadata?.attributes,
    nft?.metadata?.attributes,
    nft?.metadata?.traits,
    nft?.raw?.metadata?.traits
  ];
  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;
    const found = attrs.find((a: any) => {
      // Handle multiple property name variants: trait_type, traitType, name
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      // Flexible matching: exact match or includes
      return traitType === searchTrait || traitType.includes(searchTrait) || searchTrait.includes(traitType);
    });
    if (found) {
      // Handle multiple value property variants: value, trait_value, displayType
      return String(found?.value || found?.trait_value || found?.displayType || '').trim();
    }
  }
  return '';
}

// Calculate power (matching tutorial system)
function calcPower(nft: any): number {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  // Base power by rarity (from tutorial)
  let base = 5;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 800;
  else if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 80;
  else if (r.includes('rare')) base = 20;
  else if (r.includes('common')) base = 5;
  else base = 5;

  // Wear multiplier (from tutorial: Pristine=×1.8, Mint=×1.4, Others=×1.0)
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.8;
  else if (w.includes('mint')) wearMult = 1.4;

  // Foil multiplier (from tutorial: Prize=×15, Standard=×2.5)
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

/**
 * Fetch raw NFTs from Alchemy (without filtering)
 */
async function fetchRawNFTs(
  owner: string,
  contractAddress?: string,
  maxPages: number = 20,
  targetTokenIds?: string[]
): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key not configured");
  if (!CHAIN) throw new Error("Chain not configured");
  const contract = contractAddress || CONTRACT_ADDRESS;
  if (!contract) throw new Error("Contract address not configured");

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;

  // If targetTokenIds provided, track which ones we've found
  const targetsToFind = targetTokenIds ? new Set(targetTokenIds.map(String)) : null;

  do {
    pageCount++;
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API failed: ${res.status}`);
    const json = await res.json();
    const pageNfts = json.ownedNfts || [];
    allNfts = allNfts.concat(pageNfts);

    // ✅ Early stopping: if we found all target token IDs, stop fetching
    if (targetsToFind) {
      for (const nft of pageNfts) {
        targetsToFind.delete(String(nft.tokenId));
      }
      // Stop if we found all targets
      if (targetsToFind.size === 0) {
        console.log(`✅ Found all ${targetTokenIds?.length} target cards, stopping early`);
        break;
      }
    }

    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

/**
 * Refresh metadata from tokenUri (get fresh data, not cached)
 */
async function refreshMetadata(nfts: any[], batchSize: number = 50): Promise<any[]> {
  const enriched = [];

  for (let i = 0; i < nfts.length; i += batchSize) {
    const batch = nfts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (nft) => {
        const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
        if (!tokenUri) return nft;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(tokenUri, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = await res.json();
            // Merge fresh metadata
            return { ...nft, raw: { ...nft.raw, metadata: json } };
          }
        } catch (error) {
          console.warn(`⚠️ Failed to refresh metadata for NFT #${nft.tokenId}:`, error);
        }
        return nft;
      })
    );
    enriched.push(...batchResults);
  }

  return enriched;
}

/**
 * Enrich NFTs with images and attributes
 */
async function enrichWithImages(nfts: any[], batchSize: number = 50): Promise<any[]> {
  const enriched = [];

  // Helper function to determine collection from contract address
  const getCollectionFromContract = (nft: any): string => {
    const contractAddr = nft?.contract?.address?.toLowerCase();

    // GM VBRS collection
    if (contractAddr === '0xefe512e73ca7356c20a21aa9433bad5fc9342d46') {
      return 'gmvbrs';
    }

    // American Football collection (AFCL)
    if (contractAddr === '0xe3910325daaef5d969e6db5eca1ff0117bb160ae') {
      return 'americanfootball';
    }

    // VibeFID collection
    if (contractAddr === '0x60274a138d026e3cb337b40567100fdec3127565') {
      return 'vibefid';
    }

    // Default to VBMS collection
    return 'vibe';
  };

  for (let i = 0; i < nfts.length; i += batchSize) {
    const batch = nfts.slice(i, i + batchSize);
    const batchEnriched = await Promise.all(
      batch.map(async (nft) => {
        const imageUrl = await getImage(nft);
        return {
          ...nft,
          imageUrl,
          rarity: findAttr(nft, 'rarity'),
          status: findAttr(nft, 'status'),
          wear: findAttr(nft, 'wear'),
          foil: findAttr(nft, 'foil'),
          power: calcPower(nft),
          collection: getCollectionFromContract(nft),
        };
      })
    );
    enriched.push(...batchEnriched);
  }

  return enriched;
}

/**
 * Main function: Fetch and fully process NFTs
 * This is the same logic that works correctly in the profile page
 */
export async function fetchAndProcessNFTs(
  owner: string,
  options: {
    contractAddress?: string;
    maxPages?: number;
    metadataBatchSize?: number;
    imageBatchSize?: number;
    refreshMetadata?: boolean;
    targetTokenIds?: string[]; // ✅ NEW: For early stopping when specific cards are found
  } = {}
): Promise<any[]> {
  const {
    contractAddress,
    maxPages = 20,
    metadataBatchSize = 50,
    imageBatchSize = 50,
    refreshMetadata: shouldRefreshMetadata = true,
    targetTokenIds,
  } = options;

  let rawNFTs: any[] = [];

  // If no contractAddress specified, fetch from ALL enabled collections
  if (!contractAddress) {
    const { getEnabledCollections } = await import('@/lib/collections');
    const enabledCollections = getEnabledCollections();

    console.log(`📡 Fetching NFTs from ${enabledCollections.length} collections...`);

    for (const collection of enabledCollections) {
      try {
        console.log(`📡 Fetching from ${collection.displayName} (${collection.contractAddress})`);
        const nfts = await fetchRawNFTs(owner, collection.contractAddress, maxPages, targetTokenIds);
        // Tag each NFT with its collection
        const tagged = nfts.map(nft => ({ ...nft, collection: collection.id }));
        rawNFTs.push(...tagged);
        console.log(`✓ Found ${nfts.length} NFTs from ${collection.displayName}`);
      } catch (error) {
        console.error(`✗ Failed to fetch from ${collection.displayName}:`, error);
      }
    }
  } else {
    // Fetch from specific contract
    rawNFTs = await fetchRawNFTs(owner, contractAddress, maxPages, targetTokenIds);
  }

  // Step 2: Refresh metadata (optional but recommended for accurate data)
  let processedNFTs = rawNFTs;
  if (shouldRefreshMetadata) {
    processedNFTs = await refreshMetadata(rawNFTs, metadataBatchSize);
  }

  // Step 3: Enrich with images and attributes
  const enrichedNFTs = await enrichWithImages(processedNFTs, imageBatchSize);

  return enrichedNFTs;
}

// Export helper functions for specific use cases
export { fetchRawNFTs, refreshMetadata, enrichWithImages, calcPower, findAttr, normalizeUrl };
