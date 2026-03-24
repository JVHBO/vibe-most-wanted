export interface AuraLevel {
  key: string;
  name: string;      // display name
  threshold: number; // min aura needed
  color: string;     // tailwind text color class
  gradient: string;  // for progress bar gradient (tailwind bg-gradient-to-r)
  nextThreshold: number | null;
}

// 8 Dragon Ball levels based on aura (permanent XP)
// Calibrated: ~1,000 aura/week for active player → SSJ Blue in ~1 year
export const AURA_LEVELS: AuraLevel[] = [
  {
    key: 'human',
    name: 'Human',
    threshold: 0,
    color: 'text-slate-400',
    gradient: 'from-slate-400 to-slate-600',
    nextThreshold: 200,
  },
  {
    key: 'great_ape',
    name: 'Great Ape',
    threshold: 200,
    color: 'text-amber-700',
    gradient: 'from-amber-700 to-amber-900',
    nextThreshold: 800,
  },
  {
    key: 'ssj1',
    name: 'SSJ1',
    threshold: 800,
    color: 'text-yellow-400',
    gradient: 'from-yellow-300 to-yellow-500',
    nextThreshold: 2500,
  },
  {
    key: 'ssj2',
    name: 'SSJ2',
    threshold: 2500,
    color: 'text-yellow-300',
    gradient: 'from-yellow-200 to-yellow-400',
    nextThreshold: 6000,
  },
  {
    key: 'ssj3',
    name: 'SSJ3',
    threshold: 6000,
    color: 'text-yellow-200',
    gradient: 'from-yellow-100 to-yellow-300',
    nextThreshold: 14000,
  },
  {
    key: 'ssj4',
    name: 'SSJ4',
    threshold: 14000,
    color: 'text-red-400',
    gradient: 'from-red-500 to-red-700',
    nextThreshold: 28000,
  },
  {
    key: 'ssj_god',
    name: 'SSJ God',
    threshold: 28000,
    color: 'text-rose-400',
    gradient: 'from-rose-400 to-red-500',
    nextThreshold: 52000,
  },
  {
    key: 'ssj_blue',
    name: 'SSJ Blue',
    threshold: 52000,
    color: 'text-cyan-400',
    gradient: 'from-blue-400 via-cyan-400 to-blue-600',
    nextThreshold: null,
  },
];

export function getAuraLevel(aura: number): AuraLevel {
  for (let i = AURA_LEVELS.length - 1; i >= 0; i--) {
    if (aura >= AURA_LEVELS[i].threshold) return AURA_LEVELS[i];
  }
  return AURA_LEVELS[0];
}

/** Returns progress percentage (0-100) from current level threshold to next */
export function getAuraLevelProgress(aura: number): {
  level: AuraLevel;
  progress: number;
  current: number;
  next: number | null;
} {
  const level = getAuraLevel(aura);
  if (level.nextThreshold === null) {
    return { level, progress: 100, current: aura, next: null };
  }
  const progress =
    ((aura - level.threshold) / (level.nextThreshold - level.threshold)) * 100;
  return {
    level,
    progress: Math.min(Math.max(progress, 0), 100),
    current: aura,
    next: level.nextThreshold,
  };
}
