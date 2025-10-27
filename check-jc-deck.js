const cards = require('./jc-cards-revealed.json');

console.log('📊 Análise do deck do JC:\n');
console.log('Total de cartas:', cards.length);

// Contar por raridade
const rarities = {};
cards.forEach(c => {
  rarities[c.rarity] = (rarities[c.rarity] || 0) + 1;
});

console.log('\n🎴 Cartas por raridade:');
Object.entries(rarities).forEach(([rarity, count]) => {
  console.log(`  ${rarity}: ${count} cartas`);
});

// Top 10 mais fortes
console.log('\n💪 Top 10 cartas mais fortes:');
const sorted = [...cards].sort((a, b) => b.power - a.power);
sorted.slice(0, 10).forEach((c, i) => {
  console.log(`  ${i + 1}. Token #${c.tokenId} - ${c.rarity} - Power: ${c.power}`);
});

// Legendary cards
const legendary = cards.filter(c => c.rarity === 'Legendary');
console.log(`\n⭐ Cartas Legendary: ${legendary.length} total`);
console.log('\nTodas as Legendary:');
legendary.sort((a, b) => b.power - a.power).forEach((c, i) => {
  console.log(`  ${i + 1}. Token #${c.tokenId} - Power: ${c.power}`);
});

// Calcular poder total das top 5
const top5 = sorted.slice(0, 5);
const top5Power = top5.reduce((sum, c) => sum + c.power, 0);
console.log(`\n🔥 Poder total das TOP 5: ${top5Power}`);
console.log('Top 5 são:', top5.map(c => `#${c.tokenId} (${c.rarity}, ${c.power})`).join(', '));
