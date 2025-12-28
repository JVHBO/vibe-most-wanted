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
export { getImage, fetchNFTs, getAlchemyStatus } from './fetcher';

import { fetchNFTs, getImage } from './fetcher';
import { findAttr, calcPower } from './attributes';
import { filterUnopened } from './card-filter';
import { getEnabledCollections, type CollectionId } from '@/lib/collections/index';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import type { Card, CardRarity, CardFoil } from '@/lib/types/card';

/**
 * Busca NFTs de todas as coleções habilitadas para um endereço
 */
export async function fetchNFTsFromAllCollections(owner: string): Promise<any[]> {
  const enabledCollections = getEnabledCollections();
  console.log('🎴 [NFT] Fetching from', enabledCollections.length, 'collections');

  const allNfts: any[] = [];

  for (const collection of enabledCollections) {
    if (!collection.contractAddress) {
      console.log(`⏭️ Skipping ${collection.displayName} - no contract`);
      continue;
    }

    try {
      console.log(`📡 Fetching ${collection.displayName}...`);
      const nfts = await fetchNFTs(owner, collection.contractAddress);
      const tagged = nfts.map(nft => ({ ...nft, collection: collection.id }));
      allNfts.push(...tagged);
      console.log(`✓ ${collection.displayName}: ${nfts.length} NFTs`);
    } catch (error) {
      console.error(`✗ ${collection.displayName} failed:`, error);
    }
  }

  console.log(`✅ [NFT] Total NFTs: ${allNfts.length}`);
  return allNfts;
}

/**
 * 🔗 MULTI-WALLET: Busca NFTs de todas as wallets linkadas
 * Agrega NFTs de todas as wallets em uma lista única
 *
 * @param addresses - Array de endereços (primary + linked)
 */
export async function fetchNFTsFromMultipleWallets(addresses: string[]): Promise<any[]> {
  if (!addresses || addresses.length === 0) return [];

  console.log(`🔗 [NFT] Fetching from ${addresses.length} wallet(s)...`);

  const allNfts: any[] = [];

  for (const address of addresses) {
    try {
      const nfts = await fetchNFTsFromAllCollections(address);
      // Tag each NFT with the owner address for reference
      const taggedNfts = nfts.map(nft => ({ ...nft, ownerAddress: address.toLowerCase() }));
      allNfts.push(...taggedNfts);
      console.log(`✓ Wallet ${address.slice(0,8)}...: ${nfts.length} NFTs`);
    } catch (error) {
      console.error(`✗ Wallet ${address.slice(0,8)}... failed:`, error);
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
