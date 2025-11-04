const fetch = require('node-fetch');
const fs = require('fs');

const BASESCAN_API_KEY = 'V8VD3SNU91M6RXNHF9S4VXTIV54SVGE9X4';
const MAIN_CONTRACT = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const BURNED_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';

console.log('🔍 Testando Basescan API');
console.log('   Contract:', MAIN_CONTRACT);
console.log('   Burned Wallet:', BURNED_WALLET);

function findAttr(attributes, trait) {
  const attr = attributes.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
  return attr?.value || null;
}

function calcPower(attributes) {
  const foilAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'foil');
  const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
  const wearAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'wear');

  const foil = foilAttr?.value || 'None';
  const rarity = rarityAttr?.value || 'Common';
  const wear = wearAttr?.value || 'Lightly Played';

  let base = 1;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 600;
  else if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 60;
  else if (r.includes('rare')) base = 15;
  else if (r.includes('uncommon')) base = 8;
  else base = 1;

  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.4;
  else if (w.includes('mint')) wearMult = 1.2;

  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  return Math.floor(base * wearMult * foilMult);
}

async function testBasescanAPI() {
  console.log('\n1️⃣ Testando: Basescan API V2...');

  // Try V2 API - Get all transactions to the burned wallet
  const url = `https://api.basescan.org/v2/api?chainid=8453&module=account&action=tokennfttx&contractaddress=${MAIN_CONTRACT}&address=${BURNED_WALLET}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${BASESCAN_API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    console.log('\n📊 Basescan Response:');
    console.log('   Status:', json.status);
    console.log('   Message:', json.message);

    if (json.result && Array.isArray(json.result)) {
      console.log('   Total transfers:', json.result.length);

      // Extract unique token IDs
      const tokenIds = new Set();
      json.result.forEach(tx => {
        if (tx.to.toLowerCase() === BURNED_WALLET.toLowerCase()) {
          tokenIds.add(tx.tokenID);
        }
      });

      console.log('   Unique tokens transferred TO burned wallet:', tokenIds.size);

      if (tokenIds.size > 0) {
        console.log('\n✅ Found token IDs!');
        console.log('   First 10:', Array.from(tokenIds).slice(0, 10).join(', '));

        // Now we need to fetch metadata for each token
        // Basescan doesn't provide NFT metadata directly, so we'll use Alchemy
        console.log('\n2️⃣ Fetching metadata via Alchemy...');
        await fetchMetadataForTokens(Array.from(tokenIds));
      } else {
        console.log('\n⚠️ No transfers found to burned wallet');
      }
    } else {
      console.log('   Result:', json.result);
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

async function fetchMetadataForTokens(tokenIds) {
  const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
  const CHAIN = 'base-mainnet';

  let allBurnedCards = [];
  const BATCH_SIZE = 50;

  console.log(`\n   Buscando metadata de ${tokenIds.length} tokens...`);

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);

    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tokenIds.length / BATCH_SIZE)}...`);

    const promises = batch.map(async (tokenId) => {
      const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${MAIN_CONTRACT}&tokenId=${tokenId}&refreshCache=false`;

      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.name || data.error) return null;
        return { ...data, tokenId };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validNfts = results.filter(nft => nft !== null);

    validNfts.forEach(nft => {
      const attributes = nft.attributes || [];

      // Check status
      const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
      const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

      // Check rarity
      const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      const validRarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(rarity);

      if (isBurned && validRarity) {
        const power = calcPower(attributes);

        allBurnedCards.push({
          tokenId: nft.tokenId.toString(),
          rarity,
          power,
          imageUrl: nft.image || '',
          name: nft.name || `Card #${nft.tokenId}`,
          attributes
        });
      }
    });

    console.log(`     ✓ ${validNfts.length}/${batch.length} válidos | 🔥 ${allBurnedCards.length} burned total`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  saveResults(allBurnedCards);
}

function saveResults(allBurnedCards) {
  console.log(`\n📊 Total de NFTs BURNED com rarity válida: ${allBurnedCards.length}`);

  if (allBurnedCards.length === 0) {
    console.log('\n⚠️ Nenhuma carta burned encontrada!');
    return;
  }

  // Count by rarity
  const rarities = {};
  allBurnedCards.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas por raridade:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  // Top 10
  const sorted = [...allBurnedCards].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  // Top 5 power
  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
  console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

  // Count Legendary
  const legendaryCount = allBurnedCards.filter(c =>
    c.rarity.toLowerCase().includes('legend')
  ).length;
  console.log(`\n⭐ Total de Legendary: ${legendaryCount}`);

  // Save
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(allBurnedCards, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');
}

testBasescanAPI().catch(console.error);
