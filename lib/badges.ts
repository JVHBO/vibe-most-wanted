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
  ],

  // Número máximo de early testers por userIndex (fallback)
  MAX_EARLY_TESTERS: 9999,
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
    description: '',
    icon: '',
    color: 'bg-vintage-gold/20',
    borderColor: 'border-vintage-gold/40',
    textColor: 'text-vintage-gold',
  },
  early_tester: {
    type: 'early_tester',
    label: 'EARLY',
    description: '',
    icon: '',
    color: 'bg-vintage-neon-blue/20',
    borderColor: 'border-vintage-neon-blue/40',
    textColor: 'text-vintage-neon-blue',
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

// Get badges for a user
export function getUserBadges(address: string, userIndex: number): Badge[] {
  const badges: Badge[] = [];

  if (isDev(address)) {
    badges.push(BADGES.dev);
  }

  if (isEarlyTester(address, userIndex)) {
    badges.push(BADGES.early_tester);
  }

  return badges;
}
