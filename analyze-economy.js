const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

const client = new ConvexHttpClient("https://scintillating-crane-430.convex.cloud");

async function analyzeEconomy() {
  console.log('=== 📊 VIBE MOST WANTED - ECONOMY ANALYTICS ===\n');

  // Get leaderboard (all players)
  const profiles = await client.query(api.profiles.getLeaderboard, { limit: 1000 });

  // Statistics
  const totalPlayers = profiles.length;
  const coinsData = profiles.map(p => p.coins || 0).filter(c => c > 0);
  const totalCoins = coinsData.reduce((sum, c) => sum + c, 0);
  const avgCoins = totalCoins / totalPlayers;
  const medianCoins = coinsData.sort((a, b) => a - b)[Math.floor(coinsData.length / 2)] || 0;
  const maxCoins = Math.max(...coinsData);
  const minCoins = Math.min(...coinsData.filter(c => c > 0));

  console.log('📈 OVERALL STATS');
  console.log('─'.repeat(50));
  console.log(`Total Players: ${totalPlayers}`);
  console.log(`Total Coins in Circulation: ${totalCoins.toLocaleString()} $TESTVBMS`);
  console.log(`Average Coins per Player: ${avgCoins.toFixed(2)} $TESTVBMS`);
  console.log(`Median Coins: ${medianCoins} $TESTVBMS`);
  console.log(`Max Coins: ${maxCoins} $TESTVBMS`);
  console.log(`Min Coins (active): ${minCoins} $TESTVBMS\n`);

  // Distribution by brackets
  console.log('💰 COIN DISTRIBUTION');
  console.log('─'.repeat(50));
  const brackets = [
    { min: 0, max: 50, label: '0-50' },
    { min: 51, max: 100, label: '51-100' },
    { min: 101, max: 200, label: '101-200' },
    { min: 201, max: 300, label: '201-300' },
    { min: 301, max: 400, label: '301-400' },
    { min: 401, max: 500, label: '401-500' },
    { min: 501, max: Infinity, label: '501+' },
  ];

  for (const bracket of brackets) {
    const count = profiles.filter(p => {
      const coins = p.coins || 0;
      return coins >= bracket.min && coins <= bracket.max;
    }).length;
    const percentage = ((count / totalPlayers) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`${bracket.label.padEnd(12)} | ${bar} ${percentage}% (${count} players)`);
  }

  // Top 10 richest players
  console.log('\n💎 TOP 10 RICHEST PLAYERS');
  console.log('─'.repeat(50));
  const richest = [...profiles].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 10);
  richest.forEach((p, i) => {
    const username = (p.username || 'Unknown').padEnd(20);
    const coins = String(p.coins || 0).padStart(6);
    const power = String(p.stats?.totalPower || 0).padStart(6);
    console.log(`${(i + 1).toString().padStart(2)}. ${username} | ${coins} coins | ${power} PWR`);
  });

  // Lifetime earnings
  console.log('\n🏆 TOP 10 LIFETIME EARNERS');
  console.log('─'.repeat(50));
  const earners = [...profiles]
    .filter(p => p.lifetimeEarned > 0)
    .sort((a, b) => (b.lifetimeEarned || 0) - (a.lifetimeEarned || 0))
    .slice(0, 10);
  earners.forEach((p, i) => {
    const username = (p.username || 'Unknown').padEnd(20);
    const earned = String(p.lifetimeEarned || 0).padStart(6);
    const spent = String(p.lifetimeSpent || 0).padStart(6);
    const balance = String(p.coins || 0).padStart(6);
    console.log(`${(i + 1).toString().padStart(2)}. ${username} | Earned: ${earned} | Spent: ${spent} | Balance: ${balance}`);
  });

  // Activity analysis
  console.log('\n🎮 PLAYER ACTIVITY (Today)');
  console.log('─'.repeat(50));
  const today = new Date().toISOString().split('T')[0];
  const activePlayers = profiles.filter(p => p.dailyLimits?.lastResetDate === today);
  const pveWins = profiles.reduce((sum, p) => sum + (p.dailyLimits?.pveWins || 0), 0);
  const pvpMatches = profiles.reduce((sum, p) => sum + (p.dailyLimits?.pvpMatches || 0), 0);

  console.log(`Active Today: ${activePlayers.length}/${totalPlayers} players`);
  console.log(`Total PvE Wins Today: ${pveWins}`);
  console.log(`Total PvP Matches Today: ${pvpMatches}`);

  // Economic health indicators
  console.log('\n🏥 ECONOMIC HEALTH');
  console.log('─'.repeat(50));
  const playersWithCoins = profiles.filter(p => (p.coins || 0) > 0).length;
  const richPlayers = profiles.filter(p => (p.coins || 0) >= 300).length;
  const poorPlayers = profiles.filter(p => (p.coins || 0) <= 100).length;
  const giniCoefficient = calculateGini(coinsData);

  console.log(`Players with Coins: ${playersWithCoins}/${totalPlayers} (${((playersWithCoins/totalPlayers)*100).toFixed(1)}%)`);
  console.log(`Rich Players (≥300): ${richPlayers} (${((richPlayers/totalPlayers)*100).toFixed(1)}%)`);
  console.log(`Poor Players (≤100): ${poorPlayers} (${((poorPlayers/totalPlayers)*100).toFixed(1)}%)`);
  console.log(`Gini Coefficient: ${giniCoefficient.toFixed(3)} (0=perfect equality, 1=perfect inequality)`);

  // Recommendations
  console.log('\n💡 ECONOMIC RECOMMENDATIONS');
  console.log('─'.repeat(50));
  if (giniCoefficient > 0.4) {
    console.log('⚠️ High inequality detected - Consider implementing:');
    console.log('   - Weekly leaderboard rewards');
    console.log('   - Bonus for defeating higher-ranked opponents');
    console.log('   - Catch-up mechanics for new players');
  }
  if (totalCoins > 50000) {
    console.log('⚠️ High coin inflation - Consider:');
    console.log('   - Adding coin sinks (marketplace, cosmetics)');
    console.log('   - Reducing daily cap');
  }
  if (avgCoins < 200) {
    console.log('✅ Healthy average balance');
  }
  if (activePlayers.length / totalPlayers < 0.5) {
    console.log('⚠️ Low daily activity - Consider increasing rewards');
  }

  console.log('\n=== END OF REPORT ===\n');
}

// Calculate Gini coefficient (income inequality measure)
function calculateGini(values) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, v) => sum + v, 0);

  if (total === 0) return 0;

  let sumOfAbsoluteDifferences = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfAbsoluteDifferences += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumOfAbsoluteDifferences / (2 * n * total);
}

analyzeEconomy().catch(console.error);
