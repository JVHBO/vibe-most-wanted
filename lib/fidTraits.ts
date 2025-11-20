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
 */
function getFoilProbabilities(fid: number): Array<{ value: FoilType; weight: number }> {
  // FID ≤ 5,000: 100% Prize (guaranteed!)
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
      { value: 'Prize', weight: 75 },
      { value: 'Standard', weight: 20 },
      { value: 'None', weight: 5 },
    ];
  }

  // FID 20,001 - 100,000: Good Standard chance, some Prize
  if (fid <= 100000) {
    return [
      { value: 'Prize', weight: 15 },
      { value: 'Standard', weight: 50 },
      { value: 'None', weight: 35 },
    ];
  }

  // FID 100,001 - 250,000: Good Standard chance, low Prize
  if (fid <= 250000) {
    return [
      { value: 'Prize', weight: 8 },
      { value: 'Standard', weight: 45 },
      { value: 'None', weight: 47 },
    ];
  }

  // FID 250,001 - 500,000: Mostly None, some Standard
  if (fid <= 500000) {
    return [
      { value: 'Prize', weight: 2 },
      { value: 'Standard', weight: 25 },
      { value: 'None', weight: 73 },
    ];
  }

  // FID 500,001 - 1,200,000: Almost all None
  if (fid <= 1200000) {
    return [
      { value: 'Prize', weight: 0 },
      { value: 'Standard', weight: 8 },
      { value: 'None', weight: 92 },
    ];
  }

  // FID > 1,200,000: 100% None (guaranteed)
  return [
    { value: 'Prize', weight: 0 },
    { value: 'Standard', weight: 0 },
    { value: 'None', weight: 100 },
  ];
}

/**
 * Get wear probabilities based on FID
 */
function getWearProbabilities(fid: number): Array<{ value: WearType; weight: number }> {
  // FID ≤ 5,000: 100% Pristine (guaranteed!)
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
      { value: 'Pristine', weight: 85 },
      { value: 'Mint', weight: 15 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 20,001 - 100,000: Good Pristine/Mint
  if (fid <= 100000) {
    return [
      { value: 'Pristine', weight: 40 },
      { value: 'Mint', weight: 40 },
      { value: 'Lightly Played', weight: 20 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 100,001 - 250,000: Good Mint/Lightly Played
  if (fid <= 250000) {
    return [
      { value: 'Pristine', weight: 5 },
      { value: 'Mint', weight: 35 },
      { value: 'Lightly Played', weight: 50 },
      { value: 'Moderately Played', weight: 10 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 250,001 - 500,000: Moderate wear
  if (fid <= 500000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 10 },
      { value: 'Lightly Played', weight: 40 },
      { value: 'Moderately Played', weight: 50 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  // FID 500,001 - 1,200,000: Heavy wear
  if (fid <= 1200000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 5 },
      { value: 'Moderately Played', weight: 55 },
      { value: 'Heavily Played', weight: 40 },
    ];
  }

  // FID > 1,200,000: 100% Heavily Played (guaranteed)
  return [
    { value: 'Pristine', weight: 0 },
    { value: 'Mint', weight: 0 },
    { value: 'Lightly Played', weight: 0 },
    { value: 'Moderately Played', weight: 0 },
    { value: 'Heavily Played', weight: 100 },
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
    return 'Early Adopter - 75% Prize, 85% Pristine';
  }
  if (fid <= 100000) {
    return 'Established User - 15% Prize, 50% Standard';
  }
  if (fid <= 250000) {
    return 'Active User - 8% Prize, 45% Standard';
  }
  if (fid <= 500000) {
    return 'Regular User - 2% Prize, 25% Standard';
  }
  if (fid <= 1200000) {
    return 'New User - 8% Standard only';
  }
  return 'Very New User - 100% None + Heavily Played';
}
