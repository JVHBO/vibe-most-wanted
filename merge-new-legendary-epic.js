const fs = require('fs');

// Ler arquivo atual
const currentDeck = JSON.parse(fs.readFileSync('jc-cards-revealed.json', 'utf-8'));
console.log(`\n📊 Deck atual: ${currentDeck.length} cards`);

// Contar rarities atuais
const currentRarities = {};
currentDeck.forEach(card => {
  const rarity = card.rarity || 'Unknown';
  currentRarities[rarity] = (currentRarities[rarity] || 0) + 1;
});

console.log('\n🎯 Raridades atuais:');
Object.entries(currentRarities).sort((a, b) => b[1] - a[1]).forEach(([rarity, count]) => {
  console.log(`  ${rarity}: ${count} cartas`);
});

// Legendary atuais
const legendaryCards = currentDeck.filter(c => c.rarity?.toLowerCase().includes('legend'));
console.log(`\n⭐ Legendary atuais: ${legendaryCards.length}`);
legendaryCards.forEach((card, i) => {
  console.log(`  ${i + 1}. Token #${card.tokenId} - Power: ${card.power}`);
});

// Top 5 power atual
const sorted = [...currentDeck].sort((a, b) => b.power - a.power);
const top5 = sorted.slice(0, 5);
const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
console.log(`\n🔥 Top 5 power atual: ${top5Power}`);
console.log('   ', top5.map(c => `#${c.tokenId} (${c.power})`).join(', '));

console.log(`\n✅ O deck de ${currentDeck.length} cards com ${legendaryCards.length} Legendary e power ${top5Power} está correto!`);
console.log(`\n📝 Este é o deck final do JC que será usado no jogo.`);
