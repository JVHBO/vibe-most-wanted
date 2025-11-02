/**
 * Script to normalize usernames to lowercase
 * Run with: node normalize-usernames-script.js
 */

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

// Use production URL
const CONVEX_URL = "https://scintillating-crane-430.convex.cloud";

async function normalizeUsernames() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🔄 Fetching all profiles...");
  const profiles = await client.query(api.profiles.getLeaderboard, { limit: 1000 });

  console.log(`📊 Found ${profiles.length} profiles`);

  const needsNormalization = [];

  for (const profile of profiles) {
    const originalUsername = profile.username;
    const normalizedUsername = originalUsername.toLowerCase();

    if (originalUsername !== normalizedUsername) {
      needsNormalization.push({
        address: profile.address,
        original: originalUsername,
        normalized: normalizedUsername
      });
    }
  }

  console.log(`\n🔍 Profiles needing normalization: ${needsNormalization.length}`);

  if (needsNormalization.length === 0) {
    console.log("✅ All usernames already normalized!");
    return;
  }

  console.log("\n📝 Usernames to normalize:");
  needsNormalization.forEach(({ original, normalized, address }) => {
    console.log(`   ${original} → ${normalized} (${address.slice(0, 10)}...)`);
  });

  console.log("\n⚠️  MANUAL ACTION REQUIRED:");
  console.log("   Run these commands to fix each username:\n");

  for (const { address, normalized } of needsNormalization) {
    console.log(`npx convex run profiles:upsertProfile '${JSON.stringify({
      address,
      username: normalized,
    })}'`);
  }

  client.close();
}

normalizeUsernames().catch(console.error);
