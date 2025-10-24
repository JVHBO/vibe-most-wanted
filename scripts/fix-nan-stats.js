/**
 * Script para corrigir stats com valores NaN/undefined no Firebase
 *
 * Executa: node scripts/fix-nan-stats.js
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');

require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function fixNaNStats() {
  console.log('🔧 Starting NaN stats fix...\n');

  try {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    // Get all profiles
    console.log('📊 Fetching all profiles...');
    const profilesRef = ref(database, 'profiles');
    const profilesSnapshot = await get(profilesRef);

    if (!profilesSnapshot.exists()) {
      console.log('ℹ️  No profiles found');
      process.exit(0);
    }

    const profiles = profilesSnapshot.val();
    const addresses = Object.keys(profiles);
    console.log(`Found ${addresses.length} profiles\n`);

    let fixedCount = 0;

    for (const addr of addresses) {
      const profile = profiles[addr];
      const stats = profile.stats || {};

      // Check if any stat is NaN, undefined, or null
      const needsFix =
        stats.pveWins == null || isNaN(stats.pveWins) ||
        stats.pveLosses == null || isNaN(stats.pveLosses) ||
        stats.pvpWins == null || isNaN(stats.pvpWins) ||
        stats.pvpLosses == null || isNaN(stats.pvpLosses) ||
        stats.attackWins == null || isNaN(stats.attackWins) ||
        stats.attackLosses == null || isNaN(stats.attackLosses) ||
        stats.defenseWins == null || isNaN(stats.defenseWins) ||
        stats.defenseLosses == null || isNaN(stats.defenseLosses) ||
        stats.totalCards == null || isNaN(stats.totalCards) ||
        stats.openedCards == null || isNaN(stats.openedCards) ||
        stats.unopenedCards == null || isNaN(stats.unopenedCards) ||
        stats.totalPower == null || isNaN(stats.totalPower);

      if (needsFix) {
        const username = profile.username || addr.slice(0, 8);
        console.log(`🔧 Fixing stats for ${username}...`);

        // Fix all stats - preserve existing values if they're valid, otherwise set to 0
        const fixedStats = {
          pveWins: (stats.pveWins != null && !isNaN(stats.pveWins)) ? stats.pveWins : 0,
          pveLosses: (stats.pveLosses != null && !isNaN(stats.pveLosses)) ? stats.pveLosses : 0,
          pvpWins: (stats.pvpWins != null && !isNaN(stats.pvpWins)) ? stats.pvpWins : 0,
          pvpLosses: (stats.pvpLosses != null && !isNaN(stats.pvpLosses)) ? stats.pvpLosses : 0,
          attackWins: (stats.attackWins != null && !isNaN(stats.attackWins)) ? stats.attackWins : 0,
          attackLosses: (stats.attackLosses != null && !isNaN(stats.attackLosses)) ? stats.attackLosses : 0,
          defenseWins: (stats.defenseWins != null && !isNaN(stats.defenseWins)) ? stats.defenseWins : 0,
          defenseLosses: (stats.defenseLosses != null && !isNaN(stats.defenseLosses)) ? stats.defenseLosses : 0,
          totalCards: (stats.totalCards != null && !isNaN(stats.totalCards)) ? stats.totalCards : 0,
          openedCards: (stats.openedCards != null && !isNaN(stats.openedCards)) ? stats.openedCards : 0,
          unopenedCards: (stats.unopenedCards != null && !isNaN(stats.unopenedCards)) ? stats.unopenedCards : 0,
          totalPower: (stats.totalPower != null && !isNaN(stats.totalPower)) ? stats.totalPower : 0,
        };

        await update(ref(database, `profiles/${addr}/stats`), fixedStats);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} profiles with NaN stats`);
    console.log(`ℹ️  ${addresses.length - fixedCount} profiles were already OK`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing stats:', error);
    process.exit(1);
  }
}

fixNaNStats();
