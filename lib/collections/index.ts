/**
 * Collections System - Main Export
 *
 * Central export point for the collections system
 */

// Re-export everything from the main collections file
export {
  type CollectionId,
  type CollectionConfig,
  DEFAULT_POWER_CONFIG,
  COLLECTIONS,
  DEFAULT_COLLECTION_ID,
  getDefaultCollection,
  getCollection,
  getEnabledCollections,
  getAllCollections,
  isCollectionEnabled,
  getCollectionContract,
  getCollectionPowerConfig,
} from '../collections';

// Re-export types
export type {
  Card,
  CardRarity,
  CardFoil,
  CardWear,
  CardAttribute,
  CardWithMetadata,
  LegacyCard,
  CardUnion,
  AlchemyNFT,
  PowerCalculationParams,
  PowerCalculationResult,
  CardFilters,
  CardSortOption,
} from '../types/card';

export {
  isCard,
  isLegacyCard,
  convertLegacyCard,
  getCardUniqueId,
  isSameCard,
} from '../types/card';

// Re-export card power utilities
export {
  findAttribute,
  normalizeRarity,
  normalizeWear,
  normalizeFoil,
  calculateCardPowerDetailed,
  calculateCardPower,
  calculateCardPowerFromNFT,
  updateCardPower,
  calculateDeckPower,
  sortCardsByPower,
  getStrongestCard,
  getWeakestCard,
  filterCardsByMinPower,
  filterCardsByMaxPower,
  filterCardsByPowerRange,
  getDeckStats,
  type DeckStats,
} from '../utils/card-power';

// Re-export collection manager utilities
export {
  filterCardsByCollection,
  filterCardsByCollections,
  groupCardsByCollection,
  getCollectionStats,
  type CollectionStats,
  validateCollection,
  getCardCollection,
  migrateCardsWithCollection,
  getMultipleCollectionsInfo,
  hasMultipleCollections,
  getCollectionsInDeck,
  filterEnabledCollectionCards,
  getCardCollectionConfig,
  getFullCardName,
  canMixCollections,
  validateDeck,
  type DeckValidationResult,
  suggestCollections,
  formatCollectionStats,
} from '../utils/collection-manager';
