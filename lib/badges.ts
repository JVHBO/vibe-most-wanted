// Badge configuration
export const BADGES_CONFIG = {
  // Developer wallet address
  DEV_WALLET: '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52',

  // Número máximo de early testers
  MAX_EARLY_TESTERS: 50,
};

export type BadgeType = 'dev' | 'early_tester';

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
    label: 'DEV',
    description: 'Developer & Creator of Vibe Most Wanted',
    icon: '⚡',
    color: 'bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold',
    borderColor: 'border-vintage-gold',
    textColor: 'text-vintage-black',
  },
  early_tester: {
    type: 'early_tester',
    label: 'EARLY',
    description: 'Early Tester - One of the first 50 players',
    icon: '♦',
    color: 'bg-gradient-to-r from-vintage-neon-blue to-cyan-500',
    borderColor: 'border-vintage-neon-blue',
    textColor: 'text-vintage-black',
  },
};

// Check if address is the developer
export function isDev(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.DEV_WALLET.toLowerCase();
}

// Check if user is an early tester based on registration order
export function isEarlyTester(userIndex: number): boolean {
  return userIndex < BADGES_CONFIG.MAX_EARLY_TESTERS;
}

// Get badges for a user
export function getUserBadges(address: string, userIndex: number): Badge[] {
  const badges: Badge[] = [];

  if (isDev(address)) {
    badges.push(BADGES.dev);
  }

  if (isEarlyTester(userIndex)) {
    badges.push(BADGES.early_tester);
  }

  return badges;
}
