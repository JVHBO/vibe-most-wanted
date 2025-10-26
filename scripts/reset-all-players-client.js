/**
 * CLIENT-SIDE RESET SCRIPT
 *
 * Execute este script no CONSOLE DO NAVEGADOR (F12 → Console)
 * quando estiver logado no seu app em https://vibe-most-wanted.vercel.app
 *
 * ATENÇÃO: Este script reseta TODOS os jogadores!
 */

async function resetAllPlayers() {
  console.log('⚠️  MASS RESET STARTING...');
  console.log('');

  try {
    // Get Firebase instance from window
    const { database, ref, get, update, remove } = window.firebaseExports || {};

    if (!database || !ref || !get) {
      console.error('❌ Firebase not available. Make sure you are on vibe-most-wanted.vercel.app');
      return;
    }

    // 1. Get all profiles
    console.log('📊 Fetching all profiles...');
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) {
      console.log('⚠️ No profiles found');
      return;
    }

    const profiles = snapshot.val();
    const addresses = Object.keys(profiles);

    console.log(`📊 Found ${addresses.length} profiles`);
    console.log('');

    let resetCount = 0;
    let errorCount = 0;

    // 2. Reset each profile
    for (const address of addresses) {
      try {
        const profile = profiles[address];
        const username = profile.username || 'Unknown';

        console.log(`🔄 Resetting ${username}...`);

        // Reset attacks
        await update(ref(database, `profiles/${address}`), {
          attacksToday: 0,
          lastAttackDate: null,
          rematchesToday: 0,
          lastRematchDate: null,
        });

        // Reset stats
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

        console.log(`  ✅ ${username} reset complete`);
        resetCount++;

      } catch (error) {
        console.error(`  ❌ Error resetting ${address}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully reset: ${resetCount} profiles`);
    console.log(`❌ Errors: ${errorCount} profiles`);
    console.log('');
    console.log('What was reset:');
    console.log('  - Attacks → 0');
    console.log('  - Wins/Losses → 0');
    console.log('  - Match history → deleted');
    console.log('');
    console.log('What was kept:');
    console.log('  ✅ Defense decks');
    console.log('  ✅ Usernames');
    console.log('  ✅ Cards & Power');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Execute with confirmation
console.log('⚠️⚠️⚠️ MASS RESET SCRIPT LOADED ⚠️⚠️⚠️');
console.log('');
console.log('This will reset ALL players:');
console.log('  - Attacks → 0');
console.log('  - Wins/Losses → 0');
console.log('  - Match History → deleted');
console.log('');
console.log('✅ Defense decks and usernames WILL BE KEPT');
console.log('');
console.log('To proceed, type: resetAllPlayers()');
console.log('To cancel, just close this tab');
