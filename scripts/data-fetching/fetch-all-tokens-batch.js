const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const MAX_TOKEN_ID = 10000; // Supply total estimado
const BATCH_SIZE = 50; // Buscar 50 tokens por vez

console.log('🔍 Buscando TODAS as NFTs token por token');
console.log('   Contract:', CONTRACT_ADDRESS);
console.log('   Range: 0 a', MAX_TOKEN_ID);

function findAttr(nft, trait) {
  const attrs = nft.attributes || [];
  const attr = attrs.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
  return attr?.value || null;
}

function calcPower(nft) {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  let base = 1;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 350;
  else if (r.includes('legend')) base = 150;
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

async function fetchTokenMetadata(tokenId) {
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${CONTRACT_ADDRESS}&tokenId=${tokenId}&refreshCache=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    // Se não tem nome ou deu erro, token não existe
    if (!data.name || data.error) return null;

    return data;
  } catch (error) {
    return null;
  }
}

async function fetchAllTokens() {
  let allBurnedCards = [];
  let processedTokens = 0;
  let notFoundCount = 0;
  const MAX_NOT_FOUND = 200; // Se não achar 200 seguidos, para

  for (let startToken = 0; startToken < MAX_TOKEN_ID; startToken += BATCH_SIZE) {
    const endToken = Math.min(startToken + BATCH_SIZE - 1, MAX_TOKEN_ID - 1);

    console.log(`\n📡 Buscando tokens ${startToken} a ${endToken}...`);

    // Buscar batch de tokens em paralelo
    const promises = [];
    for (let tokenId = startToken; tokenId <= endToken; tokenId++) {
      promises.push(fetchTokenMetadata(tokenId));
    }

    const results = await Promise.all(promises);

    let foundInBatch = 0;
    let burnedInBatch = 0;

    results.forEach((metadata, idx) => {
      const tokenId = startToken + idx;

      if (!metadata) {
        notFoundCount++;
        return;
      }

      notFoundCount = 0; // Reset counter
      foundInBatch++;
      processedTokens++;

      const attributes = metadata.attributes || [];

      // Check status
      const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
      const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

      // Check rarity
      const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      const validRarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(rarity);

      if (isBurned && validRarity) {
        burnedInBatch++;

        const power = calcPower({ attributes });
        const imageUrl = metadata.image || '';

        allBurnedCards.push({
          tokenId: tokenId.toString(),
          rarity,
          power,
          imageUrl,
          name: metadata.name || `Card #${tokenId}`,
          attributes
        });
      }
    });

    console.log(`  ✓ ${foundInBatch} tokens existem`);
    console.log(`  🔥 ${burnedInBatch} burned + valid rarity (total: ${allBurnedCards.length})`);

    // Se não achou nada em 200 tokens seguidos, para
    if (notFoundCount >= MAX_NOT_FOUND) {
      console.log(`\n⚠️ Não encontrou ${MAX_NOT_FOUND} tokens seguidos, parando busca...`);
      break;
    }

    // Wait to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Busca completa!`);
  console.log(`📊 Total processado: ${processedTokens} tokens`);
  console.log(`🔥 Total BURNED com rarity válida: ${allBurnedCards.length}`);

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

  // Save
  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(allBurnedCards, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');

  return allBurnedCards;
}

fetchAllTokens().catch(console.error);
