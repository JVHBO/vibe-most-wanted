const deck = require('./public/data/jc-deck.json');
const sorted = [...deck].sort((a,b) => (b.power || 0) - (a.power || 0));
const HAND_SIZE_CONST = 5;

console.log('🎮 ANÁLISE DE BALANCEAMENTO DE DIFICULDADES\n');
console.log('='.repeat(70));

// Current difficulties
const difficulties = {
  gey: { name: 'GEY', current: '~90', range: '15-21' },
  goofy: { name: 'GOOFY', current: '~275', range: '38-72' },
  gooner: { name: 'GOONER', current: '~525', range: '60-150' },
  gangster: { name: 'GANGSTER', current: '750', range: '150 only' },
  gigachad: { name: 'GIGACHAD', current: '840', range: 'top 5' }
};

console.log('\n📊 DISTRIBUIÇÃO DE POWER ATUAL:\n');
Object.entries(difficulties).forEach(([key, diff]) => {
  console.log(`${diff.name.padEnd(12)} ${diff.current.padEnd(10)} (${diff.range})`);
});

console.log('\n💡 PROPOSTA DE NERF:\n');

// GEY: Apenas as mais fracas (15 power only)
const geyCards = sorted.filter(c => c.power === 15);
const geyDeck = geyCards.slice(0, HAND_SIZE_CONST);
const geyTotal = geyDeck.reduce((sum, c) => sum + c.power, 0);
console.log(`GEY:       ${geyTotal} PWR (15 power apenas) - NERF de ~90 para ${geyTotal}`);

// GOOFY: Mix 15-21 (commons sem foil ou com foil fraco)
const goofyCards = sorted.filter(c => c.power >= 15 && c.power <= 21);
const goofyDeck = goofyCards.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
const goofyTotal = goofyDeck.reduce((sum, c) => sum + c.power, 0);
console.log(`GOOFY:     ~${Math.round(goofyTotal)} PWR (15-21 power) - NERF de ~275 para ~${Math.round(goofyTotal)}`);

// GOONER: Epics básicos (60-72)
const goonerCards = sorted.filter(c => c.power >= 60 && c.power <= 72);
const goonerDeck = goonerCards.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE_CONST);
const goonerTotal = goonerDeck.reduce((sum, c) => sum + c.power, 0);
console.log(`GOONER:    ~${Math.round(goonerTotal)} PWR (60-72 power epics) - NERF de ~525 para ~${Math.round(goonerTotal)}`);

// GANGSTER: 150 only (já está ok)
console.log(`GANGSTER:  750 PWR (150x5) - SEM MUDANÇA`);

// GIGACHAD: Top 5 (já está ok)
console.log(`GIGACHAD:  840 PWR (top 5) - SEM MUDANÇA`);

console.log('\n📈 PROGRESSÃO PROPOSTA:');
console.log(`  GEY      → GOOFY:    ${Math.round((goofyTotal/geyTotal - 1) * 100)}% mais forte`);
console.log(`  GOOFY    → GOONER:   ${Math.round((goonerTotal/goofyTotal - 1) * 100)}% mais forte`);
console.log(`  GOONER   → GANGSTER: ${Math.round((750/goonerTotal - 1) * 100)}% mais forte`);
console.log(`  GANGSTER → GIGACHAD: ${Math.round((840/750 - 1) * 100)}% mais forte`);

console.log('\n='.repeat(70));
