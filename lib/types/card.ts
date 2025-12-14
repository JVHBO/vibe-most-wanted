/**
 * Tipos TypeScript para o Sistema de Cartas
 *
 * Define as interfaces e tipos usados em todo o sistema de cartas
 */

import type { CollectionId } from '../collections';

/**
 * Raridade das cartas
 */
export type CardRarity = 'Mythic' | 'Legendary' | 'Epic' | 'Rare' | 'Common';

/**
 * Tipos de Foil
 */
export type CardFoil = 'Prize' | 'Standard' | 'None';

/**
 * Condições de Wear (desgaste)
 */
export type CardWear = 'Pristine' | 'Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played';

/**
 * Atributo de uma carta NFT
 */
export interface CardAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
  max_value?: number;
}

/**
 * Estrutura básica de uma carta
 */
export interface Card {
  tokenId: string;
  collection?: CollectionId;
  power: number;
  imageUrl: string;
  name: string;
  rarity: CardRarity;
  foil?: CardFoil;
  wear?: CardWear;
}

/**
 * Generates a unique identifier for a card combining collection and tokenId
 * This is necessary because tokenId alone is not globally unique across collections
 * (e.g., tokenId "1" from "vibemostwanted" is different from tokenId "1" from "vibefid")
 */
export function getCardUniqueId(card: { tokenId: string; collection?: string }): string {
  return card.collection ? `${card.collection}_${card.tokenId}` : card.tokenId;
}

/**
 * Checks if two cards are the same based on their unique identifiers
 */
export function isSameCard(cardA: { tokenId: string; collection?: string }, cardB: { tokenId: string; collection?: string }): boolean {
  return getCardUniqueId(cardA) === getCardUniqueId(cardB);
}

/**
 * Carta com metadados completos (da blockchain)
 */
export interface CardWithMetadata extends Card {
  character?: string;
  attributes?: CardAttribute[];
  cachedAt?: number;
  contractAddress?: string;
  ownerAddress?: string;
}

/**
 * Carta legada (formato antigo - apenas tokenId)
 */
export type LegacyCard = string;

/**
 * Union type para cartas (suporta formato legado e novo)
 */
export type CardUnion = Card | LegacyCard;

/**
 * Resposta da API Alchemy para NFTs
 */
export interface AlchemyNFT {
  tokenId: string;
  contract: {
    address: string;
  };
  raw: {
    metadata: {
      image?: string;
      name?: string;
      attributes?: CardAttribute[];
    };
  };
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  tokenUri?: string;
}

/**
 * Parâmetros para cálculo de power
 */
export interface PowerCalculationParams {
  rarity: CardRarity;
  wear?: CardWear;
  foil?: CardFoil;
  collection?: CollectionId;
}

/**
 * Resultado do cálculo de power
 */
export interface PowerCalculationResult {
  power: number;
  baseValue: number;
  wearMultiplier: number;
  foilMultiplier: number;
  breakdown: {
    rarity: string;
    wear: string;
    foil: string;
  };
}

/**
 * Filtros para busca de cartas
 */
export interface CardFilters {
  collection?: CollectionId | CollectionId[];
  rarity?: CardRarity | CardRarity[];
  foil?: CardFoil | CardFoil[];
  wear?: CardWear | CardWear[];
  minPower?: number;
  maxPower?: number;
}

/**
 * Opções de ordenação para cartas
 */
export type CardSortOption = 'power-desc' | 'power-asc' | 'rarity-desc' | 'rarity-asc' | 'tokenId-asc' | 'tokenId-desc';

/**
 * Helper type guards
 */
export function isCard(card: CardUnion): card is Card {
  return typeof card === 'object' && 'tokenId' in card;
}

export function isLegacyCard(card: CardUnion): card is LegacyCard {
  return typeof card === 'string';
}

/**
 * Converte carta legada para formato novo
 */
export function convertLegacyCard(
  legacyCard: LegacyCard,
  metadata?: Partial<Card>
): Card {
  return {
    tokenId: legacyCard,
    collection: metadata?.collection || 'vibe',
    power: metadata?.power || 0,
    imageUrl: metadata?.imageUrl || '',
    name: metadata?.name || `Card #${legacyCard}`,
    rarity: metadata?.rarity || 'Common',
    foil: metadata?.foil,
    wear: metadata?.wear,
  };
}
