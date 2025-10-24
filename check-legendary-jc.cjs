const { Network, Alchemy } = require('alchemy-sdk');

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'vJle-j7BWq1w84N7KY4YNQDk8sFKVEYi',
  network: Network.BASE_MAINNET,
};

const alchemy = new Alchemy(settings);

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const CONTRACT_ADDRESS = '0x29f9673bbcbab3dece542fc78f4f3b5b61c5a15a';

async function checkLegendaryCards() {
  console.log('🔍 Checking LEGENDARY cards in JC wallet...\n');
  console.log('Wallet:', JC_WALLET);
  console.log('Contract:', CONTRACT_ADDRESS, '\n');

  try {
    const response = await alchemy.nft.getNftsForOwner(JC_WALLET, {
      contractAddresses: [CONTRACT_ADDRESS],
    });

    const legendaryCards = [];
    let totalPower = 0;

    for (const nft of response.ownedNfts) {
      const tokenId = nft.tokenId;
      const attributes = nft.raw?.metadata?.attributes || [];

      // Get rarity
      const rarityAttr = attributes.find(
        (attr) => attr.trait_type === 'Rarity' || attr.trait_type === 'rarity'
      );
      const rarity = rarityAttr?.value || 'Unknown';

      // Get power
      const powerAttr = attributes.find(
        (attr) => attr.trait_type === 'Power' || attr.trait_type === 'power'
      );
      const power = powerAttr?.value ? parseInt(powerAttr.value) : 0;

      // Filter LEGENDARY
      if (rarity.toLowerCase() === 'legendary' || rarity.toLowerCase() === 'lendária') {
        const name = nft.raw?.metadata?.name || `Token #${tokenId}`;
        legendaryCards.push({
          tokenId,
          name,
          power,
          rarity,
          image: nft.raw?.metadata?.image || ''
        });
        totalPower += power;
      }
    }

    // Sort by power descending
    legendaryCards.sort((a, b) => b.power - a.power);

    console.log(`\n✨ LEGENDARY CARDS FOUND: ${legendaryCards.length}\n`);
    console.log('═══════════════════════════════════════════════════════════');

    legendaryCards.forEach((card, index) => {
      console.log(`${index + 1}. Token #${card.tokenId}`);
      console.log(`   Name: ${card.name}`);
      console.log(`   Power: ${card.power}`);
      console.log(`   Rarity: ${card.rarity}`);
      console.log('───────────────────────────────────────────────────────────');
    });

    if (legendaryCards.length >= 5) {
      const top5 = legendaryCards.slice(0, 5);
      const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
      console.log(`\n🟣 IMPOSSIBLE MODE - Top 5 Legendaries:`);
      console.log(`   Total Power: ${top5Power}`);
      console.log(`   Cards: ${top5.map(c => `#${c.tokenId} (${c.power})`).join(', ')}`);
    } else if (legendaryCards.length > 0) {
      console.log(`\n⚠️  Only ${legendaryCards.length} legendary card(s) found`);
      console.log(`   Total Power: ${totalPower}`);
      console.log(`   Mode will fill remaining slots with strongest cards`);
    } else {
      console.log(`\n❌ No legendary cards found in wallet`);
      console.log(`   IMPOSSIBLE mode will use top 5 strongest cards instead`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLegendaryCards();
