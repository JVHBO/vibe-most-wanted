/**
 * FID-based trait generation system
 * Lower FIDs (early adopters) get better foils and wear
 * Uses deterministic randomness based on FID
 */

export type FoilType = 'Prize' | 'Standard' | 'None';
export type WearType = 'Pristine' | 'Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played';

interface FidTraits {
  foil: FoilType;
  wear: WearType;
}

/**
 * Seeded random number generator (deterministic)
 * Same FID always produces same result
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Roll a random choice based on probability weights
 */
function weightedRoll<T>(seed: number, choices: Array<{ value: T; weight: number }>): T {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = seededRandom(seed) * total;

  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.value;
  }

  return choices[choices.length - 1].value;
}

/**
 * Get foil probabilities based on FID
 * Updated probability table:
 * FID Range          Prize   Standard  None
 * <= 100              100%    0%        0%    (OG Legends)
 * 101 - 5,000         100%    0%        0%
 * 5,001 - 20,000      80%    20%        0%
 * 20,001 - 100,000    30%    60%       10%
 * 100,001 - 250,000    5%    35%       60%   (nerfed)
 * 250,001 - 500,000    3%    25%       72%
 * 500,001 - 1,200,000  1%    10%       89%
 * > 1,200,000          0%     5%       95%
 */
function getFoilProbabilities(fid: number): Array<{ value: FoilType; weight: number }> {
  // FID <= 100: OG Legends - 100% Prize (guaranteed!)
  if (fid <= 100) {
    return [
      { value: 'Prize', weight: 100 },
      { value: 'Standard', weight: 0 },
      { value: 'None', weight: 0 },
    ];
  }

  // FID 101 - 5,000: 100% Prize (guaranteed!)
  if (fid <= 5000) {
    return [
      { value: 'Prize', weight: 100 },
      { value: 'Standard', weight: 0 },
      { value: 'None', weight: 0 },
    ];
  }

  // FID 5,001 - 20,000: Very high Prize chance
  if (fid <= 20000) {
    return [
      { value: 'Prize', weight: 80 },
      { value: 'Standard', weight: 20 },
      { value: 'None', weight: 0 },
    ];
  }

  // FID 20,001 - 100,000: Good Prize/Standard chance
  if (fid <= 100000) {
    return [
      { value: 'Prize', weight: 30 },
      { value: 'Standard', weight: 60 },
      { value: 'None', weight: 10 },
    ];
  }

  // FID 100,001 - 250,000: Lower chances (nerfed)
  if (fid <= 250000) {
    return [
      { value: 'Prize', weight: 5 },
      { value: 'Standard', weight: 35 },
      { value: 'None', weight: 60 },
    ];
  }

  // FID 250,001 - 500,000: Low chances
  if (fid <= 500000) {
    return [
      { value: 'Prize', weight: 3 },
      { value: 'Standard', weight: 25 },
      { value: 'None', weight: 72 },
    ];
  }

  // FID 500,001 - 1,200,000: Very low chances
  if (fid <= 1200000) {
    return [
      { value: 'Prize', weight: 1 },
      { value: 'Standard', weight: 10 },
      { value: 'None', weight: 89 },
    ];
  }

  // FID > 1,200,000: Almost no foil
  return [
    { value: 'Prize', weight: 0 },
    { value: 'Standard', weight: 5 },
    { value: 'None', weight: 95 },
  ];
}

/**
 * Get wear probabilities based on FID
 * Updated probability table:
 * FID Range          Pristine  Mint  LP   MP   HP
 * <= 100              100%      0%   0%   0%   0%  (OG Legends)
 * 101 - 5,000         100%      0%   0%   0%   0%
 * 5,001 - 20,000       90%     10%   0%   0%   0%
 * 20,001 - 100,000     50%     40%  10%   0%   0%
 * 100,001 - 250,000     2%     18%  45%  30%   5%  (nerfed)
 * 250,001 - 500,000     0%      5%  30%  55%  10%
 * 500,001 - 1,200,000   0%      0%   5%  45%  50%
 * > 1,200,000           0%      0%   0%  10%  90%
 */
