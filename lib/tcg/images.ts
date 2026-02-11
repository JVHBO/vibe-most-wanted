/**
 * TCG Image Helpers - Collection covers and card display image resolution
 */

import type { DeckCard } from "@/lib/tcgRules";
import tcgCardsData from "@/data/vmw-tcg-cards.json";

// Collection cover images - same as Mecha Arena (PokerBattleTable)
export const COLLECTION_COVERS: Record<string, string> = {
  vibefid: '/covers/vibefid-cover.png',
  gmvbrs: 'https://nft-cdn.alchemy.com/base-mainnet/d0de7e9fa12eadb1ea2204e67d43e166',
  vibe: 'https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f',
  viberuto: 'https://nft-cdn.alchemy.com/base-mainnet/ec58759f6df558aa4193d58ae9b0e74f',
  meowverse: 'https://nft-cdn.alchemy.com/base-mainnet/16a8f93f75def1a771cca7e417b5d05e',
  poorlydrawnpepes: 'https://nft-cdn.alchemy.com/base-mainnet/96282462557a81c42fad965a48c34f4c',
  teampothead: 'https://nft-cdn.alchemy.com/base-mainnet/ae56485394d1e5f37322d498f0ea11a0',
  tarot: 'https://nft-cdn.alchemy.com/base-mainnet/72ea458dbad1ce6a722306d811a42252',
  baseballcabal: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F45e455d7-cd23-459b-7ea9-db14c6d36000%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  vibefx: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F5e6058d2-4c64-4cd9-ab57-66a939fec900%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  historyofcomputer: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2Fa1a0d189-44e1-43e3-60dc-e8b053ec0c00%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  cumioh: '/covers/cumioh-cover.png',
  viberotbangers: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fnft-cdn.alchemy.com%2Fbase-mainnet%2F1269ebe2e27ff8a041cb7253fb5687b6',
};

// Get collection cover image URL (same as Mecha Arena)
export const getCollectionCoverUrl = (collection: string | undefined, _rarity: string): string => {
  const collectionKey = collection?.toLowerCase() || "vibe";
  return COLLECTION_COVERS[collectionKey] || '/images/card-back.png';
};

// Build baccarat image URL for VBMS cards
export const getVbmsBaccaratImageUrl = (cardName: string): string | null => {
  if (!cardName) return null;
  const nameLower = cardName.toLowerCase();
  const allCards = tcgCardsData.cards || [];
  const aliases = (tcgCardsData as any).aliases || {};

  // Check if name is an alias first (e.g., "deployer" -> "0xdeployer")
  const resolvedName = Object.entries(aliases).find(
    ([alias]) => alias.toLowerCase() === nameLower
  )?.[1] as string || nameLower;

  // Find card by onChainName or baccarat name (using resolved name)
  const cardData = allCards.find((c: any) =>
    c.onChainName?.toLowerCase() === resolvedName.toLowerCase() ||
    c.baccarat?.toLowerCase() === resolvedName.toLowerCase() ||
    c.onChainName?.toLowerCase() === nameLower ||
    c.baccarat?.toLowerCase() === nameLower
  );

  if (!cardData || !cardData.suit || !cardData.rank) return null;

  // Get baccarat name (use alias if exists, or baccarat field, or onChainName)
  const baccaratName = aliases[cardData.onChainName] || cardData.baccarat?.toLowerCase() || cardData.onChainName?.toLowerCase();

  // Special case for joker cards (rank "???")
  if (cardData.rank?.includes("?")) {
    return `/images/baccarat/joker, ${baccaratName}.png`;
  }

  // Build rank name
  const rankMap: Record<string, string> = {
    'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king'
  };
  const rankName = rankMap[cardData.rank] || cardData.rank;

  return `/images/baccarat/${rankName} ${cardData.suit}, ${baccaratName}.png`;
};

// Get the correct display image URL for any card
export const getCardDisplayImageUrl = (card: DeckCard): string => {
  if (card.type === "vbms" && card.name) {
    return getVbmsBaccaratImageUrl(card.name) || card.imageUrl || "/images/card-back.png";
  }
  return card.imageUrl || "/images/card-back.png";
};
