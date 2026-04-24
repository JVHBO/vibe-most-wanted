/**
 * Sistema de Coleções de Cartas
 *
 * Este arquivo define todas as coleções de cartas disponíveis no jogo.
 * Para adicionar uma nova coleção, basta adicionar uma entrada no objeto COLLECTIONS.
 */

export type CollectionId =
  | 'vibe'
  | 'vibefid'
  | 'nothing'
  | 'custom'
  | 'gmvbrs'
  | 'viberotbangers'
  | 'cumioh'
  | 'meowverse'
  | 'viberuto'
  | 'poorlydrawnpepes'
  | 'teampothead'
  | 'tarot'
  | 'baseballcabal'
  | 'vibefx'
  | 'historyofcomputer';

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
  gmvbrs: {
    id: 'gmvbrs',
    name: 'gmvbrs',
    displayName: 'GMVBRS',
    description: 'GMVBRS Collection',
    contractAddress: '0x8b1A1B7c32872a3c98481C4544A47629c02C70cF',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/gmvbrs',
    buttonText: 'GET GMVBRS CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  viberotbangers: {
    id: 'viberotbangers',
    name: 'viberotbangers',
    displayName: 'VIBEROTBANGERS',
    description: 'VIBEROTBANGERS Collection',
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/viberotbangers',
    buttonText: 'GET VIBEROTBANGERS CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  cumioh: {
    id: 'cumioh',
    name: 'cumioh',
    displayName: 'CUMIOH',
    description: 'CUMIOH Collection',
    contractAddress: '0xfeabae8bdb41b2ae507972180df02e70148b38e1',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/cumioh',
    buttonText: 'GET CUMIOH CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  meowverse: {
    id: 'meowverse',
    name: 'meowverse',
    displayName: 'MEOWVERSE',
    description: 'MEOWVERSE Collection',
    contractAddress: '0xA5a8E2aF7c68b42bD6131bB5a4eA33e961cA3e3E',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/meowverse',
    buttonText: 'GET MEOWVERSE CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  viberuto: {
    id: 'viberuto',
    name: 'viberuto',
    displayName: 'VIBERUTO',
    description: 'VIBERUTO Collection',
    contractAddress: '0xBc43e5198F73D2B97d36B96b3e94884493AbA8d6',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: '/viberuto',
    buttonText: 'GET VIBERUTO CARDS',
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
  poorlydrawnpepes: {
    id: 'poorlydrawnpepes',
    name: 'poorlydrawnpepes',
    displayName: 'Poorly Drawn Pepes',
    description: 'Poorly Drawn Pepes Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/poorlydrawnpepes',
    buttonText: 'GET POORLY DRAWN PEPES CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  teampothead: {
    id: 'teampothead',
    name: 'teampothead',
    displayName: 'Team Pothead',
    description: 'Team Pothead Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/teampothead',
    buttonText: 'GET TEAM POTHEAD CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  tarot: {
    id: 'tarot',
    name: 'tarot',
    displayName: 'Tarot',
    description: 'Tarot Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/tarot',
    buttonText: 'GET TAROT CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  baseballcabal: {
    id: 'baseballcabal',
    name: 'baseballcabal',
    displayName: 'Baseball Cabal',
    description: 'Baseball Cabal Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/baseballcabal',
    buttonText: 'GET BASEBALL CABAL CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  vibefx: {
    id: 'vibefx',
    name: 'vibefx',
    displayName: 'VibeFX',
    description: 'VibeFX Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/vibefx',
    buttonText: 'GET VIBEFX CARDS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
  historyofcomputer: {
    id: 'historyofcomputer',
    name: 'historyofcomputer',
    displayName: 'History of Computer',
    description: 'History of Computer Collection',
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    chain: 'base-mainnet',
    enabled: false,
    marketplaceUrl: '/historyofcomputer',
    buttonText: 'GET HISTORY OF COMPUTER CARDS',
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
