/**
 * Test script to debug FID trait generation
 * Run with: node test-fid-traits.js
 */

// Copy the exact code from fidTraits.ts
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function weightedRoll(seed, choices) {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = seededRandom(seed) * total;

  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.value;
  }

  return choices[choices.length - 1].value;
}

function getFoilProbabilities(fid) {
  if (fid <= 5000) {
    return [
      { value: 'Prize', weight: 100 },
      { value: 'Standard', weight: 0 },
      { value: 'None', weight: 0 },
    ];
  }

  if (fid <= 20000) {
    return [
      { value: 'Prize', weight: 75 },
      { value: 'Standard', weight: 20 },
      { value: 'None', weight: 5 },
    ];
  }

  if (fid <= 100000) {
    return [
      { value: 'Prize', weight: 15 },
      { value: 'Standard', weight: 50 },
      { value: 'None', weight: 35 },
    ];
  }

  if (fid <= 250000) {
    return [
      { value: 'Prize', weight: 8 },
      { value: 'Standard', weight: 45 },
      { value: 'None', weight: 47 },
    ];
  }

  if (fid <= 500000) {
    return [
      { value: 'Prize', weight: 2 },
      { value: 'Standard', weight: 25 },
      { value: 'None', weight: 73 },
    ];
  }

  if (fid <= 1200000) {
    return [
      { value: 'Prize', weight: 0 },
      { value: 'Standard', weight: 8 },
      { value: 'None', weight: 92 },
    ];
  }

  return [
    { value: 'Prize', weight: 0 },
    { value: 'Standard', weight: 0 },
    { value: 'None', weight: 100 },
  ];
}

function getWearProbabilities(fid) {
  if (fid <= 5000) {
    return [
      { value: 'Pristine', weight: 100 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  if (fid <= 20000) {
    return [
      { value: 'Pristine', weight: 85 },
      { value: 'Mint', weight: 15 },
      { value: 'Lightly Played', weight: 0 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  if (fid <= 100000) {
    return [
      { value: 'Pristine', weight: 40 },
      { value: 'Mint', weight: 40 },
      { value: 'Lightly Played', weight: 20 },
      { value: 'Moderately Played', weight: 0 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  if (fid <= 250000) {
    return [
      { value: 'Pristine', weight: 5 },
      { value: 'Mint', weight: 35 },
      { value: 'Lightly Played', weight: 50 },
      { value: 'Moderately Played', weight: 10 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  if (fid <= 500000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 10 },
      { value: 'Lightly Played', weight: 40 },
      { value: 'Moderately Played', weight: 50 },
      { value: 'Heavily Played', weight: 0 },
    ];
  }

  if (fid <= 1200000) {
    return [
      { value: 'Pristine', weight: 0 },
      { value: 'Mint', weight: 0 },
      { value: 'Lightly Played', weight: 5 },
      { value: 'Moderately Played', weight: 55 },
      { value: 'Heavily Played', weight: 40 },
    ];
  }

  return [
    { value: 'Pristine', weight: 0 },
    { value: 'Mint', weight: 0 },
    { value: 'Lightly Played', weight: 0 },
    { value: 'Moderately Played', weight: 0 },
    { value: 'Heavily Played', weight: 100 },
  ];
}

function getFidTraits(fid) {
  const foilSeed = fid;
  const wearSeed = fid * 2;

  const foil = weightedRoll(foilSeed, getFoilProbabilities(fid));
  const wear = weightedRoll(wearSeed, getWearProbabilities(fid));

  return { foil, wear };
}

// TEST FID 214748
const testFid = 214748;
console.log('\n=== TESTING FID', testFid, '===\n');

// Show probabilities
const foilProbs = getFoilProbabilities(testFid);
const wearProbs = getWearProbabilities(testFid);

console.log('Foil Probabilities:');
foilProbs.forEach(p => {
  const percentage = (p.weight / foilProbs.reduce((sum, c) => sum + c.weight, 0)) * 100;
  console.log(`  ${p.value}: ${p.weight} (${percentage.toFixed(1)}%)`);
});

console.log('\nWear Probabilities:');
wearProbs.forEach(p => {
  const percentage = (p.weight / wearProbs.reduce((sum, c) => sum + c.weight, 0)) * 100;
  console.log(`  ${p.value}: ${p.weight} (${percentage.toFixed(1)}%)`);
});

// Test seededRandom
console.log('\n--- seededRandom Debug ---');
console.log('Foil seed:', testFid);
console.log('seededRandom(foilSeed):', seededRandom(testFid));
console.log('Math.sin(testFid):', Math.sin(testFid));
console.log('Math.sin(testFid) * 10000:', Math.sin(testFid) * 10000);

// Get actual result
const traits = getFidTraits(testFid);
console.log('\n--- RESULT ---');
console.log('Foil:', traits.foil);
console.log('Wear:', traits.wear);

// Test multiple times (should be identical - deterministic)
console.log('\n--- Testing Determinism (should be same) ---');
for (let i = 0; i < 5; i++) {
  const t = getFidTraits(testFid);
  console.log(`Run ${i + 1}: Foil=${t.foil}, Wear=${t.wear}`);
}

// Test nearby FIDs
console.log('\n--- Testing Nearby FIDs ---');
for (let offset = -5; offset <= 5; offset++) {
  const fid = testFid + offset;
  const t = getFidTraits(fid);
  const random = seededRandom(fid);
  console.log(`FID ${fid}: random=${random.toFixed(6)}, Foil=${t.foil}, Wear=${t.wear}`);
}

// Test range of FIDs to see distribution
console.log('\n--- Testing Distribution (100 random FIDs in range 20k-100k) ---');
const results = { Prize: 0, Standard: 0, None: 0 };
for (let i = 0; i < 100; i++) {
  const randomFid = Math.floor(20000 + Math.random() * 80000);
  const t = getFidTraits(randomFid);
  results[t.foil]++;
}
console.log('Distribution:');
console.log(`  Prize: ${results.Prize}% (expected ~15%)`);
console.log(`  Standard: ${results.Standard}% (expected ~50%)`);
console.log(`  None: ${results.None}% (expected ~35%)`);
