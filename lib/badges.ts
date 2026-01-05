// Badge configuration
export const BADGES_CONFIG = {
  DEV_WALLET: '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52',
  GEY_WALLET: '0x673a827c0df98274fa94ef194f7f9d1a8a00bbb9',
  AI_WALLET: '0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2',
  BIGDOG_WALLET: '0xba918b37cd34cb8f123081a01c8f5733996a3682',
  TRASH_WALLET: '0xb620e9f63188245fcc3e737f77f811e8aa5338fe',
};

export type BadgeType = 'dev' | 'gey' | 'ai' | 'bigdog' | 'exploiter' | 'trash' | 'vibe';

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
    label: '',
    description: '',
    icon: '⚡',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
  gey: {
    type: 'gey',
    label: '',
    description: '',
    icon: '🌈',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
  ai: {
    type: 'ai',
    label: '',
    description: '',
    icon: '🤖',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
  bigdog: {
    type: 'bigdog',
    label: '',
    description: '',
    icon: '🐕',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
  exploiter: {
    type: 'exploiter',
    label: 'EXPLOITER',
    description: 'Exploited the game',
    icon: '🚨',
    color: 'bg-red-900/50',
    borderColor: 'bg-red-500',
    textColor: 'text-red-400',
  },
  trash: {
    type: 'trash',
    label: '',
    description: '',
    icon: '🗑️',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
  vibe: {
    type: 'vibe',
    label: '',
    description: '',
    icon: '✨',
    color: 'bg-vintage-black',
    borderColor: 'bg-vintage-gold',
    textColor: 'text-vintage-gold',
  },
};

const EXPLOITER_BLACKLIST = [
  "0x0395df57f73ae2029fc27a152cd87070bcfbd4a4",
  "0xbb367d00000f5e37ac702aab769725c299be2fc3",
  "0x0e14598940443b91d097b5fd6a89b5808fe35a6b",
  "0x0230cf1cf5bf2537eb385772ff72edd5db45320d",
  "0x9ab292251cfb32b8f405ae43a9851aba61696ded",
  "0xd4c3afc6adce7622400759d5194e5497b162e39d",
  "0xa43ae3956ecb0ce00c69576153a34db42d265cc6",
  "0x04c6d801f529b8d4f118edb2722d5986d25a6ebf",
  "0xff793f745cb0f1131f0614bf54f4c4310f33f0ce",
  "0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0",
  "0xf73e59d03d45a227e5a37aace702599c15d7e64d",
  "0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded",
  "0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9",
  "0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b",
  "0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091",
  "0x2cb84569b69265eea55a8ceb361549548ca99749",
  "0xcd890b0f59d7d1a98ffdf133d6b99458324e6621",
  "0xcda1b44a39cd827156334c69552d8ecdc697646f",
  "0x32c3446427e4481096dd96e6573aaf1fbbb9cff8",
  "0xce1899674ac0b4137a5bb819e3849794a768eaf0",
  "0x0d2450ada31e8dfd414e744bc3d250280dca202e",
  "0x1915a871dea94e538a3c9ec671574ffdee6e7c45",
  "0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9",
];

export function isDev(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.DEV_WALLET.toLowerCase();
}

export function isExploiter(address: string): boolean {
  return EXPLOITER_BLACKLIST.includes(address.toLowerCase());
}

export function isGey(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.GEY_WALLET.toLowerCase();
}

export function isAI(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.AI_WALLET.toLowerCase();
}

export function isBigDog(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.BIGDOG_WALLET.toLowerCase();
}

export function isTrash(address: string): boolean {
  return address.toLowerCase() === BADGES_CONFIG.TRASH_WALLET.toLowerCase();
}

export function getUserBadges(address: string, userIndex: number, hasVibeBadge?: boolean): Badge[] {
  const badges: Badge[] = [];

  if (isExploiter(address)) {
    badges.push(BADGES.exploiter);
    return badges;
  }

  if (isDev(address)) {
    badges.push(BADGES.dev);
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

  if (isTrash(address)) {
    badges.push(BADGES.trash);
  }

  if (hasVibeBadge) {
    badges.push(BADGES.vibe);
  }

  return badges;
}
