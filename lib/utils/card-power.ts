/**
 * Utilitários para Cálculo de Power de Cartas
 *
 * Funções para calcular o poder das cartas baseado em seus atributos
 * Suporta múltiplas coleções com configurações diferentes
 */

import type { Card, CardRarity, CardWear, CardFoil, PowerCalculationParams, PowerCalculationResult } from '../types/card';
import { getCollectionPowerConfig, DEFAULT_POWER_CONFIG, type CollectionId } from '../collections';

/**
 * Extrai um atributo específico de um NFT
 */
export function findAttribute(nft: any, traitType: string): string | number | null {
  if (!nft?.raw?.metadata?.attributes) return null;

  const attr = nft.raw.metadata.attributes.find(
    (a: any) => a.trait_type?.toLowerCase() === traitType.toLowerCase()
  );

  return attr?.value ?? null;
}

/**
 * Normaliza valor de raridade para um dos tipos aceitos
 */
export function normalizeRarity(rarity: string): CardRarity {
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) return 'Mythic';
  if (r.includes('legend')) return 'Legendary';
  if (r.includes('epic')) return 'Epic';
  if (r.includes('rare')) return 'Rare';
  return 'Common';
}

/**
 * Normaliza valor de wear para um dos tipos aceitos
 */
export function normalizeWear(wear: string): CardWear {
  const w = wear.toLowerCase();
  if (w.includes('pristine')) return 'Pristine';
  if (w.includes('mint')) return 'Mint';
  if (w.includes('lightly')) return 'Lightly Played';
  if (w.includes('moderately')) return 'Moderately Played';
  if (w.includes('heavily')) return 'Heavily Played';
  return 'Lightly Played';
}

/**
 * Normaliza valor de foil para um dos tipos aceitos
 */
export function normalizeFoil(foil: string): CardFoil {
  const f = foil.toLowerCase();
  if (f.includes('prize')) return 'Prize';
  if (f.includes('standard')) return 'Standard';
  return 'None';
}

/**
 * Obtém o valor base de power por raridade
 */
function getRarityBase(rarity: CardRarity, collection?: CollectionId): number {
  const config = collection ? getCollectionPowerConfig(collection) : DEFAULT_POWER_CONFIG;

  const rarityMap: Record<CardRarity, number> = {
    'Mythic': config.rarityBase?.mythic || 800,
    'Legendary': config.rarityBase?.legendary || 240,
    'Epic': config.rarityBase?.epic || 80,
    'Rare': config.rarityBase?.rare || 20,
    'Common': config.rarityBase?.common || 5,
  };

  return rarityMap[rarity] || 5;
}

/**
 * Obtém o multiplicador de wear
 */
function getWearMultiplier(wear: CardWear | undefined, collection?: CollectionId): number {
  if (!wear) return 1.0;

  const config = collection ? getCollectionPowerConfig(collection) : DEFAULT_POWER_CONFIG;

  const wearMap: Record<CardWear, number> = {
    'Pristine': config.wearMultiplier?.pristine || 1.8,
    'Mint': config.wearMultiplier?.mint || 1.4,
    'Lightly Played': config.wearMultiplier?.default || 1.0,
    'Moderately Played': config.wearMultiplier?.default || 1.0,
    'Heavily Played': config.wearMultiplier?.default || 1.0,
  };

  return wearMap[wear] || 1.0;
}

/**
 * Obtém o multiplicador de foil
 */
function getFoilMultiplier(foil: CardFoil | undefined, collection?: CollectionId): number {
  if (!foil) return 1.0;

  const config = collection ? getCollectionPowerConfig(collection) : DEFAULT_POWER_CONFIG;

  const foilMap: Record<CardFoil, number> = {
    'Prize': config.foilMultiplier?.prize || 15.0,
    'Standard': config.foilMultiplier?.standard || 2.5,
    'None': config.foilMultiplier?.none || 1.0,
  };

  return foilMap[foil] || 1.0;
}

/**
 * Calcula o power de uma carta com breakdown detalhado
 */
