const fetch = require('node-fetch');
const fs = require('fs');

const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const JC_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728'; // Endereço correto do JC

async function fetchAllNFTs() {
  console.log('🔍 Buscando NFTs do JC:', JC_ADDRESS);

  let allNFTs = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `https://base.blockscout.com/api/v2/tokens/${CONTRACT_ADDRESS}/instances?holder_address_hash=${JC_ADDRESS}&offset=${offset}&limit=${limit}`;

    console.log(`📡 Buscando página ${Math.floor(offset / limit) + 1}...`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        allNFTs = allNFTs.concat(data.items);
        offset += limit;

        // Check if there are more pages
        hasMore = data.next_page_params !== null;

        console.log(`  ✓ ${data.items.length} NFTs encontradas (total: ${allNFTs.length})`);

        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar NFTs:', error.message);
      hasMore = false;
    }
  }

  console.log(`\n📊 Total de NFTs brutas: ${allNFTs.length}`);

  // Process and filter NFTs
  const processedNFTs = allNFTs.map(nft => {
    const tokenId = nft.id;
    const metadata = nft.metadata || {};
    const attributes = metadata.attributes || [];

    // Check if has "unopened" trait
    const hasUnopened = attributes.some(attr =>
      attr.trait_type === 'Type' && attr.value === 'unopened'
    );

    // Extract rarity
    const rarityAttr = attributes.find(attr => attr.trait_type === 'Rarity');
    const rarity = rarityAttr ? rarityAttr.value : 'Unknown';

    // Extract power
    const powerAttr = attributes.find(attr => attr.trait_type === 'Power');
    const power = powerAttr ? parseInt(powerAttr.value) : 0;

    return {
      tokenId,
      rarity,
      power,
      image: metadata.image || '',
      name: metadata.name || `Card #${tokenId}`,
      hasUnopened,
      attributes
    };
  });

  // Filter out unopened cards
  const revealedCards = processedNFTs.filter(nft => !nft.hasUnopened);

  console.log(`\n🎴 Cartas reveladas (sem trait unopened): ${revealedCards.length}`);
  console.log(`📦 Cartas unopened (descartadas): ${processedNFTs.length - revealedCards.length}`);

  // Count by rarity
  const rarities = {};
  revealedCards.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas reveladas por raridade:');
  Object.entries(rarities).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  // Show top 10 strongest
  const sorted = [...revealedCards].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 cartas mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  // Calculate top 5 power
  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);

  // Save to file (remove hasUnopened from saved data)
  const cardsToSave = revealedCards.map(({ hasUnopened, ...card }) => card);
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(cardsToSave, null, 2));
  console.log('\n✅ Arquivo salvo: jc-cards-revealed.json');

  return cardsToSave;
}

fetchAllNFTs().catch(console.error);
