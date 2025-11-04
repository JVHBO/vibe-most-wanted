const fetch = require('node-fetch');
const fs = require('fs');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const MAIN_CONTRACT = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const BURNED_CONTRACT = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';

console.log('🔍 Buscando NFTs via Alchemy API (múltiplas estratégias)');
console.log('   Main Contract:', MAIN_CONTRACT);
console.log('   Burned Contract:', BURNED_CONTRACT);

function findAttr(nft, trait) {
  const attrs = nft.raw?.metadata?.attributes || nft.attributes || [];
  const attr = attrs.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
  return attr?.value || null;
}

function calcPower(nft) {
  const attrs = nft.raw?.metadata?.attributes || nft.attributes || [];

  const foilAttr = attrs.find(a => a.trait_type?.toLowerCase() === 'foil');
  const rarityAttr = attrs.find(a => a.trait_type?.toLowerCase() === 'rarity');
  const wearAttr = attrs.find(a => a.trait_type?.toLowerCase() === 'wear');

  const foil = foilAttr?.value || 'None';
  const rarity = rarityAttr?.value || 'Common';
  const wear = wearAttr?.value || 'Lightly Played';

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

// Estratégia 1: Buscar NFTs que foram transferidas para o burned contract
async function strategy1_GetTransfersToContract() {
  console.log('\n🔄 Estratégia 1: Buscando transfers para o burned contract...');

  let allTokens = new Set();
  let pageKey = undefined;
  let pageCount = 0;

  while (pageCount < 10) {
    pageCount++;

    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getAssetTransfers?` +
      `fromBlock=0x0&` +
      `toBlock=latest&` +
      `toAddress=${BURNED_CONTRACT}&` +
      `contractAddresses[]=${MAIN_CONTRACT}&` +
      `category[]=erc721&` +
      `maxCount=100` +
      (pageKey ? `&pageKey=${pageKey}` : '');

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json.transfers || json.transfers.length === 0) break;

      json.transfers.forEach(tx => {
        if (tx.tokenId) {
          allTokens.add(parseInt(tx.tokenId, 16).toString());
        }
      });

      console.log(`  Página ${pageCount}: ${json.transfers.length} transfers (${allTokens.size} tokens únicos)`);

      pageKey = json.pageKey;
      if (!pageKey) break;

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('  ❌ Erro:', error.message);
      break;
    }
  }

  console.log(`  ✅ Total de tokens transferidos: ${allTokens.size}`);
  return Array.from(allTokens);
}

// Estratégia 2: Buscar NFTs owned by burned contract (getNFTsForOwner)
async function strategy2_GetNFTsForOwner() {
  console.log('\n📦 Estratégia 2: Buscando NFTs owned by burned contract...');

  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;

  while (pageCount < 100) {
    pageCount++;

    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?` +
      `owner=${BURNED_CONTRACT}&` +
      `contractAddresses[]=${MAIN_CONTRACT}&` +
      `withMetadata=true&` +
      `pageSize=100` +
      (pageKey ? `&pageKey=${pageKey}` : '');

    try {
      const res = await fetch(url);
      const json = await res.json();

      const nfts = json.ownedNfts || [];
      allNfts = allNfts.concat(nfts);

      console.log(`  Página ${pageCount}: ${nfts.length} NFTs (total: ${allNfts.length})`);

      pageKey = json.pageKey;
      if (!pageKey || nfts.length === 0) break;

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('  ❌ Erro:', error.message);
      break;
    }
  }

  console.log(`  ✅ Total de NFTs owned: ${allNfts.length}`);
  return allNfts;
}

// Estratégia 3: Buscar metadata de tokens específicos
async function strategy3_GetMetadataForTokens(tokenIds) {
  console.log(`\n🎯 Estratégia 3: Buscando metadata de ${tokenIds.length} tokens...`);

  let allNfts = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);

    console.log(`  Buscando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tokenIds.length / BATCH_SIZE)}...`);

    const promises = batch.map(async (tokenId) => {
      const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?` +
        `contractAddress=${MAIN_CONTRACT}&` +
        `tokenId=${tokenId}&` +
        `refreshCache=false`;

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
    allNfts = allNfts.concat(validNfts);

    console.log(`    ✓ ${validNfts.length}/${batch.length} válidos (total: ${allNfts.length})`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`  ✅ Total de metadata buscadas: ${allNfts.length}`);
  return allNfts;
}

function processAndFilterNFTs(nfts) {
  let allBurnedCards = [];

  nfts.forEach(nft => {
    const attributes = nft.raw?.metadata?.attributes || nft.attributes || [];

    // Check status
    const statusAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'status');
    const isBurned = statusAttr?.value?.toLowerCase() === 'burned';

    // Check rarity
    const rarityAttr = attributes.find(a => a.trait_type?.toLowerCase() === 'rarity');
    const rarity = rarityAttr?.value || '';
    const validRarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(rarity);

    if (isBurned && validRarity) {
      const power = calcPower(nft);
      const tokenId = nft.tokenId || nft.id?.tokenId || '';
      const metadata = nft.raw?.metadata || {};
      const imageUrl = nft.image?.cachedUrl ||
                       nft.image?.thumbnailUrl ||
                       nft.image?.originalUrl ||
                       metadata.image ||
                       '';

      allBurnedCards.push({
        tokenId: tokenId.toString(),
        rarity,
        power,
        imageUrl,
        name: metadata.name || nft.name || `Card #${tokenId}`,
        attributes
      });
    }
  });

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
  console.log('\n🚀 Iniciando busca com múltiplas estratégias...\n');

  // Tentar estratégia 2 primeiro (mais rápida)
  let nfts = await strategy2_GetNFTsForOwner();

  if (nfts.length === 0) {
    console.log('\n⚠️ Estratégia 2 não encontrou NFTs. Tentando estratégia 1...');

    // Tentar estratégia 1
    const tokenIds = await strategy1_GetTransfersToContract();

    if (tokenIds.length > 0) {
      // Buscar metadata dos tokens encontrados
      nfts = await strategy3_GetMetadataForTokens(tokenIds);
    }
  }

  if (nfts.length === 0) {
    console.log('\n❌ Nenhuma NFT encontrada com nenhuma estratégia.');
    console.log('\n💡 Isso significa que o contrato principal não transferiu NFTs para o burned contract,');
    console.log('   ou as NFTs burned estão em outro lugar.');
    console.log('\n✅ Vamos usar o deck que já temos (1,373 cards do contrato burned)');
    return;
  }

  console.log(`\n✅ Total de NFTs encontradas: ${nfts.length}`);
  console.log('\n🔍 Filtrando apenas burned cards com rarity válida...');

  const burnedCards = processAndFilterNFTs(nfts);
  saveResults(burnedCards);
}

main().catch(console.error);
