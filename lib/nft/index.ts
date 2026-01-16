/**
 * NFT MODULE - Sistema centralizado para busca e filtro de NFTs
 *
 * IMPORTE DAQUI EM TODO LUGAR!
 *
 * Uso:
 *   import { fetchPlayerCards, filterUnopened, isRevealed } from '@/lib/nft';
 */

// Re-export de card-filter (includes isSameCard, findCard, hasCard, getCardKey)
export * from './card-filter';

// Re-export funções de attributes
export { findAttr, calcPower, normalizeUrl, isUnrevealed } from './attributes';

// Re-export funções de fetcher
export { getImage, fetchNFTs, getAlchemyStatus, checkCollectionBalances } from './fetcher';

import { fetchNFTs, getImage, checkCollectionBalances } from './fetcher';
import { findAttr, calcPower } from './attributes';
import { filterUnopened } from './card-filter';
import { getEnabledCollections, type CollectionId } from '@/lib/collections/index';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import type { Card, CardRarity, CardFoil } from '@/lib/types/card';

/**
 * Busca NFTs de todas as coleções habilitadas para um endereço
 *
 * 🚀 OPTIMIZATION (Jan 2026):
 * - Uses free Base RPC to check balanceOf before Alchemy calls
 * - Passes balance to fetchNFTs for smart caching
 * - If balance unchanged, uses cached NFTs indefinitely (no Alchemy call!)
 * - Parallel fetching with batches of 3 collections
 * - 200ms delay between batches to avoid rate limits
 */
export async function fetchNFTsFromAllCollections(owner: string): Promise<any[]> {
  const enabledCollections = getEnabledCollections().filter(c => c.contractAddress);
  console.log('🎴 [NFT] Fetching from', enabledCollections.length, 'collections with smart caching');

  // STEP 1: Check balances via free RPC (for smart caching)
  const { collectionsWithNfts, balances } = await checkCollectionBalances(owner, enabledCollections);

  // Log savings from RPC optimization
  const savedCalls = enabledCollections.length - collectionsWithNfts.length;
  if (savedCalls > 0) {
    console.log(`💰 [NFT] RPC Optimization: Saved ${savedCalls} Alchemy calls (no NFTs)`);
  }

  const allNfts: any[] = [];
  const COLLECTION_BATCH_SIZE = 3;

  // STEP 2: Fetch only from collections with NFTs, passing balance for smart caching
  for (let i = 0; i < collectionsWithNfts.length; i += COLLECTION_BATCH_SIZE) {
    const batch = collectionsWithNfts.slice(i, i + COLLECTION_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (collection) => {
        // 🚀 SMART CACHING: Pass balance - if unchanged, uses cached data indefinitely
        const balance = balances[collection.contractAddress.toLowerCase()];
        const nfts = await fetchNFTs(owner, collection.contractAddress, undefined, balance);
        return nfts.map(nft => ({ ...nft, collection: collection.id }));
      })
    );

    // Collect results from this batch
    results.forEach((result, idx) => {
      const collection = batch[idx];
      if (result.status === 'fulfilled') {
        allNfts.push(...result.value);
        console.log(`✓ ${collection.displayName}: ${result.value.length} NFTs`);
      } else {
        console.error(`✗ ${collection.displayName} failed:`, result.reason);
      }
    });

    // 200ms delay between batches to avoid rate limits
    if (i + COLLECTION_BATCH_SIZE < collectionsWithNfts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`✅ [NFT] Total NFTs: ${allNfts.length}`);
  return allNfts;
}

/**
 * 🔗 MULTI-WALLET: Busca NFTs de todas as wallets linkadas
 * Agrega NFTs de todas as wallets em uma lista única
 *
 * 🚀 OPTIMIZATION: Parallel fetching with batches of 2 wallets
 * - 3-5x faster for users with multiple linked wallets
 * - Batching prevents Alchemy rate limiting
 *
 * @param addresses - Array de endereços (primary + linked)
 */
