// Badge configuration
export const BADGES_CONFIG = {
  // Developer wallet address
  DEV_WALLET: '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52',

  // Early tester wallet addresses
  EARLY_TESTER_WALLETS: [
    '0x9c9d341658cd8be9023c8b6b6cd2179c720538a0',
    '0x12cf353ef7d37ab6c5505ff673116986db7c9102',
    '0xc2c3ca34cf5e80c49514acda6a466ed2894483e3',
    '0x28f4a9a2e747ec2cb1b4e235a55dff5be2ef48d6',
    '0x167e316d548cf1613b12cdd7c92e5859053a0039',
  ],

  // Gey badge wallet
  GEY_WALLET: '0x673a827c0df98274fa94ef194f7f9d1a8a00bbb9',

  // AI badge wallet - Claude
  AI_WALLET: '0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2',

  // Big Dog badge wallet
  BIGDOG_WALLET: '0xba918b37cd34cb8f123081a01c8f5733996a3682',

  // Número máximo de early testers por userIndex (fallback)
  MAX_EARLY_TESTERS: 10,
};

export type BadgeType = 'dev' | 'early_tester' | 'gey' | 'ai' | 'bigdog';

export interface Badge {
  type: BadgeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  textColor: string;
}

export const BADGES: Record<BadgeType, Badge> = {
  dev: {
    type: 'dev',
    label: 'dev',
    description: '',
    icon: '',
    color: 'bg-gradient-to-r from-vintage-gold/30 to-vintage-burnt-gold/30',
    borderColor: 'bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold',
    textColor: 'text-vintage-gold',
  },
  early_tester: {
    type: 'early_tester',
    label: 'early',
    description: '',
    icon: '',
    color: 'bg-gradient-to-r from-vintage-neon-blue/30 to-blue-400/30',
    borderColor: 'bg-gradient-to-r from-vintage-neon-blue to-blue-400',
    textColor: 'text-vintage-neon-blue',
  },
  gey: {
    type: 'gey',
    label: 'gey',
    description: '',
    icon: '',
    color: 'bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30',
    borderColor: 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500',
    textColor: 'text-pink-400',
  },
  ai: {
    type: 'ai',
    label: 'IA',
    description: 'Artificial Intelligence Player',
    icon: '🤖',
    color: 'bg-gradient-to-r from-purple-600/30 via-blue-500/30 to-cyan-500/30',
    borderColor: 'bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500',
    textColor: 'text-cyan-300',
  },
  bigdog: {
    type: 'bigdog',
    label: 'BIG DOG',
    description: 'Big Dog',
    icon: '🐕',
    color: 'bg-gradient-to-r from-orange-600/30 via-amber-500/30 to-yellow-500/30',
    borderColor: 'bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500',
    textColor: 'text-orange-400',
  },
};

// Check if address is the developer
export function isDev(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.DEV_WALLET.toLowerCase();
}

// Check if user is an early tester based on registration order or wallet address
export function isEarlyTester(address: string, userIndex: number): boolean {
  // Verifica se está na lista de endereços específicos
  const isInWalletList = BADGES_CONFIG.EARLY_TESTER_WALLETS
    .some(wallet => wallet.toLowerCase() === address.toLowerCase());

  // Ou se está dentro do limite por userIndex
  const isInIndexRange = userIndex < BADGES_CONFIG.MAX_EARLY_TESTERS;

  return isInWalletList || isInIndexRange;
}

// Check if address has the gey badge
export function isGey(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.GEY_WALLET.toLowerCase();
}

// Check if address is AI
export function isAI(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.AI_WALLET.toLowerCase();
}

// Check if address is Big Dog
export function isBigDog(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.BIGDOG_WALLET.toLowerCase();
}

// Get badges for a user
export function getUserBadges(address: string, userIndex: number): Badge[] {
  const badges: Badge[] = [];

  if (isDev(address)) {
    badges.push(BADGES.dev);
  }

  if (isEarlyTester(address, userIndex)) {
    badges.push(BADGES.early_tester);
  }

  if (isGey(address)) {
    badges.push(BADGES.gey);
  }

  if (isAI(address)) {
    badges.push(BADGES.ai);
  }

  if (isBigDog(address)) {
    badges.push(BADGES.bigdog);
  }

  return badges;
}
