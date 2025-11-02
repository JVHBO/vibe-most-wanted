const fetch = require('node-fetch');
const fs = require('fs');

const CONTRACT_ADDRESS = '0x1cd2136250422ea29b98a78ec812a921c001fe7a';
const CHAIN = 'base'; // Reservoir usa "base" para Base mainnet

console.log('🔍 Testando Reservoir API para Base chain');
console.log('   Contract:', CONTRACT_ADDRESS);

function findAttr(attributes, trait) {
  const attr = attributes.find(a => a.key?.toLowerCase() === trait.toLowerCase());
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

async function fetchFromReservoir() {
  let allBurnedCards = [];
  let continuation = null;
  let pageCount = 0;
  const limit = 100;

  while (pageCount < 50) { // Max 50 páginas = 5000 tokens
    pageCount++;

    // Endpoint: GET /tokens/v7
    // Docs: https://docs.reservoir.tools/reference/gettokensv7
    let url = `https://api.reservoir.tools/tokens/v7?collection=${CONTRACT_ADDRESS}&limit=${limit}&includeAttributes=true&includeTopBid=false`;

    if (continuation) {
      url += `&continuation=${continuation}`;
    }

    console.log(`\n📡 Página ${pageCount}...`);

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        console.error(`❌ API falhou: ${res.status}`);
        const text = await res.text();
        console.error('Response:', text);
        break;
      }

      const json = await res.json();
      const tokens = json.tokens || [];

      console.log(`  ✓ ${tokens.length} tokens nesta página`);

      let burnedInPage = 0;

      tokens.forEach(token => {
        const attributes = token.token?.attributes || [];

        // Check status
        const status = findAttr(attributes, 'status');
        const isBurned = status?.toLowerCase() === 'burned';

        // Check rarity
        const rarity = findAttr(attributes, 'rarity') || '';
        const validRarity = ['common', 'rare', 'epic', 'legendary'].includes(rarity.toLowerCase());

        if (isBurned && validRarity) {
          burnedInPage++;

          const power = calcPower(attributes);
          const tokenId = token.token?.tokenId || '';
          const imageUrl = token.token?.image || token.token?.imageSmall || '';
          const name = token.token?.name || `Card #${tokenId}`;

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

      console.log(`  🔥 ${burnedInPage} burned + valid rarity (total: ${allBurnedCards.length})`);

      // Check continuation
      continuation = json.continuation;
      if (!continuation) {
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

  console.log(`\n📊 Total de NFTs BURNED com rarity válida: ${allBurnedCards.length}`);

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
  if (allBurnedCards.length > 0) {
    fs.writeFileSync('jc-cards-revealed.json', JSON.stringify(allBurnedCards, null, 2));
    console.log('\n✅ Salvo em: jc-cards-revealed.json');
  }

  return allBurnedCards;
}

fetchFromReservoir().catch(console.error);
