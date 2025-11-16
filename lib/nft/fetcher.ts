/**
 * NFT Fetching Utilities
 *
 * Extracted from app/page.tsx for reusability
 * Handles Alchemy API interactions and image caching
 */

import { normalizeUrl } from "./attributes";
import { devWarn } from "@/lib/utils/logger";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

// Image URL cache
const imageUrlCache = new Map<string, { url: string; timestamp: number }>();
const IMAGE_CACHE_TIME = 1000 * 60 * 60; // 1 hour

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
 */
export async function getImage(nft: any): Promise<string> {
  const tid = nft.tokenId;
  const cached = getFromCache(tid);
  if (cached) return cached;

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

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20; // Reduced from 70 - most users have < 2000 NFTs

  do {
    pageCount++;
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;

    // Retry logic for rate limiting (429)
    let res: Response;
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      res = await fetch(url);

      if (res.status === 429 && retries < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retries) * 1000;
        console.log(`⏳ Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }

      break;
    }

    if (!res!.ok) throw new Error(`API falhou: ${res!.status}`);
    const json = await res!.json();

    // Don't filter here - some NFTs don't have attributes cached in Alchemy
    // Filter after metadata refresh instead (like profile page does)
    const pageNfts = json.ownedNfts || [];
    allNfts = allNfts.concat(pageNfts);

    // Report progress
    if (onProgress) {
      onProgress(pageCount, allNfts.length);
    }

    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}
