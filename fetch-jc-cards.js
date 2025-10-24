import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;
const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const JC_CONTRACT = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728';

function findAttr(nft, trait) {
  const locs = [
    nft?.raw?.metadata?.attributes,
    nft?.metadata?.attributes,
    nft?.metadata?.traits,
    nft?.raw?.metadata?.traits
  ];

  for (const attrs of locs) {
    if (Array.isArray(attrs)) {
      const found = attrs.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
      if (found?.value) return String(found.value);
    }
  }
  return '';
}

function calcPower(nft) {
  const rarity = findAttr(nft, 'rarity').toLowerCase();
  const wear = findAttr(nft, 'wear').toLowerCase();
  const foil = findAttr(nft, 'foil').toLowerCase();

  const baseMap = {
    common: 1,
    uncommon: 8,
    rare: 15,
    epic: 60,
    legendary: 150,
    mythic: 350
  };

  const wearMap = {
    pristine: 1.4,
    mint: 1.2
  };

  const foilMap = {
    'prize foil': 15,
    'standard foil': 2.5
  };

  const base = baseMap[rarity] || 0;
  const wearMult = wearMap[wear] || 1.0;
  const foilMult = foilMap[foil] || 1.0;

  return Math.max(1, Math.round(base * wearMult * foilMult));
}

async function fetchAllJCCards() {
  console.log('🔍 Fetching all JC cards from wallet:', JC_WALLET);
  console.log('📦 Contract:', JC_CONTRACT);
  console.log('');

  let allRevealed = [];
  let pageKey = null;
  let pageCount = 0;
  const maxPages = 100;

  do {
    pageCount++;
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${JC_WALLET}&contractAddresses[]=${JC_CONTRACT}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : ''}`;

    console.log(`📄 Fetching page ${pageCount}...`);

    // Add delay to avoid rate limiting
    if (pageCount > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const res = await fetch(url);

    if (!res.ok) {
      console.error('❌ API Error:', res.status);
      console.error('   Response:', await res.text());
      break;
    }

    const json = await res.json();
    const pageNfts = json.ownedNfts || [];

    // Filter unopened cards and cards without rarity
    const revealed = pageNfts.filter((nft) => {
      const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
      const rarityAttr = attrs.find((a) => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      // Keep only cards with valid rarity that is not unopened
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
      return validRarities.includes(rarity.toLowerCase());
    });

    console.log(`   ✅ Found ${revealed.length} revealed cards (${pageNfts.length} total on page)`);
    allRevealed = allRevealed.concat(revealed);

    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📦 TOTAL REVEALED CARDS: ${allRevealed.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Process cards
  console.log('⚙️  Processing cards...');
  const processed = allRevealed.map(nft => {
    const imageUrl = nft?.image?.cachedUrl ||
                     nft?.image?.thumbnailUrl ||
                     nft?.image?.originalUrl ||
                     nft?.raw?.metadata?.image ||
                     '';

    return {
      tokenId: nft.tokenId,
      name: nft.name || nft.raw?.metadata?.name || `Card #${nft.tokenId}`,
      imageUrl: imageUrl,
      rarity: findAttr(nft, 'rarity'),
      status: findAttr(nft, 'status'),
      wear: findAttr(nft, 'wear'),
      foil: findAttr(nft, 'foil'),
      power: calcPower(nft),
    };
  });

  // Count by rarity
  const byRarity = {};
  processed.forEach(card => {
    const r = card.rarity || 'unknown';
    byRarity[r] = (byRarity[r] || 0) + 1;
  });

  console.log('');
  console.log('📊 BY RARITY:');
  Object.entries(byRarity).forEach(([rarity, count]) => {
    console.log(`   ${rarity}: ${count}`);
  });

  // Save to file
  const filename = 'jc-cards-revealed.json';
  fs.writeFileSync(filename, JSON.stringify(processed, null, 2));
  console.log('');
  console.log(`💾 Saved to ${filename}`);
  console.log('');

  // Show top 10 strongest
  const sorted = [...processed].sort((a, b) => b.power - a.power);
  console.log('🏆 TOP 10 STRONGEST CARDS:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`   ${i + 1}. #${card.tokenId} - ${card.rarity} ${card.foil || ''} ${card.wear || ''} - ${card.power} power`);
  });
  console.log('');

  return processed;
}

fetchAllJCCards().catch(console.error);
