import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = '0x29f9673bbcbab3dece542fc78f4f3b5b61c5a15a'; // Original NFT contract
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;
const HAND_SIZE = 5;

async function fetchNFTs(owner) {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  if (!CONTRACT_ADDRESS) throw new Error("Contract address não configurado");

  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;
  const maxPages = 100; // Increase to handle 6700+ NFTs

  do {
    pageCount++;
    // Filter by VIBE contract address
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log('❌ API Error:', res.status, res.statusText);
      const errorText = await res.text();
      console.log('Error details:', errorText.substring(0, 200));
      throw new Error(`API falhou: ${res.status}`);
    }
    const json = await res.json();
    console.log(`   Página ${pageCount}: ${json.ownedNfts?.length || 0} NFTs`);
    allNfts = allNfts.concat(json.ownedNfts || []);
    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

function findAttr(nft, traitType) {
  const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
  const found = attrs.find(a => a.trait_type?.toLowerCase() === traitType.toLowerCase());
  return found?.value || '';
}

function isUnrevealed(nft) {
  const name = nft?.name || nft?.raw?.metadata?.name || '';
  const desc = nft?.description || nft?.raw?.metadata?.description || '';
  return name.toLowerCase().includes('unrevealed') || desc.toLowerCase().includes('unrevealed');
}

function simulateEasy(cards) {
  // Completely random
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, HAND_SIZE);
}

function simulateMedium(cards) {
  // 70% top 3, 30% random
  const sorted = [...cards].sort((a, b) => b.power - a.power);
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const picked = [];

  for (let i = 0; i < HAND_SIZE; i++) {
    if (Math.random() < 0.7 && sorted.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(3, sorted.length));
      picked.push(sorted[idx]);
      sorted.splice(idx, 1);
    } else if (shuffled.length > 0) {
      picked.push(shuffled[i]);
    }
  }

  return picked;
}

function simulateHard(cards) {
  // Always from top 7
  const sorted = [...cards].sort((a, b) => b.power - a.power);
  const picked = [];

  for (let i = 0; i < HAND_SIZE; i++) {
    if (sorted.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(7, sorted.length));
      picked.push(sorted[idx]);
      sorted.splice(idx, 1);
    }
  }

  return picked;
}

function simulateExtreme(cards) {
  // Always from top 5
  const sorted = [...cards].sort((a, b) => b.power - a.power);
  const picked = [];

  for (let i = 0; i < HAND_SIZE; i++) {
    if (sorted.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(5, sorted.length));
      picked.push(sorted[idx]);
      sorted.splice(idx, 1);
    }
  }

  return picked;
}

function simulateImpossible(cards) {
  // Prioritizes legendaries
  const legendaries = cards.filter(card =>
    card.rarity?.toLowerCase() === 'legendary' ||
    card.rarity?.toLowerCase() === 'lendária'
  );

  if (legendaries.length >= HAND_SIZE) {
    const sortedLegendaries = legendaries.sort((a, b) => b.power - a.power);
    return sortedLegendaries.slice(0, HAND_SIZE);
  } else {
    const picked = [...legendaries];
    const sorted = cards
      .filter(card => !legendaries.find(leg => leg.tokenId === card.tokenId))
      .sort((a, b) => b.power - a.power);
    picked.push(...sorted.slice(0, HAND_SIZE - legendaries.length));
    return picked;
  }
}

