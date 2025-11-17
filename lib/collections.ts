/**
 * Sistema de Coleções de Cartas
 *
 * Este arquivo define todas as coleções de cartas disponíveis no jogo.
 * Para adicionar uma nova coleção, basta adicionar uma entrada no objeto COLLECTIONS.
 */

export type CollectionId = 'vibe' | 'gmvbrs' | 'americanfootball' | 'tkkv' | 'custom'; // Adicione novos IDs aqui

export interface CollectionConfig {
  id: CollectionId;
  name: string;
  displayName: string;
  description: string;
  contractAddress: string;
  chain: string;
  ownerAddress?: string;
  enabled: boolean;
  marketplaceUrl?: string; // Link para o marketplace da coleção
  buttonText?: string; // Texto customizado do botão (ex: "BUY GM VBRS PACKS")

  // Configurações específicas de cálculo de power
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

  // Metadados adicionais
  metadata?: {
    imageBaseUrl?: string;
    fallbackImage?: string;
    customAttributes?: string[];
  };
}

/**
 * Configuração padrão de cálculo de power
 * Usado quando uma coleção não define suas próprias regras
 */
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

/**
 * Definição de todas as coleções disponíveis
 */
export const COLLECTIONS: Record<CollectionId, CollectionConfig> = {
  // Coleção original Vibe Most Wanted
  vibe: {
    id: 'vibe',
    name: 'vibe',
    displayName: 'Vibe Most Wanted',
    description: 'A coleção original de cartas Vibe Most Wanted',
    contractAddress: process.env.NEXT_PUBLIC_VIBE_CONTRACT || '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728',
    chain: 'base-mainnet',
    ownerAddress: process.env.NEXT_PUBLIC_JC_CONTRACT || '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
    enabled: true,
    powerCalculation: DEFAULT_POWER_CONFIG,
  },

  // Coleção GM VBRS
  gmvbrs: {
    id: 'gmvbrs',
    name: 'gmvbrs',
    displayName: 'GM VBRS',
    description: 'Coleção GM VBRS NFT',
    contractAddress: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },

  // Coleção American Football
  americanfootball: {
    id: 'americanfootball',
    name: 'americanfootball',
    displayName: 'American Football',
    description: 'Coleção American Football NFT',
    contractAddress: '0xe3910325daaef5d969e6db5eca1ff0117bb160ae',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: 'https://vibechain.com/market/american-football?ref=XCLR1DJ6LQTT',
    buttonText: 'BUY AFCL PACKS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },

    // ColeÃ§Ã£o Tukka Vibes
  tkkv: {
    id: 'tkkv',
    name: 'tkkv',
    displayName: 'Tukka Vibes',
    description: 'ColeÃ§Ã£o Tukka Vibes NFT',
    contractAddress: '0x60838b9f2558aeff25e353e59ecce915d0553aaa',
    chain: 'base-mainnet',
    enabled: true,
    marketplaceUrl: 'https://vibechain.com/market/tukka-vibes?ref=XCLR1DJ6LQTT',
    buttonText: 'BUY TUKKA VIBES PACKS',
    powerCalculation: DEFAULT_POWER_CONFIG,
  },

  // Template para nova coleÃ§Ã£o customizada
  custom: {
    id: 'custom',
    name: 'custom',
    displayName: 'Coleção Customizada',
    description: 'Template para adicionar uma nova coleção',
    contractAddress: process.env.NEXT_PUBLIC_CUSTOM_CONTRACT || '',
    chain: process.env.NEXT_PUBLIC_CUSTOM_CHAIN || 'base-mainnet',
    ownerAddress: process.env.NEXT_PUBLIC_CUSTOM_OWNER || '',
    enabled: false, // Desabilitada por padrão até configurar
    powerCalculation: DEFAULT_POWER_CONFIG,
  },
};

/**
 * Coleção padrão do sistema
 */
export const DEFAULT_COLLECTION_ID: CollectionId = 'vibe';

/**
 * Retorna a coleção padrão
 */
export function getDefaultCollection(): CollectionConfig {
  return COLLECTIONS[DEFAULT_COLLECTION_ID];
}

/**
 * Retorna uma coleção específica por ID
 */
export function getCollection(id: CollectionId): CollectionConfig | undefined {
  return COLLECTIONS[id];
}

/**
 * Retorna todas as coleções habilitadas
 */
export function getEnabledCollections(): CollectionConfig[] {
  return Object.values(COLLECTIONS).filter(collection => collection.enabled);
}

/**
 * Retorna todas as coleções (incluindo desabilitadas)
 */
export function getAllCollections(): CollectionConfig[] {
  return Object.values(COLLECTIONS);
}

/**
 * Verifica se uma coleção está habilitada
 */
export function isCollectionEnabled(id: CollectionId): boolean {
  return COLLECTIONS[id]?.enabled ?? false;
}

/**
 * Retorna o endereço do contrato de uma coleção
 */
export function getCollectionContract(id: CollectionId): string {
  return COLLECTIONS[id]?.contractAddress || '';
}

/**
 * Retorna a configuração de power de uma coleção
 */
export function getCollectionPowerConfig(id: CollectionId) {
  return COLLECTIONS[id]?.powerCalculation || DEFAULT_POWER_CONFIG;
}




