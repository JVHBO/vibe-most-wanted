import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

async function fetchNFTs(owner) {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  if (!CONTRACT_ADDRESS) throw new Error("Contract address não configurado");

  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;
  const maxPages = 20;

  do {
    pageCount++;
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();
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

async function main() {
  console.log('✨ Buscando cartas LEGENDARY na wallet do JC...\n');
  console.log('Wallet:', JC_WALLET);
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('Chain:', CHAIN, '\n');

  const raw = await fetchNFTs(JC_WALLET);
  console.log('📦 Total de NFTs encontrados:', raw.length);

  // Filter unrevealed
  const revealed = raw.filter(nft => !isUnrevealed(nft));
  console.log('✅ NFTs revelados:', revealed.length, '\n');

  // Process and get power
  const processed = revealed.map(nft => {
    const rarity = findAttr(nft, 'rarity');
    const powerStr = findAttr(nft, 'power');
    const power = powerStr ? parseInt(powerStr) : 0;

    return {
      tokenId: nft.tokenId,
      name: nft?.name || nft?.raw?.metadata?.name || `Token #${nft.tokenId}`,
      rarity,
      power,
    };
  });

  // Filter LEGENDARY cards
  const legendaries = processed.filter(nft =>
    nft.rarity?.toLowerCase() === 'legendary' ||
    nft.rarity?.toLowerCase() === 'lendária'
  );

  // Sort by power (descending)
  legendaries.sort((a, b) => b.power - a.power);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✨ CARTAS LEGENDARY ENCONTRADAS: ${legendaries.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (legendaries.length === 0) {
    console.log('❌ Nenhuma carta LEGENDARY encontrada na wallet do JC!');
    console.log('   IMPOSSIBLE mode irá usar as 5 cartas mais fortes ao invés.\n');
    return;
  }

  // Show all legendaries
  legendaries.forEach((card, index) => {
    console.log(`${index + 1}. Token #${card.tokenId}`);
    console.log(`   Nome: ${card.name}`);
    console.log(`   Poder: ${card.power}`);
    console.log(`   Raridade: ${card.rarity}`);
    console.log('───────────────────────────────────────────────────────────');
  });

  // Calculate top 5 power
  if (legendaries.length >= 5) {
    const top5 = legendaries.slice(0, 5);
    const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
    const avgPower = Math.round(top5Power / 5);

    console.log('\n🟣 MODO IMPOSSÍVEL - Top 5 Legendárias:');
    console.log('═══════════════════════════════════════════════════════════');
    top5.forEach((card, i) => {
      console.log(`${i + 1}. #${card.tokenId} - ${card.power} poder`);
    });
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Poder Total: ${top5Power}`);
    console.log(`   Poder Médio: ${avgPower} por carta`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } else {
    const totalPower = legendaries.reduce((sum, c) => sum + c.power, 0);
    console.log(`\n⚠️  Apenas ${legendaries.length} carta(s) LEGENDARY encontrada(s)`);
    console.log(`   Poder Total: ${totalPower}`);
    console.log(`   O modo irá completar com as cartas mais fortes\n`);
  }

  // Show all rarities distribution
  const rarityCount = {};
  processed.forEach(nft => {
    const r = nft.rarity || 'Unknown';
    rarityCount[r] = (rarityCount[r] || 0) + 1;
  });

  console.log('📊 Distribuição de Raridades no Deck do JC:');
  console.log('═══════════════════════════════════════════════════════════');
  Object.entries(rarityCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rarity, count]) => {
      console.log(`   ${rarity.toUpperCase()}: ${count} cartas`);
    });
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
