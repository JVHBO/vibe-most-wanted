const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a'; // Contrato da coleção
const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728'; // Wallet do JC (owner)

console.log('🔍 Buscando NFTs:');
console.log('   Owner (JC):', JC_WALLET);
console.log('   Contract:', CONTRACT_ADDRESS);

async function fetchAllNFTs() {
  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;
  const maxPages = 20;

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

  console.log(`\n📊 Total de NFTs brutas: ${allNfts.length}`);

  // Process NFTs
  const processed = allNfts.map(nft => {
    const tokenId = nft.tokenId;
    const metadata = nft.raw?.metadata || {};
    const attributes = metadata.attributes || [];

    // Check for "unopened" trait
    const typeAttr = attributes.find(attr =>
      attr.trait_type?.toLowerCase() === 'type'
    );
    const hasUnopened = typeAttr?.value?.toLowerCase() === 'unopened';

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
      attributes
    };
  });

  // Filter out unopened cards
  const revealed = processed.filter(nft => !nft.hasUnopened);

  console.log(`\n🎴 Cartas REVELADAS (sem unopened): ${revealed.length}`);
  console.log(`📦 Cartas UNOPENED (descartadas): ${processed.length - revealed.length}`);

  // Count by rarity
  const rarities = {};
  revealed.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Por raridade:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  // Top 10 strongest
  const sorted = [...revealed].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  // Top 5 power
  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
  console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

  // Save (remove hasUnopened)
  const toSave = revealed.map(({ hasUnopened, ...card }) => card);
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(toSave, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');

  return toSave;
}

fetchAllNFTs().catch(console.error);