async function main() {
  console.log('🎮 Testando PODER REAL de cada dificuldade...\n');
  console.log('Wallet do JC:', JC_WALLET);
  console.log('Tamanho da mão:', HAND_SIZE, 'cartas\n');

  const raw = await fetchNFTs(JC_WALLET);
  console.log('📊 Raw NFTs:', raw.length);

  const revealed = raw.filter(nft => !isUnrevealed(nft));
  console.log('✅ Revealed NFTs:', revealed.length);

  // Check first few NFTs to see structure
  if (revealed.length > 0) {
    const sample = revealed[0];
    console.log('\n🔍 Sample NFT structure:');
    console.log('   Contract:', sample.contract?.address);
    console.log('   TokenId:', sample.tokenId);
    console.log('   Name:', sample.name || sample.raw?.metadata?.name);
    console.log('   Attributes:', sample.raw?.metadata?.attributes?.length || 0);
    if (sample.raw?.metadata?.attributes) {
      sample.raw.metadata.attributes.forEach(attr => {
        console.log(`     - ${attr.trait_type}: ${attr.value}`);
      });
    }
    console.log();
  }

  // Process cards
  const cards = revealed.map(nft => {
    const rarity = findAttr(nft, 'rarity');
    const powerStr = findAttr(nft, 'power');
    const power = powerStr ? parseInt(powerStr) : 0;

    return {
      tokenId: nft.tokenId,
      name: nft?.name || nft?.raw?.metadata?.name || `Token #${nft.tokenId}`,
      rarity,
      power,
      contractAddress: nft.contract?.address,
    };
  }).filter(card => card.power > 0); // Only cards with power

  console.log('⚡ Cards with power:', cards.length);

  // Filter out RARE cards (same as game logic)
  const available = cards.filter(card => card.rarity?.toLowerCase() !== 'rare');

  console.log('📦 Total de cartas no deck do JC:', cards.length);
  console.log('✅ Cartas disponíveis (sem RARE):', available.length);
  console.log();

  // Run simulations
  const simulations = 100; // Run 100 times for each difficulty
  const results = {
    easy: [],
    medium: [],
    hard: [],
    extreme: [],
    impossible: []
  };

  console.log(`🔄 Rodando ${simulations} simulações para cada dificuldade...\n`);

  for (let i = 0; i < simulations; i++) {
    results.easy.push(simulateEasy(available).reduce((sum, c) => sum + c.power, 0));
    results.medium.push(simulateMedium(available).reduce((sum, c) => sum + c.power, 0));
    results.hard.push(simulateHard(available).reduce((sum, c) => sum + c.power, 0));
    results.extreme.push(simulateExtreme(available).reduce((sum, c) => sum + c.power, 0));
    results.impossible.push(simulateImpossible(available).reduce((sum, c) => sum + c.power, 0));
  }

  // Calculate stats
  function getStats(powers) {
    const sorted = powers.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = Math.round(sorted.reduce((sum, p) => sum + p, 0) / sorted.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { min, max, avg, median };
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTADOS DAS SIMULAÇÕES');
  console.log('═══════════════════════════════════════════════════════════\n');

  const difficulties = ['easy', 'medium', 'hard', 'extreme', 'impossible'];
  const icons = ['🟢', '🔵', '🟠', '🔴', '🟣'];
  const names = ['EASY', 'MEDIUM', 'HARD', 'EXTREME', 'IMPOSSIBLE'];

  difficulties.forEach((diff, idx) => {
    const stats = getStats(results[diff]);
    console.log(`${icons[idx]} ${names[idx]}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Poder Mínimo:  ${stats.min}`);
    console.log(`   Poder Médio:   ${stats.avg}`);
    console.log(`   Poder Mediano: ${stats.median}`);
    console.log(`   Poder Máximo:  ${stats.max}`);
    console.log();
  });

  console.log('═══════════════════════════════════════════════════════════');

  // Show legendary info for impossible mode
  const legendaries = available.filter(card =>
    card.rarity?.toLowerCase() === 'legendary' ||
    card.rarity?.toLowerCase() === 'lendária'
  );

  if (legendaries.length > 0) {
    console.log(`\n✨ Cartas LEGENDARY no deck: ${legendaries.length}`);
    const sortedLeg = legendaries.sort((a, b) => b.power - a.power);
    const top5 = sortedLeg.slice(0, Math.min(5, sortedLeg.length));
    console.log('\n🟣 IMPOSSIBLE MODE - Legendárias usadas:');
    console.log('───────────────────────────────────────────────────────────');
    top5.forEach((card, i) => {
      console.log(`   ${i + 1}. #${card.tokenId} - ${card.power} poder (${card.name})`);
    });
    const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Total: ${top5Power} poder`);
  } else {
    console.log('\n⚠️  Nenhuma carta LEGENDARY encontrada');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
