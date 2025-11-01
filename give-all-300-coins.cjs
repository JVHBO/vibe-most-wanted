const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = "https://scintillating-crane-430.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

async function giveAllPlayers300Coins() {
  console.log('🚀 Starting to give 300 coins to all players...\n');

  try {
    // Get all profiles
    const profiles = await convex.query("profiles:getLeaderboard", { limit: 1000 });

    console.log(`📊 Found ${profiles.length} players\n`);

    for (const profile of profiles) {
      try {
        const currentCoins = profile.coins || 0;
        const newCoins = currentCoins + 300;

        await convex.mutation("economy:addCoins", {
          address: profile.address,
          amount: 300,
          reason: "Welcome gift - PvP fix compensation"
        });

        console.log(`✅ ${profile.username}: ${currentCoins} → ${newCoins} (+300)`);
      } catch (error) {
        console.error(`❌ Failed for ${profile.username}:`, error.message);
      }
    }

    console.log('\n🎉 Done! All players received 300 coins!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

giveAllPlayers300Coins();
