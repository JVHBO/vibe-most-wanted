/**
 * Gerenciador de Coleções
 *
 * Utilitários para gerenciar múltiplas coleções de cartas
 */

import type { Card, CardUnion } from '../types/card';
import type { CollectionId, CollectionConfig } from '../collections';
import {
  getCollection,
  getEnabledCollections,
  getDefaultCollection,
  isCollectionEnabled,
  COLLECTIONS,
} from '../collections';

/**
 * Obtém todas as cartas de uma coleção específica
 */
export function filterCardsByCollection(cards: Card[], collectionId: CollectionId): Card[] {
  return cards.filter(card => card.collection === collectionId);
}

/**
 * Obtém cartas de múltiplas coleções
 */
export function filterCardsByCollections(cards: Card[], collectionIds: CollectionId[]): Card[] {
  return cards.filter(card => {
    // Filter NFT cards by their collection (default to 'vibe' if not set)
    if (!card.collection) return false;
    const cardCollection = card.collection;
    return collectionIds.includes(cardCollection as CollectionId);
  });
}

/**
 * Agrupa cartas por coleção
 */
export function groupCardsByCollection(cards: Card[]): Record<CollectionId, Card[]> {
  const grouped: Partial<Record<CollectionId, Card[]>> = {};

  cards.forEach(card => {
    const collection = (card.collection || 'vibe') as CollectionId;
    if (!grouped[collection]) {
      grouped[collection] = [];
    }
    grouped[collection]!.push(card);
  });

  return grouped as Record<CollectionId, Card[]>;
}

/**
 * Obtém estatísticas de coleções
 */
export interface CollectionStats {
  collectionId: CollectionId;
  collectionName: string;
  totalCards: number;
  totalPower: number;
  averagePower: number;
}

export function getCollectionStats(cards: Card[]): CollectionStats[] {
  const grouped = groupCardsByCollection(cards);
  const stats: CollectionStats[] = [];

  Object.entries(grouped).forEach(([collectionId, collectionCards]) => {
    const collection = getCollection(collectionId as CollectionId);
    const totalPower = collectionCards.reduce((sum, card) => sum + card.power, 0);

    stats.push({
      collectionId: collectionId as CollectionId,
      collectionName: collection?.displayName || collectionId,
      totalCards: collectionCards.length,
      totalPower,
      averagePower: Math.round(totalPower / collectionCards.length),
    });
  });

  return stats.sort((a, b) => b.totalPower - a.totalPower);
}

/**
 * Valida se uma coleção está habilitada
 */
export function validateCollection(collectionId: CollectionId): boolean {
  return isCollectionEnabled(collectionId);
}

/**
 * Obtém a coleção de uma carta (com fallback para default)
 */
export function getCardCollection(card: Card): CollectionId {
  return (card.collection || 'vibe') as CollectionId;
}

/**
 * Migra cartas para incluir o campo de coleção
 */
export function migrateCardsWithCollection(
  cards: CardUnion[],
  defaultCollection: CollectionId = 'vibe'
): Card[] {
  return cards.map(card => {
    // Se já for um objeto Card
    if (typeof card === 'object' && 'tokenId' in card) {
      return {
        ...card,
        collection: card.collection || defaultCollection,
      };
    }

    // Se for uma string (formato legado)
    return {
      tokenId: card,
      collection: defaultCollection,
      power: 0,
      imageUrl: '',
      name: `Card #${card}`,
      rarity: 'Common' as const,
    };
  });
}

/**
 * Obtém informações de múltiplas coleções
 */
export function getMultipleCollectionsInfo(collectionIds: CollectionId[]): CollectionConfig[] {
  return collectionIds
    .map(id => getCollection(id))
    .filter((config): config is CollectionConfig => config !== undefined);
}

/**
 * Verifica se há cartas de múltiplas coleções
 */
export function hasMultipleCollections(cards: Card[]): boolean {
  const collections = new Set(cards.map(card => card.collection || 'vibe'));
  return collections.size > 1;
}

/**
 * Obtém a lista de coleções presentes em um deck
 */
export function getCollectionsInDeck(cards: Card[]): CollectionId[] {
  const collections = new Set(cards.map(card => (card.collection || 'vibe') as CollectionId));
  return Array.from(collections);
}

/**
 * Filtra cartas por coleções habilitadas
 */
export function filterEnabledCollectionCards(cards: Card[]): Card[] {
  const enabledCollections = getEnabledCollections().map(c => c.id);
  return cards.filter(card => {
    const collection = (card.collection || 'vibe') as CollectionId;
    return enabledCollections.includes(collection);
  });
}

/**
 * Obtém a configuração da coleção de uma carta
 */
export function getCardCollectionConfig(card: Card): CollectionConfig | undefined {
  const collectionId = getCardCollection(card);
  return getCollection(collectionId);
}

/**
 * Formata o nome completo de uma carta com sua coleção
 */
export function getFullCardName(card: Card): string {
  const collection = getCardCollectionConfig(card);
  if (!collection) return card.name;

  return `${collection.displayName} - ${card.name}`;
}

/**
 * Valida se um deck pode misturar coleções
 */
export function canMixCollections(): boolean {
  // Por padrão, permitir misturar coleções
  // Esta função pode ser expandida com lógica de regras do jogo
  return true;
}

/**
 * Valida se um deck é válido (considerando regras de coleção)
 */
export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDeck(cards: Card[]): DeckValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar quantidade de cartas
  if (cards.length === 0) {
    errors.push('O deck está vazio');
  }

  // Validar se todas as cartas são de coleções habilitadas
  const invalidCards = cards.filter(card => {
    const collection = (card.collection || 'vibe') as CollectionId;
    return !isCollectionEnabled(collection);
  });

  if (invalidCards.length > 0) {
    errors.push(`${invalidCards.length} carta(s) de coleções desabilitadas`);
  }

  // Avisar se há múltiplas coleções
  if (hasMultipleCollections(cards) && !canMixCollections()) {
    warnings.push('O deck contém cartas de múltiplas coleções');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Obtém sugestões de coleções para um usuário
 */
export function suggestCollections(userCards: Card[]): CollectionConfig[] {
  const userCollections = getCollectionsInDeck(userCards);
  const allEnabled = getEnabledCollections();

  // Priorizar coleções que o usuário já tem cartas
  const withCards = allEnabled.filter(c => userCollections.includes(c.id));
  const withoutCards = allEnabled.filter(c => !userCollections.includes(c.id));

  return [...withCards, ...withoutCards];
}

/**
 * Formata estatísticas de coleção para exibição
 */
export function formatCollectionStats(stats: CollectionStats): string {
  return `${stats.collectionName}: ${stats.totalCards} cartas, ${stats.totalPower} power total (média: ${stats.averagePower})`;
}
