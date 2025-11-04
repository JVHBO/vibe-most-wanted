const fetch = require('node-fetch');
const fs = require('fs');

const BASE_RPC = 'https://mainnet.base.org'; // RPC público do Base
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';

console.log('🔍 Buscando total supply via RPC do Base');
console.log('   Contract:', CONTRACT_ADDRESS);

// ERC721 totalSupply signature: 0x18160ddd
// ERC721 tokenByIndex signature: 0x4f6ccce7

async function callRPC(method, params) {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });

  const json = await res.json();
  return json.result;
}

async function getTotalSupply() {
  // Call totalSupply()
  const data = '0x18160ddd'; // totalSupply() function signature

  const result = await callRPC('eth_call', [{
    to: CONTRACT_ADDRESS,
    data
  }, 'latest']);

  if (!result) return 0;

  return parseInt(result, 16);
}

async function getTokenByIndex(index) {
  // Call tokenByIndex(uint256)
  const indexHex = index.toString(16).padStart(64, '0');
  const data = '0x4f6ccce7' + indexHex;

  try {
    const result = await callRPC('eth_call', [{
      to: CONTRACT_ADDRESS,
      data
    }, 'latest']);

    if (!result) return null;
    return parseInt(result, 16);
  } catch (error) {
    return null;
  }
}

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

  return Math.floor(base * wearMult * foilMult);
}

async function fetchTokenMetadata(tokenId) {
  const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${CONTRACT_ADDRESS}&tokenId=${tokenId}&refreshCache=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (!data.name || data.error) return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('\n1️⃣ Buscando totalSupply do contrato...');

  const totalSupply = await getTotalSupply();
  console.log(`   Total Supply: ${totalSupply}`);

  if (totalSupply === 0) {
    console.log('\n⚠️ totalSupply retornou 0. Tentando abordagem alternativa...');
    console.log('   Vou tentar buscar tokens 0-10000 diretamente com Alchemy');

    // Fallback: buscar tokens 0-10000
    await fetchTokensDirectly();
    return;
  }

  console.log('\n2️⃣ Buscando token IDs via tokenByIndex...');

  const tokenIds = [];
  const batchSize = 10;

  for (let i = 0; i < Math.min(totalSupply, 10000); i += batchSize) {
    const promises = [];
    for (let j = 0; j < batchSize && (i + j) < totalSupply; j++) {
      promises.push(getTokenByIndex(i + j));
    }

    const results = await Promise.all(promises);
    results.forEach((tokenId, idx) => {
      if (tokenId !== null) {
        tokenIds.push(tokenId);
      }
    });

    if (i % 100 === 0) {
      console.log(`   Progresso: ${i}/${totalSupply} (${tokenIds.length} tokens encontrados)`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Encontrados ${tokenIds.length} token IDs`);

  // Agora buscar metadata de cada token
  console.log('\n3️⃣ Buscando metadata dos tokens...');
  await fetchMetadataForTokens(tokenIds);
}

async function fetchTokensDirectly() {
  let allBurnedCards = [];
  const BATCH_SIZE = 50;
  const MAX_TOKEN_ID = 10000;

  for (let startToken = 0; startToken < MAX_TOKEN_ID; startToken += BATCH_SIZE) {
    const endToken = Math.min(startToken + BATCH_SIZE - 1, MAX_TOKEN_ID - 1);

    console.log(`\n📡 Buscando tokens ${startToken} a ${endToken}...`);

    const promises = [];
    for (let tokenId = startToken; tokenId <= endToken; tokenId++) {
      promises.push(fetchTokenMetadata(tokenId));
    }

    const results = await Promise.all(promises);

    let foundInBatch = 0;
    let burnedInBatch = 0;

    results.forEach((metadata, idx) => {
      const tokenId = startToken + idx;

      if (!metadata) return;

      foundInBatch++;

      const attributes = metadata.attributes || [];
      const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
      const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

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

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  saveResults(allBurnedCards);
}

async function fetchMetadataForTokens(tokenIds) {
  let allBurnedCards = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);

    console.log(`\n📡 Buscando metadata ${i} a ${Math.min(i + BATCH_SIZE, tokenIds.length)}/${tokenIds.length}...`);

    const promises = batch.map(tokenId => fetchTokenMetadata(tokenId));
    const results = await Promise.all(promises);

    let burnedInBatch = 0;

    results.forEach((metadata, idx) => {
      if (!metadata) return;

      const tokenId = batch[idx];
      const attributes = metadata.attributes || [];

      const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
      const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

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

    console.log(`  🔥 ${burnedInBatch} burned + valid rarity (total: ${allBurnedCards.length})`);

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

  const rarities = {};
  allBurnedCards.forEach(card => {
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
  });

  console.log('\n🎯 Cartas por raridade:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
    console.log(`  ${rarity}: ${count} cartas`);
  });

  const sorted = [...allBurnedCards].sort((a, b) => b.power - a.power);
  console.log('\n💪 Top 10 mais fortes:');
  sorted.slice(0, 10).forEach((card, i) => {
    console.log(`  ${i + 1}. Token #${card.tokenId} - ${card.rarity} - Power: ${card.power}`);
  });

  const top5 = sorted.slice(0, 5);
  const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
  console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
  console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

  fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(allBurnedCards, null, 2));
  console.log('\n✅ Salvo em: jc-cards-revealed.json');
}

main().catch(console.error);
