/**
 * Simple reset script using Firebase client SDK
 *
 * Run with: node scripts/reset-all-simple.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update, remove } from 'firebase/database';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔧 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function resetAllPlayers() {
  try {
    console.log('\n📊 Fetching all profiles...');
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) {
      console.log('⚠️ No profiles found');
      process.exit(0);
    }

    const profiles = snapshot.val();
    const addresses = Object.keys(profiles);

    console.log(`📊 Found ${addresses.length} profiles to reset\n`);

    let resetCount = 0;
    let errorCount = 0;

    // Reset each profile
    for (const address of addresses) {
      try {
        const profile = profiles[address];
        const username = profile.username || 'Unknown';

        console.log(`🔄 Resetting ${username} (${address.slice(0, 10)}...)`);

        // Reset attacks
        await update(ref(database, `profiles/${address}`), {
          attacksToday: 0,
          lastAttackDate: null,
          rematchesToday: 0,
          lastRematchDate: null,
        });

        // Reset stats (keep totalCards, opened, power)
        await update(ref(database, `profiles/${address}/stats`), {
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0,
          attackWins: 0,
          attackLosses: 0,
          defenseWins: 0,
          defenseLosses: 0,
        });

        // Delete match history
        await remove(ref(database, `playerMatches/${address}`));

        // Verify defense deck preserved
        if (profile.defenseDeck && profile.defenseDeck.length === 5) {
          console.log(`  ✅ Defense deck preserved (${profile.defenseDeck.length} cards)`);
        }

        resetCount++;

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully reset: ${resetCount} profiles`);
    console.log(`❌ Errors: ${errorCount} profiles`);
    console.log('\nWhat was reset:');
    console.log('  - Attacks → 0');
    console.log('  - All wins/losses → 0');
    console.log('  - Match history → deleted');
    console.log('\nWhat was kept:');
    console.log('  ✅ Defense decks');
    console.log('  ✅ Usernames');
    console.log('  ✅ Total cards/power');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Confirmation
console.log('\n⚠️  WARNING: MASS RESET ⚠️');
console.log('This will reset ALL players!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n');

setTimeout(() => {
  console.log('Starting in 3...');
  setTimeout(() => {
    console.log('Starting in 2...');
    setTimeout(() => {
      console.log('Starting in 1...\n');
      setTimeout(() => {
        resetAllPlayers();
      }, 1000);
    }, 1000);
  }, 1000);
}, 5000);