export async function fetchNFTsFromMultipleWallets(addresses: string[]): Promise<any[]> {
  if (!addresses || addresses.length === 0) return [];

  console.log(`🔗 [NFT] Fetching from ${addresses.length} wallet(s) in parallel...`);

  const allNfts: any[] = [];
  const WALLET_BATCH_SIZE = 2; // Fetch 2 wallets in parallel to avoid rate limits

  // Process wallets in parallel batches
  for (let i = 0; i < addresses.length; i += WALLET_BATCH_SIZE) {
    const batch = addresses.slice(i, i + WALLET_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (address) => {
        const nfts = await fetchNFTsFromAllCollections(address);
        // Tag each NFT with the owner address for reference
        return nfts.map(nft => ({ ...nft, ownerAddress: address.toLowerCase() }));
      })
    );

    // Collect results from this batch
    results.forEach((result, idx) => {
      const address = batch[idx];
      if (result.status === 'fulfilled') {
        allNfts.push(...result.value);
        console.log(`✓ Wallet ${address.slice(0,8)}...: ${result.value.length} NFTs`);
      } else {
        console.error(`✗ Wallet ${address.slice(0,8)}... failed:`, result.reason);
      }
    });

    // Small delay between batches to be nice to Alchemy
    if (i + WALLET_BATCH_SIZE < addresses.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Deduplicate by collection + tokenId (same NFT might appear if transferred between linked wallets)
  const seen = new Set<string>();
  const deduplicated = allNfts.filter(nft => {
    const key = `${nft.collection || 'default'}-${nft.tokenId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`✅ [NFT] Total from all wallets: ${allNfts.length} → ${deduplicated.length} unique`);
  return deduplicated;
}

/**
 * Processa NFTs raw em Cards utilizáveis
 * Já filtra cards unopened automaticamente
 * LÓGICA IDÊNTICA À HOME PAGE!
 */
export async function processNFTsToCards(rawNfts: any[]): Promise<Card[]> {
  const processed: (Card & { status?: string })[] = [];

  for (const nft of rawNfts) {
    try {
      const name = nft.name || nft.title || `#${nft.tokenId}`;
      const rarity = findAttr(nft, 'Rarity') || findAttr(nft, 'rarity') || 'Common';
      const status = findAttr(nft, 'Status') || findAttr(nft, 'status') || '';
      const foil = findAttr(nft, 'Foil') || findAttr(nft, 'foil') || 'None';
      const isVibeFID = nft.collection === 'vibefid';
      const power = calcPower(nft, isVibeFID);

      const rawImageUrl = await getImage(nft, nft.collection);
      const imageUrl = rawImageUrl ? (convertIpfsUrl(rawImageUrl) || rawImageUrl) : '/placeholder.png';

      processed.push({
        tokenId: nft.tokenId,
        name,
        imageUrl,
        rarity: rarity as CardRarity,
        status, // Para filtro de unopened
        foil: foil as CardFoil,
        power,
        collection: nft.collection as CollectionId,
      });
    } catch (e) {
      console.error('Error processing NFT:', nft.tokenId, e);
    }
  }

  // Filtra unopened - LÓGICA IDÊNTICA À HOME PAGE!
  // Checa rarity !== 'unopened' && status !== 'unopened'
  const revealed = filterUnopened(processed);
  console.log(`📊 [NFT] Processed: ${processed.length} → ${revealed.length} revealed`);

  return revealed;
}

/**
 * Busca e processa cards de um jogador (tudo em um)
 * Retorna cards já filtrados e prontos para uso
 */
export async function fetchPlayerCards(address: string): Promise<Card[]> {
  const raw = await fetchNFTsFromAllCollections(address);
  const cards = await processNFTsToCards(raw);

  // Deduplica
  const seen = new Set<string>();
  const deduplicated = cards.filter(card => {
    const key = `${card.collection || 'default'}-${card.tokenId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduplicated;
}

/**
 * Conta cards revelados e não revelados de uma lista de NFTs raw
 */
export function countRevealedUnopened(rawNfts: any[]): { revealed: number; unopened: number } {
  let revealed = 0;
  let unopened = 0;

  for (const nft of rawNfts) {
    const rarity = (findAttr(nft, 'rarity') || '').toLowerCase();
    if (rarity === 'unopened') {
      unopened++;
    } else {
      revealed++;
    }
  }

  return { revealed, unopened };
}
