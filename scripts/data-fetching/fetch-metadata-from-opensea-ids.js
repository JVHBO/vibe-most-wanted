const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const MAIN_CONTRACT = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';

console.log('🔍 Buscando metadata dos token IDs do OpenSea via Alchemy');

function calcPower(attributes) {
  const foilAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'foil');
  const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
  const wearAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'wear');

  const foil = foilAttr?.value || 'None';
  const rarity = rarityAttr?.value || 'Common';
  const wear = wearAttr?.value || 'Lightly Played';

  let base = 20;
  const r = rarity.toLowerCase();
  if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 80;
  else if (r.includes('rare')) base = 20;
  else if (r.includes('common')) base = 20;
  else base = 20;

  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.25;
  else if (w.includes('mint')) wearMult = 1.1;

  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  return Math.floor(base * wearMult * foilMult);
}

async function fetchMetadataForTokens(tokenIds) {
  let allBurnedCards = [];
  const BATCH_SIZE = 100;

  console.log(`\n📦 Buscando metadata de ${tokenIds.length} tokens...`);

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);

    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tokenIds.length / BATCH_SIZE)} (${i}-${i + batch.length})...`);

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
      const attributes = nft.raw?.metadata?.attributes || nft.attributes || [];

      // Check status
      const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
      const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

      // Check rarity
      const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      const validRarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(rarity);

      if (isBurned && validRarity) {
        const power = calcPower(attributes);
        const metadata = nft.raw?.metadata || {};
        const imageUrl = nft.image?.cachedUrl ||
                         nft.image?.thumbnailUrl ||
                         nft.image?.originalUrl ||
                         metadata.image ||
                         '';

        allBurnedCards.push({
          tokenId: nft.tokenId.toString(),
          rarity,
          power,
          imageUrl,
          name: metadata.name || nft.name || `Card #${nft.tokenId}`,
          attributes
        });
      }
    });

    console.log(`     ✓ ${validNfts.length}/${batch.length} válidos | 🔥 ${allBurnedCards.length} burned total`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allBurnedCards;
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

async function main() {
  // Ler token IDs do OpenSea
  const tokenIds = JSON.parse(fs.readFileSync('opensea-token-ids.json', 'utf-8'));
  console.log(`\n📋 Lidos ${tokenIds.length} token IDs do OpenSea`);

  // Buscar metadata
  const burnedCards = await fetchMetadataForTokens(tokenIds);

  // Salvar resultados
  saveResults(burnedCards);
}

main().catch(console.error);
