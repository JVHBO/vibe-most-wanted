const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728'; // Burned cards wallet

console.log('🔍 Buscando NFTs BURNED (JC Deck):');
console.log('   Owner:', JC_WALLET);
console.log('   Contract:', CONTRACT_ADDRESS);
console.log('   Filtrando: status = "burned" + SEM trait "unopened"');

async function fetchJCBurnedCards() {
  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;
  const maxPages = 100; // Aumentar para pegar todas

  do {
    pageCount++;
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${JC_WALLET}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;

    console.log(`\n📡 Página ${pageCount}...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API falhou: ${res.status}`);
      const json = await res.json();

      const pageNfts = json.ownedNfts || [];
      allNfts = allNfts.concat(pageNfts);

      console.log(`  ✓ ${pageNfts.length} NFTs encontradas (total: ${allNfts.length})`);

      pageKey = json.pageKey;

      // Wait to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Erro:', error.message);
      break;
    }
  } while (pageKey && pageCount < maxPages);

  console.log(`\n📊 Total de NFTs no wallet: ${allNfts.length}`);

  // Process NFTs
  const processed = allNfts.map(nft => {
    const tokenId = nft.tokenId;
    const metadata = nft.raw?.metadata || {};
    const attributes = metadata.attributes || [];

    // Check for "unopened" trait in Type
    const typeAttr = attributes.find(attr =>
      attr.trait_type?.toLowerCase() === 'type'
    );
    const hasUnopened = typeAttr?.value?.toLowerCase() === 'unopened';

    // Check for "burned" trait in Status
    const statusAttr = attributes.find(attr =>
      attr.trait_type?.toLowerCase() === 'status'
    );
    const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

    // Extract rarity
    const rarityAttr = attributes.find(attr =>
      attr.trait_type?.toLowerCase() === 'rarity'
    );
    const rarity = rarityAttr?.value || 'Unknown';

    // Extract power
    const powerAttr = attributes.find(attr =>
      attr.trait_type?.toLowerCase() === 'power'
    );
    const power = powerAttr ? parseInt(powerAttr.value) : 0;

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
      hasUnopened,
      isBurned,
      status: statusAttr?.value,
      type: typeAttr?.value,
      attributes
    };
  });

  // Filter: must be burned AND NOT unopened
  const validCards = processed.filter(nft => nft.isBurned && !nft.hasUnopened);

  console.log(`\n🔥 Total com status "burned": ${processed.filter(n => n.isBurned).length}`);
  console.log(`📦 Total com type "unopened": ${processed.filter(n => n.hasUnopened).length}`);
  console.log(`✅ Cartas VÁLIDAS (burned + revealed): ${validCards.length}`);

  // Count by rarity
  const rarities = {};
  validCards.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas por raridade:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  // Top 10 strongest
  const sorted = [...validCards].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  // Top 5 power
  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
  console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

  // Save (remove temporary fields)
  const toSave = validCards.map(({ hasUnopened, isBurned, status, type, ...card }) => card);
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(toSave, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');

  return toSave;
}

fetchJCBurnedCards().catch(console.error);
