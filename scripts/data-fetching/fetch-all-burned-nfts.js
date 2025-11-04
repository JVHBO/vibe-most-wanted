const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728'; // JC Burned Cards Contract

console.log('🔍 Buscando TODAS as NFTs do contrato com trait "burned"');
console.log('   Contract:', CONTRACT_ADDRESS);

function findAttr(nft, trait) {
  const attrs = nft.raw?.metadata?.attributes || [];
  const attr = attrs.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
  return attr?.value || null;
}

function calcPower(nft) {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  let base = 1;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 800;
  else if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 80;
  else if (r.includes('rare')) base = 20;
  else if (r.includes('uncommon')) base = 8;
  else base = 1;

  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.8;
  else if (w.includes('mint')) wearMult = 1.4;

  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  const power = base * wearMult * foilMult;
  return Math.floor(power);
}

async function fetchAllBurnedNFTs() {
  let allBurnedNfts = [];
  let startToken = '0';
  let pageCount = 0;

  // Use getNFTsForContract para buscar todas as NFTs do contrato
  while (true) {
    pageCount++;
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract?contractAddress=${CONTRACT_ADDRESS}&withMetadata=true&startToken=${startToken}&limit=100`;

    console.log(`\n📡 Página ${pageCount} (startToken: ${startToken})...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API falhou: ${res.status}`);
      const json = await res.json();

      const pageNfts = json.nfts || [];

      // Filter NFTs: must NOT be unopened (rarity = "Unopened")
      const revealedInPage = pageNfts.filter(nft => {
        const attributes = nft.raw?.metadata?.attributes || [];

        // Check rarity - if "Unopened", skip it
        const rarityAttr = attributes.find(attr =>
          attr.trait_type?.toLowerCase() === 'rarity'
        );
        const isUnopened = rarityAttr?.value?.toLowerCase() === 'unopened';

        return !isUnopened; // Only return revealed cards
      });

      allBurnedNfts = allBurnedNfts.concat(revealedInPage);

      console.log(`  ✓ ${pageNfts.length} NFTs nesta página`);
      console.log(`  ✅ ${revealedInPage.length} reveladas (total acumulado: ${allBurnedNfts.length})`);

      // Check if there's a next page
      if (json.pageKey) {
        startToken = json.pageKey;
      } else {
        console.log('\n✅ Todas as páginas foram processadas!');
        break;
      }

      // Wait to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error('❌ Erro:', error.message);
      break;
    }
  }

  console.log(`\n📊 Total de NFTs REVELADAS: ${allBurnedNfts.length}`);

  // Process NFTs
  const processed = allBurnedNfts.map(nft => {
    const tokenId = nft.tokenId || nft.id?.tokenId;
    const metadata = nft.raw?.metadata || {};

    // Extract rarity
    const rarity = findAttr(nft, 'rarity') || 'Unknown';

    // Calculate power using same formula as page.tsx
    const power = calcPower(nft);

    // Extract image
    const imageUrl = nft.image?.cachedUrl ||
                     nft.image?.thumbnailUrl ||
                     nft.image?.originalUrl ||
                     metadata.image ||
                     '';

    return {
      tokenId,
      rarity,
      power,
      imageUrl,
      name: metadata.name || `Card #${tokenId}`,
      attributes: metadata.attributes || []
    };
  });

  // Count by rarity
  const rarities = {};
  processed.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas por raridade:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  // Top 10 strongest
  const sorted = [...processed].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  // Top 5 power
  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
  console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

  // Save
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(processed, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');

  return processed;
}

fetchAllBurnedNFTs().catch(console.error);
