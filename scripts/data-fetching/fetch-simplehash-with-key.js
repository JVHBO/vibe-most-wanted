const fetch = require('node-fetch');
const fs = require('fs');

// COLOQUE SUA API KEY DO SIMPLEHASH AQUI:
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY || '';

const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const CHAIN = 'base';

console.log('🔍 Buscando NFTs via SimpleHash API');
console.log('   Contract:', CONTRACT_ADDRESS);
console.log('   Chain:', CHAIN);

if (!SIMPLEHASH_API_KEY) {
  console.error('\n❌ ERRO: SIMPLEHASH_API_KEY não definida!');
  console.log('\n📝 Configure a API key de uma destas formas:');
  console.log('   1. Variável de ambiente: set SIMPLEHASH_API_KEY=sua_key_aqui');
  console.log('   2. Edite o arquivo e cole a key na linha 5');
  process.exit(1);
}

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

async function fetchFromSimpleHash() {
  let allBurnedCards = [];
  let cursor = null;
  let pageCount = 0;
  const limit = 50; // Max 50 per page

  console.log('\n📡 Iniciando busca...\n');

  while (pageCount < 200) { // Max 200 páginas = 10,000 NFTs
    pageCount++;

    let url = `https://api.simplehash.com/api/v0/nfts/${CHAIN}/${CONTRACT_ADDRESS}?limit=${limit}`;

    if (cursor) {
      url += `&cursor=${cursor}`;
    }

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': SIMPLEHASH_API_KEY
        }
      });

      if (!res.ok) {
        console.error(`\n❌ API falhou: ${res.status}`);
        const text = await res.text();
        console.error('Response:', text.substring(0, 500));
        break;
      }

      const json = await res.json();
      const nfts = json.nfts || [];

      let burnedInPage = 0;

      nfts.forEach(nft => {
        const attributes = nft.extra_metadata?.attributes || [];

        // Check status
        const status = findAttr(attributes, 'status');
        const isBurned = status?.toLowerCase() === 'burned';

        // Check rarity
        const rarity = findAttr(attributes, 'rarity') || '';
        const validRarity = ['common', 'rare', 'epic', 'legendary'].includes(rarity.toLowerCase());

        if (isBurned && validRarity) {
          burnedInPage++;

          const power = calcPower(attributes);
          const tokenId = nft.token_id || '';
          const imageUrl = nft.image_url || nft.previews?.image_medium_url || '';
          const name = nft.name || `Card #${tokenId}`;

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

      console.log(`📄 Página ${pageCount}: ${nfts.length} NFTs | 🔥 ${burnedInPage} burned (total: ${allBurnedCards.length})`);

      // Check next cursor
      cursor = json.next_cursor || json.next;
      if (!cursor || nfts.length === 0) {
        console.log('\n✅ Todas as páginas foram processadas!');
        break;
      }

      // Wait to avoid rate limits (SimpleHash free tier: 3 req/sec)
      await new Promise(resolve => setTimeout(resolve, 400));

    } catch (error) {
      console.error('\n❌ Erro:', error.message);
      break;
    }
  }

  console.log(`\n📊 Total de NFTs BURNED com rarity válida: ${allBurnedCards.length}`);

  if (allBurnedCards.length === 0) {
    console.log('\n⚠️ Nenhuma carta burned encontrada!');
    console.log('Isso pode significar:');
    console.log('  - As NFTs não têm o atributo "Status: Burned"');
    console.log('  - O contrato não está indexado no SimpleHash');
    console.log('  - A API key está incorreta');
    return [];
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

  return allBurnedCards;
}

fetchFromSimpleHash().catch(console.error);
