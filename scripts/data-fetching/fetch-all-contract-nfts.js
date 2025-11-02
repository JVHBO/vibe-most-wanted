const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';

console.log('🔍 Buscando TODAS as NFTs do contrato:', CONTRACT_ADDRESS);
console.log('   (Sem filtro de owner - todas as NFTs mintadas)');

async function fetchAllContractNFTs() {
  let allNfts = [];
  let startToken = 0;
  let pageCount = 0;

  // Buscar todas as NFTs do contrato (token 0 até o final)
  // Assumindo supply de ~7000
  const batchSize = 100;
  const maxToken = 7000;

  for (let start = 0; start < maxToken; start += batchSize) {
    pageCount++;
    const end = Math.min(start + batchSize - 1, maxToken - 1);

    console.log(`\n📡 Buscando tokens ${start} a ${end}...`);

    // Buscar metadados de múltiplas NFTs
    const promises = [];
    for (let tokenId = start; tokenId <= end; tokenId++) {
      const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${CONTRACT_ADDRESS}&tokenId=${tokenId}&refreshCache=false`;
      promises.push(
        fetch(url)
          .then(res => res.json())
          .then(data => ({ tokenId, data }))
          .catch(err => ({ tokenId, error: err.message }))
      );
    }

    const results = await Promise.all(promises);

    let foundInBatch = 0;
    results.forEach(({ tokenId, data, error }) => {
      // Se retornar erro ou não tiver metadata, provavelmente não existe
      if (!error && data && !data.error && data.name) {
        allNfts.push({
          tokenId: tokenId.toString(),
          raw: { metadata: data }
        });
        foundInBatch++;
      }
    });

    console.log(`  ✓ ${foundInBatch} NFTs encontradas neste lote (total: ${allNfts.length})`);

    // Se não encontrou nada neste lote, provavelmente chegamos ao fim
    if (foundInBatch === 0 && start > 1000) {
      console.log('  🛑 Nenhuma NFT encontrada neste lote, parando busca...');
      break;
    }

    // Wait to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Total de NFTs encontradas: ${allNfts.length}`);

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
    const imageUrl = metadata.image || '';

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

  console.log(`\n🎴 TOTAL de NFTs: ${processed.length}`);
  console.log(`✅ Cartas REVELADAS (sem unopened): ${revealed.length}`);
  console.log(`📦 Cartas UNOPENED (descartadas): ${processed.length - revealed.length}`);

  // Count by rarity
  const rarities = {};
  revealed.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas reveladas por raridade:');
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

fetchAllContractNFTs().catch(console.error);
