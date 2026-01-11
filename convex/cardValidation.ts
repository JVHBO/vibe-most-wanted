/**
 * Server-side card trait validation
 *
 * 🔒 SECURITY: Validates that client-submitted traits match server calculations
 * Prevents clients from cheating by submitting inflated rarity/power values
 */

// ============== RARITY CALCULATION ==============
export function calculateRarityFromScore(neynarScore: number): string {
  if (neynarScore >= 0.99) return 'Mythic';
  if (neynarScore >= 0.90) return 'Legendary';
  if (neynarScore >= 0.79) return 'Epic';
  if (neynarScore >= 0.70) return 'Rare';
  return 'Common';
}

// ============== FOIL/WEAR TRAITS ==============
type FoilType = 'Prize' | 'Standard' | 'None';
type WearType = 'Pristine' | 'Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function weightedRoll<T>(seed: number, choices: Array<{ value: T; weight: number }>): T {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = seededRandom(seed) * total;

  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.value;
  }

  return choices[choices.length - 1].value;
}

function getFoilProbabilities(fid: number): Array<{ value: FoilType; weight: number }> {
  if (fid <= 5000) return [{ value: 'Prize', weight: 100 }, { value: 'Standard', weight: 0 }, { value: 'None', weight: 0 }];
  if (fid <= 20000) return [{ value: 'Prize', weight: 80 }, { value: 'Standard', weight: 20 }, { value: 'None', weight: 0 }];
  if (fid <= 100000) return [{ value: 'Prize', weight: 30 }, { value: 'Standard', weight: 60 }, { value: 'None', weight: 10 }];
  if (fid <= 250000) return [{ value: 'Prize', weight: 5 }, { value: 'Standard', weight: 35 }, { value: 'None', weight: 60 }];
  if (fid <= 500000) return [{ value: 'Prize', weight: 3 }, { value: 'Standard', weight: 25 }, { value: 'None', weight: 72 }];
  if (fid <= 1200000) return [{ value: 'Prize', weight: 1 }, { value: 'Standard', weight: 10 }, { value: 'None', weight: 89 }];
  return [{ value: 'Prize', weight: 0 }, { value: 'Standard', weight: 5 }, { value: 'None', weight: 95 }];
}

function getWearProbabilities(fid: number): Array<{ value: WearType; weight: number }> {
  if (fid <= 5000) return [{ value: 'Pristine', weight: 100 }, { value: 'Mint', weight: 0 }, { value: 'Lightly Played', weight: 0 }, { value: 'Moderately Played', weight: 0 }, { value: 'Heavily Played', weight: 0 }];
  if (fid <= 20000) return [{ value: 'Pristine', weight: 90 }, { value: 'Mint', weight: 10 }, { value: 'Lightly Played', weight: 0 }, { value: 'Moderately Played', weight: 0 }, { value: 'Heavily Played', weight: 0 }];
  if (fid <= 100000) return [{ value: 'Pristine', weight: 50 }, { value: 'Mint', weight: 40 }, { value: 'Lightly Played', weight: 10 }, { value: 'Moderately Played', weight: 0 }, { value: 'Heavily Played', weight: 0 }];
  if (fid <= 250000) return [{ value: 'Pristine', weight: 2 }, { value: 'Mint', weight: 18 }, { value: 'Lightly Played', weight: 45 }, { value: 'Moderately Played', weight: 30 }, { value: 'Heavily Played', weight: 5 }];
  if (fid <= 500000) return [{ value: 'Pristine', weight: 0 }, { value: 'Mint', weight: 5 }, { value: 'Lightly Played', weight: 30 }, { value: 'Moderately Played', weight: 55 }, { value: 'Heavily Played', weight: 10 }];
  if (fid <= 1200000) return [{ value: 'Pristine', weight: 0 }, { value: 'Mint', weight: 0 }, { value: 'Lightly Played', weight: 5 }, { value: 'Moderately Played', weight: 45 }, { value: 'Heavily Played', weight: 50 }];
  return [{ value: 'Pristine', weight: 0 }, { value: 'Mint', weight: 0 }, { value: 'Lightly Played', weight: 0 }, { value: 'Moderately Played', weight: 10 }, { value: 'Heavily Played', weight: 90 }];
}

export function calculateFidTraits(fid: number): { foil: FoilType; wear: WearType } {
  const foil = weightedRoll(fid, getFoilProbabilities(fid));
  const wear = weightedRoll(fid * 2, getWearProbabilities(fid));
  return { foil, wear };
}

// ============== POWER CALCULATION ==============
const VIBEFID_POWER_CONFIG = {
  rarityBase: { mythic: 800, legendary: 240, epic: 80, rare: 20, common: 5 },
  wearMultiplier: { pristine: 1.8, mint: 1.4, default: 1.0 },
  foilMultiplier: { prize: 15.0, standard: 2.5, none: 1.0 },
};

export function calculatePower(rarity: string, foil: string, wear: string): number {
  const rarityKey = rarity.toLowerCase() as keyof typeof VIBEFID_POWER_CONFIG.rarityBase;
  const basePower = VIBEFID_POWER_CONFIG.rarityBase[rarityKey] || VIBEFID_POWER_CONFIG.rarityBase.common;

  const wearKey = wear.toLowerCase().replace(' ', '') as 'pristine' | 'mint';
  const wearMult = VIBEFID_POWER_CONFIG.wearMultiplier[wearKey] || VIBEFID_POWER_CONFIG.wearMultiplier.default;

  const foilKey = foil.toLowerCase() as 'prize' | 'standard' | 'none';
  const foilMult = VIBEFID_POWER_CONFIG.foilMultiplier[foilKey] || VIBEFID_POWER_CONFIG.foilMultiplier.none;

  return Math.round(basePower * wearMult * foilMult);
}

// ============== VALIDATION ==============
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  correctedValues?: {
    rarity: string;
    foil: string;
    wear: string;
    power: number;
  };
}

export function validateCardTraits(
  fid: number,
  neynarScore: number,
  clientRarity: string,
  clientFoil: string,
  clientWear: string,
  clientPower: number
): ValidationResult {
  const errors: string[] = [];

  // Calculate expected values
  const expectedRarity = calculateRarityFromScore(neynarScore);
  const expectedTraits = calculateFidTraits(fid);
  const expectedPower = calculatePower(expectedRarity, expectedTraits.foil, expectedTraits.wear);

  // Validate rarity (CRITICAL - based on Neynar score)
  if (clientRarity !== expectedRarity) {
    errors.push(`Invalid rarity: client=${clientRarity}, expected=${expectedRarity} (score=${neynarScore})`);
  }

  // Validate foil (deterministic based on FID)
  if (clientFoil !== expectedTraits.foil) {
    errors.push(`Invalid foil: client=${clientFoil}, expected=${expectedTraits.foil}`);
  }

  // Validate wear (deterministic based on FID)
  if (clientWear !== expectedTraits.wear) {
    errors.push(`Invalid wear: client=${clientWear}, expected=${expectedTraits.wear}`);
  }

  // Validate power (calculated from rarity/foil/wear)
  if (Math.abs(clientPower - expectedPower) > 1) { // Allow 1 point rounding difference
    errors.push(`Invalid power: client=${clientPower}, expected=${expectedPower}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    correctedValues: {
      rarity: expectedRarity,
      foil: expectedTraits.foil,
      wear: expectedTraits.wear,
      power: expectedPower,
    },
  };
}
