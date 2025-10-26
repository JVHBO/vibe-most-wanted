/**
 * Script para resetar ataques, wins, losses e histórico de TODOS os jogadores
 *
 * O QUE SERÁ RESETADO:
 * - attacksToday → 0
 * - lastAttackDate → null
 * - All stats (wins/losses) → 0
 * - Match history (playerMatches) → deleted
 *
 * O QUE SERÁ MANTIDO:
 * - Defense Decks ✅
 * - Username ✅
 * - Twitter ✅
 * - Address ✅
 * - Created/Updated dates ✅
 * - Total cards count ✅
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to load service account from file
    const serviceAccount = require('../vibe-most-wanted-firebase-adminsdk.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://vibe-most-wanted-default-rtdb.firebaseio.com'
    });
    console.log('✅ Firebase initialized with service account');
  } catch (error) {
    // Fallback: Use environment variable or application default credentials
    console.log('⚠️ Service account file not found, using environment credentials');

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://vibe-most-wanted-default-rtdb.firebaseio.com'
      });
    } else {
      admin.initializeApp({
        databaseURL: 'https://vibe-most-wanted-default-rtdb.firebaseio.com'
      });
    }
    console.log('✅ Firebase initialized with fallback credentials');
  }
}

const db = admin.database();

async function backupData() {
  console.log('📦 Creating backup before reset...');

  try {
    // Backup profiles
    const profilesSnapshot = await db.ref('profiles').once('value');
    const profiles = profilesSnapshot.val();

    // Backup match history
    const matchesSnapshot = await db.ref('playerMatches').once('value');
    const matches = matchesSnapshot.val();

    const backup = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      profiles,
      playerMatches: matches
    };

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup saved to: ${backupFile}`);
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
}

async function resetAllPlayers() {
  try {
    // 1. Create backup first
    const backupSuccess = await backupData();
    if (!backupSuccess) {
      console.log('❌ Backup failed. Aborting reset for safety.');
      return;
    }

    console.log('\n🔄 Starting reset process...\n');

    // 2. Get all profiles
    const profilesSnapshot = await db.ref('profiles').once('value');
    const profiles = profilesSnapshot.val();

    if (!profiles) {
      console.log('⚠️ No profiles found.');
      return;
    }

    const addresses = Object.keys(profiles);
    console.log(`📊 Found ${addresses.length} profiles to reset`);

    let resetCount = 0;
    let errorCount = 0;

    // 3. Reset each profile
    for (const address of addresses) {
      try {
        const profile = profiles[address];
        const username = profile.username || 'Unknown';

        console.log(`\n🔄 Resetting ${username} (${address.slice(0, 8)}...)`);

        // Reset attacks
        await db.ref(`profiles/${address}`).update({
          attacksToday: 0,
          lastAttackDate: null,
          rematchesToday: 0,
          lastRematchDate: null,
        });
        console.log('  ✅ Attacks reset');

        // Reset stats (keep totalCards, openedCards, unopenedCards, totalPower)
        await db.ref(`profiles/${address}/stats`).update({
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0,
          attackWins: 0,
          attackLosses: 0,
          defenseWins: 0,
          defenseLosses: 0,
        });
        console.log('  ✅ Stats reset (kept card counts and power)');

        // Delete match history for this player
        await db.ref(`playerMatches/${address}`).remove();
        console.log('  ✅ Match history deleted');

        // Verify defense deck is still there
        const defenseDeck = profile.defenseDeck;
        if (defenseDeck && Array.isArray(defenseDeck) && defenseDeck.length === 5) {
          console.log(`  ✅ Defense deck preserved (${defenseDeck.length} cards)`);
        } else {
          console.log(`  ⚠️ No defense deck or invalid`);
        }

        resetCount++;

      } catch (error) {
        console.error(`  ❌ Error resetting ${address}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully reset: ${resetCount} profiles`);
    console.log(`❌ Errors: ${errorCount} profiles`);
    console.log('\n📊 What was reset:');
    console.log('  - Attacks today → 0');
    console.log('  - All wins/losses → 0');
    console.log('  - Match history → deleted');
    console.log('\n✅ What was kept:');
    console.log('  - Defense decks');
    console.log('  - Usernames');
    console.log('  - Twitter handles');
    console.log('  - Total cards/power');
    console.log('  - Profile data');
    console.log('\n💾 Backup location: ./backups/');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: MASS RESET OPERATION ⚠️');
console.log('');
console.log('This will reset ALL players:');
console.log('  - Attacks → 0');
console.log('  - Wins/Losses → 0');
console.log('  - Match History → deleted');
console.log('');
console.log('✅ Defense decks, usernames, and cards WILL BE KEPT');
console.log('💾 A backup will be created first');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');

setTimeout(() => {
  console.log('\n🚀 Starting reset in 3...');
  setTimeout(() => {
    console.log('🚀 Starting reset in 2...');
    setTimeout(() => {
      console.log('🚀 Starting reset in 1...');
      setTimeout(() => {
        console.log('');
        resetAllPlayers();
      }, 1000);
    }, 1000);
  }, 1000);
}, 5000);
