/**
 * Sistema de Coleções de Cartas
 *
 * Este arquivo define todas as coleções de cartas disponíveis no jogo.
 * Para adicionar uma nova coleção, basta adicionar uma entrada no objeto COLLECTIONS.
 */

export type CollectionId = 'vibe' | 'vibefid' | 'nothing' | 'custom';

export interface CollectionConfig {
  id: CollectionId;
  name: string;
  displayName: string;
  description: string;
  contractAddress: string;
  additionalContracts?: string[]; // Multi-chain: additional contract addresses (e.g. Arbitrum)
  chain: string;
  ownerAddress?: string;
  enabled: boolean;
  marketplaceUrl?: string;
  buttonText?: string;

  powerCalculation?: {
    rarityBase?: {
      mythic?: number;
      legendary?: number;
      epic?: number;
      rare?: number;
      common?: number;
    };
    wearMultiplier?: {
      pristine?: number;
      mint?: number;
      default?: number;
    };
    foilMultiplier?: {
      prize?: number;
      standard?: number;
      none?: number;
    };
  };

  metadata?: {
    imageBaseUrl?: string;
    fallbackImage?: string;
    customAttributes?: string[];
  };
}

export const DEFAULT_POWER_CONFIG = {
  rarityBase: {
    mythic: 800,
    legendary: 240,
    epic: 80,
    rare: 20,
    common: 5,
  },
  wearMultiplier: {
    pristine: 1.8,
    mint: 1.4,
    default: 1.0,
  },
  foilMultiplier: {
    prize: 15.0,
    standard: 2.5,
    none: 1.0,
  },
};

export const VIBEFID_POWER_CONFIG = {
  rarityBase: {
    mythic: 600,
    legendary: 100,
    epic: 50,
    rare: 20,
    common: 10,
  },
  wearMultiplier: {
    pristine: 1.8,
    mint: 1.4,
    default: 1.0,
  },
  foilMultiplier: {
    prize: 6.0,
    standard: 2.0,
    none: 1.0,
  },
};

export const COLLECTIONS: Record<CollectionId, CollectionConfig> = {
  vibe: {
    id: 'vibe',
    name: 'vibe',
    displayName: '$VBMS',
    description: 'A coleção original de cartas $VBMS',
    contractAddress: process.env.NEXT_PUBLIC_VIBE_CONTRACT || '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728',
    chain: 'base-mainnet',
    ownerAddress: process.env.NEXT_PUBLIC_JC_CONTRACT || '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
    enabled: true,
    powerCalculation: DEFAULT_POWER_CONFIG,
    marketplaceUrl: 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
    buttonText: 'BUY VBMS PACKS',
  },

  vibefid: {
    id: 'vibefid',
    name: 'vibefid',
    displayName: 'VibeFID',
    description: 'Collection VibeFID NFT',
    contractAddress: '0x60274A138d026E3cB337B40567100FdEC3127565',
    additionalContracts: ['0xC39DDd9E2798D5612C700B899d0c80707c542dB0'], // Arbitrum
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/fid',
    buttonText: 'Mint VibeFID',
    powerCalculation: VIBEFID_POWER_CONFIG,
  },

  nothing: {
    id: 'nothing',
    name: 'nothing',
    displayName: 'Nothing',
    description: 'Free non-NFT cards for playing the game',
    contractAddress: '',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/shop',
    buttonText: 'GET NOTHING CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },

  custom: {
    id: 'custom',
    name: 'custom',
    displayName: 'Coleção Customizada',
    description: 'Template para adicionar uma nova coleção',
    contractAddress: process.env.NEXT_PUBLIC_CUSTOM_CONTRACT || '',
    chain: process.env.NEXT_PUBLIC_CUSTOM_CHAIN || 'base-mainnet',
    ownerAddress: process.env.NEXT_PUBLIC_CUSTOM_OWNER || '',
    enabled: false,
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
};

export const DEFAULT_COLLECTION_ID: CollectionId = 'vibe';

export function getDefaultCollection(): CollectionConfig {
  return COLLECTIONS[DEFAULT_COLLECTION_ID];
}

export function getCollection(id: CollectionId): CollectionConfig | undefined {
  return COLLECTIONS[id];
}

export function getEnabledCollections(): CollectionConfig[] {
  return Object.values(COLLECTIONS).filter(collection => collection.enabled);
}

export function getAllCollections(): CollectionConfig[] {
  return Object.values(COLLECTIONS);
}

export function isCollectionEnabled(id: CollectionId): boolean {
  return COLLECTIONS[id]?.enabled ?? false;
}

export function getCollectionContract(id: CollectionId): string {
  return COLLECTIONS[id]?.contractAddress || '';
}

export function getAllCollectionContracts(id: CollectionId): string[] {
  const col = COLLECTIONS[id];
  if (!col) return [];
  const contracts = [col.contractAddress];
  if (col.additionalContracts) contracts.push(...col.additionalContracts);
  return contracts;
}

export function isContractForCollection(contractAddress: string, id: CollectionId): boolean {
  const contracts = getAllCollectionContracts(id);
  return contracts.some(c => c.toLowerCase() === contractAddress.toLowerCase());
}

export const VIBEFID_ALL_CONTRACTS = getAllCollectionContracts('vibefid');

export function getCollectionPowerConfig(id: CollectionId) {
  return COLLECTIONS[id]?.powerCalculation || DEFAULT_POWER_CONFIG;
}
