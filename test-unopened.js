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
  const maxPages = 100; // Fetch all to see total

  console.log('🔍 Fetching NFTs from wallet:', owner);
  console.log('');

  do {
    pageCount++;
    process.stdout.write(`\r   Fetching page ${pageCount}... (${allNfts.length} cards so far)`);

    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;

    if (pageCount === 1) {
      console.log('\n   📡 First API call:');
      console.log('   Chain:', CHAIN);
      console.log('   Contract:', CONTRACT_ADDRESS);
      console.log('\n');
    }

    const res = await fetch(url);
    if (!res.ok) {
      console.log('\n❌ API Error:', res.status, res.statusText);
      const errorText = await res.text();
      console.log('Error details:', errorText.substring(0, 500));
      throw new Error(`API falhou: ${res.status}`);
    }
    const json = await res.json();

    if (pageCount === 1) {
      console.log('   Response keys:', Object.keys(json));
      console.log('   ownedNfts length:', json.ownedNfts?.length || 0);
      console.log('   pageKey:', json.pageKey ? 'exists' : 'none');
      console.log('\n');
    }

    allNfts = allNfts.concat(json.ownedNfts || []);
    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  console.log(`\n\n✅ Total fetched: ${allNfts.length} NFTs from ${pageCount} pages\n`);
  return allNfts;
}

function findAttr(nft, traitType) {
  const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
  const found = attrs.find(a => a.trait_type?.toLowerCase() === traitType.toLowerCase());
  return found?.value || '';
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ANALYZING JC WALLET - OPENED vs UNOPENED CARDS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const raw = await fetchNFTs(JC_WALLET);

  // Count unopened vs opened
  let unopened = 0;
  let opened = 0;
  const rarities = {};

  raw.forEach(nft => {
    const rarity = findAttr(nft, 'rarity');

    // Count by rarity
    if (rarity) {
      rarities[rarity] = (rarities[rarity] || 0) + 1;
    }

    // Count unopened vs opened
    if (rarity.toLowerCase() === 'unopened') {
      unopened++;
    } else {
      opened++;
    }
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 TOTAL CARDS:', raw.length);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔒 UNOPENED:', unopened, `(${(unopened/raw.length*100).toFixed(1)}%)`);
  console.log('✅ OPENED:', opened, `(${(opened/raw.length*100).toFixed(1)}%)`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 BREAKDOWN BY RARITY:');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Sort by count
  const sorted = Object.entries(rarities).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([rarity, count]) => {
    const pct = (count / raw.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / 100));
    console.log(`   ${rarity.padEnd(15)} ${String(count).padStart(5)} (${String(pct).padStart(5)}%)  ${bar}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');

  // Show sample opened cards
  const openedCards = raw.filter(nft => findAttr(nft, 'rarity').toLowerCase() !== 'unopened');
  if (openedCards.length > 0) {
    console.log('\n✅ SAMPLE OPENED CARDS (first 10):\n');
    openedCards.slice(0, 10).forEach((nft, i) => {
      const rarity = findAttr(nft, 'rarity');
      const name = nft?.name || nft?.raw?.metadata?.name || 'Unknown';
      console.log(`   ${i + 1}. #${nft.tokenId} - ${rarity} - ${name}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
