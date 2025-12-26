/**
 * CARD FILTER - Sistema único e centralizado para filtrar cartas
 *
 * USE ESTE MÓDULO EM TODO LUGAR!
 * Nunca copie lógica de filtro - sempre importe daqui.
 */

import type { Card } from '@/lib/types/card';

/**
 * Filtra cartas não reveladas (unopened)
 * LÓGICA IDÊNTICA À HOME PAGE!
 * Checa rarity E status !== 'unopened'
 */
export function filterUnopened<T extends { rarity?: string; status?: string }>(cards: T[]): T[] {
  return cards.filter(card => {
    const rarity = ((card as any).rarity || '').toLowerCase();
    const status = ((card as any).status || '').toLowerCase();
    return rarity !== 'unopened' && status !== 'unopened';
  });
}

/**
 * Verifica se uma carta está revelada
 * LÓGICA IDÊNTICA À HOME PAGE!
 */
export function isRevealed(card: { rarity?: string; status?: string }): boolean {
  const rarity = ((card as any).rarity || '').toLowerCase();
  const status = ((card as any).status || '').toLowerCase();
  return rarity !== 'unopened' && status !== 'unopened';
}

/**
 * Verifica se uma carta NÃO está revelada
 */
export function isUnopened(card: { rarity?: string; status?: string }): boolean {
  return !isRevealed(card);
}

/**
 * Filtra cartas por coleção
 */
export function filterByCollection<T extends { collection?: string }>(
  cards: T[],
  collection: string
): T[] {
  return cards.filter(card => card.collection === collection);
}

/**
 * Exclui cartas de uma coleção específica
 */
export function excludeCollection<T extends { collection?: string }>(
  cards: T[],
  collection: string
): T[] {
  return cards.filter(card => card.collection !== collection);
}

/**
 * Filtra cartas VibeFID
 */
export function filterVibeFID<T extends { collection?: string }>(cards: T[]): T[] {
  return filterByCollection(cards, 'vibefid');
}

/**
 * Exclui cartas VibeFID
 */
export function excludeVibeFID<T extends { collection?: string }>(cards: T[]): T[] {
  return excludeCollection(cards, 'vibefid');
}

/**
 * Pipeline de filtros - aplica múltiplos filtros em sequência
 * Exemplo: applyFilters(cards, filterUnopened, excludeVibeFID)
 */
export function applyFilters<T>(
  cards: T[],
  ...filters: ((cards: T[]) => T[])[]
): T[] {
  return filters.reduce((result, filter) => filter(result), cards);
}

/**
 * CRITICAL: Check if two cards are the same (same tokenId AND collection)
 * USE THIS EVERYWHERE to avoid bugs with same tokenId across collections!
 */
export function isSameCard(
  card1: { tokenId: string; collection?: string },
  card2: { tokenId: string; collection?: string }
): boolean {
  return card1.tokenId === card2.tokenId && card1.collection === card2.collection;
}

/**
 * CRITICAL: Find a card in an array by tokenId AND collection
 * USE THIS EVERYWHERE instead of cards.find(c => c.tokenId === x)
 */
export function findCard<T extends { tokenId: string; collection?: string }>(
  cards: T[],
  target: { tokenId: string; collection?: string }
): T | undefined {
  return cards.find(c => isSameCard(c, target));
}

/**
 * CRITICAL: Check if a card is in an array (by tokenId AND collection)
 * USE THIS EVERYWHERE instead of cards.some(c => c.tokenId === x)
 */
export function hasCard<T extends { tokenId: string; collection?: string }>(
  cards: T[],
  target: { tokenId: string; collection?: string }
): boolean {
  return cards.some(c => isSameCard(c, target));
}

/**
 * CRITICAL: Get unique card key (collection:tokenId)
 * USE THIS for Sets, Maps, and deduplication
 */
export function getCardKey(card: { tokenId: string; collection?: string }): string {
  return `${card.collection || 'default'}:${card.tokenId}`;
}