function getWearProbabilities(fid: number): Array<{ value: WearType; weight: number }> {
  // FID <= 100: OG Legends - 100% Pristine (guaranteed!)
  if (fid <= 100) {
    return [
      { value: 'Pristine', weight: 100 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 101 - 5,000: 100% Pristine (guaranteed!)
  if (fid <= 5000) {
    return [
      { value: 'Pristine', weight: 100 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 5,001 - 20,000: Very high Pristine chance
  if (fid <= 20000) {
    return [
      { value: 'Pristine', weight: 90 },
      { value: 'Mint', weight: 10 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 20,001 - 100,000: Good Pristine/Mint
  if (fid <= 100000) {
    return [
      { value: 'Pristine', weight: 50 },
      { value: 'Mint', weight: 40 },
      { value: 'Lightly Played', weight: 10 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 100,001 - 250,000: Higher wear (nerfed)
  if (fid <= 250000) {
    return [
      { value: 'Pristine', weight: 2 },
      { value: 'Mint', weight: 18 },
      { value: 'Lightly Played', weight: 45 },
      { value: 'Moderately Played', weight: 30 },
      { value: 'Heavily Played', weight: 5 },
    ];
  }

  // FID 250,001 - 500,000: Higher wear
  if (fid <= 500000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 5 },
      { value: 'Lightly Played', weight: 30 },
      { value: 'Moderately Played', weight: 55 },
      { value: 'Heavily Played', weight: 10 },
    ];
  }

  // FID 500,001 - 1,200,000: Heavy wear
  if (fid <= 1200000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 5 },
      { value: 'Moderately Played', weight: 45 },
      { value: 'Heavily Played', weight: 50 },
    ];
  }

  // FID > 1,200,000: Mostly Heavily Played
  return [
    { value: 'Pristine', weight: 0 },
    { value: 'Mint', weight: 0 },
    { value: 'Lightly Played', weight: 0 },
    { value: 'Moderately Played', weight: 10 },
    { value: 'Heavily Played', weight: 90 },
  ];
}

/**
 * Generate foil and wear traits based on FID
 * @param fid - Farcaster ID
 * @param extraSeed - Optional extra randomness (e.g., Date.now() for preview, omit for deterministic mint)
 *
 * Uses deterministic randomness by default - same FID always gives same result
 * Pass extraSeed to add randomness for previews
 */
export function getFidTraits(fid: number, extraSeed?: number): FidTraits {
  // Use FID as seed for foil, FID * 2 as seed for wear
  // If extraSeed provided, add it for randomness
  const foilSeed = extraSeed ? fid + extraSeed : fid;
  const wearSeed = extraSeed ? (fid * 2) + extraSeed : (fid * 2);

  const foil = weightedRoll(foilSeed, getFoilProbabilities(fid));
  const wear = weightedRoll(wearSeed, getWearProbabilities(fid));

  return { foil, wear };
}

/**
 * Get description of FID trait probabilities (for debugging/display)
 */
export function getFidTraitInfo(fid: number): string {
  if (fid <= 5000) {
    return 'Super Early Adopter - 100% Prize Foil + Pristine';
  }
  if (fid <= 20000) {
    return 'Early Adopter - 75% Prize, 25% Standard';
  }
  if (fid <= 100000) {
    return 'Established User - 20% Prize, 70% Standard';
  }
  if (fid <= 250000) {
    return 'Active User - 10% Prize, 60% Standard';
  }
  if (fid <= 500000) {
    return 'Regular User - 5% Prize, 40% Standard';
  }
  if (fid <= 1200000) {
    return 'New User - 2% Prize, 20% Standard';
  }
  return 'Very New User - 10% Standard, 90% None';
}
