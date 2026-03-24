export interface AuraLevel {
  key: string;       // 'base' | 'ssj1' | 'ssj2' | 'ssj3' | 'ssj4' | 'ssj_god'
  name: string;      // display name e.g. 'SSJ1'
  threshold: number; // min auraXP needed
  color: string;     // tailwind text color class
  gradient: string;  // for progress bar gradient
  nextThreshold: number | null; // null = max level
}

export const AURA_LEVELS: AuraLevel[] = [
  { key: 'base',    name: '',        threshold: 0,       color: 'text-purple-400',  gradient: 'from-purple-500 to-purple-700',           nextThreshold: 1000 },
  { key: 'ssj1',   name: 'SSJ1',    threshold: 1000,    color: 'text-yellow-400',  gradient: 'from-yellow-400 to-yellow-600',            nextThreshold: 5000 },
  { key: 'ssj2',   name: 'SSJ2',    threshold: 5000,    color: 'text-yellow-300',  gradient: 'from-yellow-300 to-orange-400',            nextThreshold: 15000 },
  { key: 'ssj3',   name: 'SSJ3',    threshold: 15000,   color: 'text-yellow-200',  gradient: 'from-yellow-200 to-yellow-400',            nextThreshold: 50000 },
  { key: 'ssj4',   name: 'SSJ4',    threshold: 50000,   color: 'text-red-400',     gradient: 'from-red-400 to-red-600',                  nextThreshold: 100000 },
  { key: 'ssj_god',name: 'SSJ God', threshold: 100000,  color: 'text-pink-400',    gradient: 'from-pink-400 via-purple-400 to-blue-400', nextThreshold: null },
];

export function getAuraLevel(auraXP: number): AuraLevel {
  for (let i = AURA_LEVELS.length - 1; i >= 0; i--) {
    if (auraXP >= AURA_LEVELS[i].threshold) return AURA_LEVELS[i];
  }
  return AURA_LEVELS[0];
}

export function getAuraLevelProgress(auraXP: number): { level: AuraLevel; progress: number; current: number; next: number | null } {
  const level = getAuraLevel(auraXP);
  if (level.nextThreshold === null) return { level, progress: 100, current: auraXP, next: null };
  const progress = ((auraXP - level.threshold) / (level.nextThreshold - level.threshold)) * 100;
  return { level, progress: Math.min(progress, 100), current: auraXP, next: level.nextThreshold };
}
