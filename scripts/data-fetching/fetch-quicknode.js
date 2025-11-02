const fetch = require('node-fetch');
const fs = require('fs');

// Seu endpoint QuickNode para Base mainnet
const QUICKNODE_ENDPOINT = 'https://skilled-fluent-replica.base-mainnet.quiknode.pro/22da536e5064e3061d6adecfa3ce536d280ca95d/';
const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';

console.log('🔍 Buscando NFTs via QuickNode');
console.log('   Contract:', CONTRACT_ADDRESS);
console.log('   Endpoint:', QUICKNODE_ENDPOINT.split('/').slice(0, -1).join('/') + '/***');

function findAttr(attributes, trait) {
  const attr = attributes.find(a => a.trait_type?.toLowerCase() === trait.toLowerCase());
  return attr?.value || null;
}

function calcPower(attributes) {
  const foil = findAttr(attributes, 'foil') || 'None';
  const rarity = findAttr(attributes, 'rarity') || 'Common';
  const wear = findAttr(attributes, 'wear') || 'Lightly Played';

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

async function callQuickNode(method, params) {
  const res = await fetch(QUICKNODE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });

  if (!res.ok) {
    throw new Error(`QuickNode API falhou: ${res.status}`);
  }

  const json = await res.json();

  if (json.error) {
    throw new Error(`QuickNode error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result;
}

async function fetchAllNFTs() {
  let allBurnedCards = [];
  let page = 1;
  const perPage = 100;

  console.log('\n📡 Iniciando busca...\n');

  while (page < 200) { // Max 200 páginas
    console.log(`📄 Buscando página ${page}...`);

    try {
      // Usando qn_fetchNFTsByCollection v2
      const result = await callQuickNode('qn_fetchNFTsByCollection', [{
        collection: CONTRACT_ADDRESS,
        page: page,
        perPage: perPage
      }]);

      const tokens = result?.tokens || [];

      if (tokens.length === 0) {
        console.log('\n✅ Não há mais tokens para buscar');
        break;
      }

      let burnedInPage = 0;

      tokens.forEach(token => {
        const attributes = token.traits || [];

        // Check status
        const status = findAttr(attributes, 'status');
        const isBurned = status?.toLowerCase() === 'burned';

        // Check rarity
        const rarity = findAttr(attributes, 'rarity') || '';
        const validRarity = ['common', 'rare', 'epic', 'legendary'].includes(rarity.toLowerCase());

        if (isBurned && validRarity) {
          burnedInPage++;

          const power = calcPower(attributes);
          const tokenId = token.tokenId || '';
          const imageUrl = token.imageUrl || token.mediUrl || '';
          const name = token.name || `Card #${tokenId}`;

          allBurnedCards.push({
            tokenId,
            rarity,
            power,
            imageUrl,
            name,
            attributes
          });
        }
      });

      console.log(`  ✓ ${tokens.length} NFTs | 🔥 ${burnedInPage} burned (total: ${allBurnedCards.length})`);

      page++;

      // Wait to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('\n❌ Erro:', error.message);

      // Se método não existir, tenta alternativa
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('\n⚠️ Método qn_fetchNFTsByCollection não disponível');
        console.log('Tentando método alternativo...\n');
        return await fetchViaAlternativeMethod();
      }

      break;
    }
  }

  saveResults(allBurnedCards);
  return allBurnedCards;
}

async function fetchViaAlternativeMethod() {
  console.log('📡 Usando método qn_fetchNFTs (buscar por owner)...');

  // Vamos buscar do contrato que sabemos que funciona
  const WORKING_CONTRACT = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';

  let allBurnedCards = [];
  let page = 1;

  while (page < 100) {
    try {
      const result = await callQuickNode('qn_fetchNFTs', [{
        wallet: WORKING_CONTRACT,
        contracts: [CONTRACT_ADDRESS],
        page: page,
        perPage: 100
      }]);

      const assets = result?.assets || [];

      if (assets.length === 0) break;

      let burnedInPage = 0;

      assets.forEach(asset => {
        const attributes = asset.traits || [];
        const status = findAttr(attributes, 'status');
        const isBurned = status?.toLowerCase() === 'burned';
        const rarity = findAttr(attributes, 'rarity') || '';
        const validRarity = ['common', 'rare', 'epic', 'legendary'].includes(rarity.toLowerCase());

        if (isBurned && validRarity) {
          burnedInPage++;
          const power = calcPower(attributes);

          allBurnedCards.push({
            tokenId: asset.tokenId || '',
            rarity,
            power,
            imageUrl: asset.imageUrl || '',
            name: asset.name || `Card #${asset.tokenId}`,
            attributes
          });
        }
      });

      console.log(`📄 Página ${page}: ${assets.length} NFTs | 🔥 ${burnedInPage} burned (total: ${allBurnedCards.length})`);

      page++;
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('\n❌ Erro no método alternativo:', error.message);
      break;
    }
  }

  saveResults(allBurnedCards);
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

fetchAllNFTs().catch(console.error);