export function calculateCardPowerDetailed(params: PowerCalculationParams): PowerCalculationResult {
  const { rarity, wear, foil, collection } = params;

  const baseValue = getRarityBase(rarity, collection);
  const wearMultiplier = getWearMultiplier(wear, collection);
  const foilMultiplier = getFoilMultiplier(foil, collection);

  const power = Math.max(1, Math.round(baseValue * wearMultiplier * foilMultiplier));

  return {
    power,
    baseValue,
    wearMultiplier,
    foilMultiplier,
    breakdown: {
      rarity: `${rarity} (${baseValue})`,
      wear: `${wear || 'None'} (×${wearMultiplier})`,
      foil: `${foil || 'None'} (×${foilMultiplier})`,
    },
  };
}

/**
 * Calcula o power de uma carta (versão simplificada)
 */
export function calculateCardPower(params: PowerCalculationParams): number {
  return calculateCardPowerDetailed(params).power;
}

/**
 * Calcula o power de uma carta a partir de um NFT
 */
export function calculateCardPowerFromNFT(nft: any, collection?: CollectionId): number {
  const rarityValue = findAttribute(nft, 'rarity');
  const wearValue = findAttribute(nft, 'wear');
  const foilValue = findAttribute(nft, 'foil');

  const rarity = normalizeRarity(String(rarityValue || 'Common'));
  const wear = wearValue ? normalizeWear(String(wearValue)) : undefined;
  const foil = foilValue ? normalizeFoil(String(foilValue)) : undefined;

  return calculateCardPower({ rarity, wear, foil, collection });
}

/**
 * Atualiza o power de uma carta existente
 */
export function updateCardPower(card: Card): Card {
  const power = calculateCardPower({
    rarity: card.rarity,
    wear: card.wear,
    foil: card.foil,
    collection: card.collection,
  });

  return {
    ...card,
    power,
  };
}

/**
 * Calcula o power total de um deck
 */
export function calculateDeckPower(cards: Card[]): number {
  return cards.reduce((total, card) => total + card.power, 0);
}

/**
 * Ordena cartas por power (descendente)
 */
export function sortCardsByPower(cards: Card[], ascending = false): Card[] {
  return [...cards].sort((a, b) => {
    return ascending ? a.power - b.power : b.power - a.power;
  });
}

/**
 * Obtém a carta mais forte de um deck
 */
export function getStrongestCard(cards: Card[]): Card | null {
  if (cards.length === 0) return null;
  return sortCardsByPower(cards)[0];
}

/**
 * Obtém a carta mais fraca de um deck
 */
export function getWeakestCard(cards: Card[]): Card | null {
  if (cards.length === 0) return null;
  return sortCardsByPower(cards, true)[0];
}

/**
 * Filtra cartas por power mínimo
 */
export function filterCardsByMinPower(cards: Card[], minPower: number): Card[] {
  return cards.filter(card => card.power >= minPower);
}

/**
 * Filtra cartas por power máximo
 */
export function filterCardsByMaxPower(cards: Card[], maxPower: number): Card[] {
  return cards.filter(card => card.power <= maxPower);
}

/**
 * Filtra cartas por range de power
 */
export function filterCardsByPowerRange(cards: Card[], minPower: number, maxPower: number): Card[] {
  return cards.filter(card => card.power >= minPower && card.power <= maxPower);
}

/**
 * Obtém estatísticas de um deck
 */
export interface DeckStats {
  totalCards: number;
  totalPower: number;
  averagePower: number;
  minPower: number;
  maxPower: number;
  rarityDistribution: Record<CardRarity, number>;
  collectionDistribution: Record<string, number>;
}

export function getDeckStats(cards: Card[]): DeckStats {
  if (cards.length === 0) {
    return {
      totalCards: 0,
      totalPower: 0,
      averagePower: 0,
      minPower: 0,
      maxPower: 0,
      rarityDistribution: {} as Record<CardRarity, number>,
      collectionDistribution: {},
    };
  }

  const totalPower = calculateDeckPower(cards);
  const powers = cards.map(c => c.power);

  const rarityDistribution: Record<CardRarity, number> = {} as Record<CardRarity, number>;
  const collectionDistribution: Record<string, number> = {};

  cards.forEach(card => {
    rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + 1;
    const collection = card.collection || 'vibe';
    collectionDistribution[collection] = (collectionDistribution[collection] || 0) + 1;
  });

  return {
    totalCards: cards.length,
    totalPower,
    averagePower: Math.round(totalPower / cards.length),
    minPower: Math.min(...powers),
    maxPower: Math.max(...powers),
    rarityDistribution,
    collectionDistribution,
  };
}
