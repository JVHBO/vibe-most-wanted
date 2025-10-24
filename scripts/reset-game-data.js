/**
 * Script para resetar dados do jogo antes do lançamento
 *
 * O QUE ESTE SCRIPT FAZ:
 * 1. Limpa todo o histórico de batalhas (/playerMatches)
 * 2. Reseta contadores de wins/losses de todos os perfis
 * 3. Limpa ataques registrados (lastAttacks, attacksToday)
 *
 * IMPORTANTE: Mantém:
 * - Usernames e perfis
 * - Defense decks configurados
 * - Total power e cartas dos jogadores
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update, remove } = require('firebase/database');

// Carrega as variáveis de ambiente
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

async function resetGameData() {
  console.log('🧹 Starting game data reset...\n');

  try {
    // Inicializa Firebase
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    // 1. Limpa todo o histórico de batalhas
    console.log('📋 Step 1: Cleaning match history...');
    const matchHistoryRef = ref(database, 'playerMatches');
    const matchesSnapshot = await get(matchHistoryRef);

    if (matchesSnapshot.exists()) {
      const playersWithMatches = Object.keys(matchesSnapshot.val()).length;
      await remove(matchHistoryRef);
      console.log(`   ✅ Removed match history for ${playersWithMatches} players`);
    } else {
      console.log('   ℹ️  No match history found');
    }

    // 2. Reset stats de todos os perfis
    console.log('\n📊 Step 2: Resetting profile stats...');
    const profilesRef = ref(database, 'profiles');
    const profilesSnapshot = await get(profilesRef);

    if (profilesSnapshot.exists()) {
      const profiles = profilesSnapshot.val();
      const addresses = Object.keys(profiles);
      console.log(`   Found ${addresses.length} profiles to reset`);

      let resetCount = 0;
      for (const address of addresses) {
        const profile = profiles[address];

        // Reset apenas os contadores de batalha, mantém totalPower e cartas
        const statsUpdate = {
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0,
          attackWins: 0,
          attackLosses: 0,
          defenseWins: 0,
          defenseLosses: 0,
          // Mantém os valores originais
          totalCards: profile.stats?.totalCards || 0,
          openedCards: profile.stats?.openedCards || 0,
          unopenedCards: profile.stats?.unopenedCards || 0,
          totalPower: profile.stats?.totalPower || 0
        };

        await update(ref(database, `profiles/${address}/stats`), statsUpdate);

        // Limpa dados de ataque
        const attackUpdate = {
          attacksToday: 0,
          lastAttackDate: null
        };
        await update(ref(database, `profiles/${address}`), attackUpdate);

        resetCount++;
        if (resetCount % 10 === 0) {
          console.log(`   Progress: ${resetCount}/${addresses.length} profiles reset...`);
        }
      }

      console.log(`   ✅ Reset stats for ${resetCount} profiles`);
    } else {
      console.log('   ℹ️  No profiles found');
    }

    // 3. Limpa salas antigas e matchmaking
    console.log('\n🏠 Step 3: Cleaning rooms and matchmaking...');
    const roomsRef = ref(database, 'rooms');
    const roomsSnapshot = await get(roomsRef);

    if (roomsSnapshot.exists()) {
      await remove(roomsRef);
      console.log('   ✅ Removed all rooms');
    } else {
      console.log('   ℹ️  No rooms found');
    }

    const matchmakingRef = ref(database, 'matchmaking');
    const matchmakingSnapshot = await get(matchmakingRef);

    if (matchmakingSnapshot.exists()) {
      await remove(matchmakingRef);
      console.log('   ✅ Removed all matchmaking entries');
    } else {
      console.log('   ℹ️  No matchmaking entries found');
    }

    console.log('\n✅ Game data reset completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✓ Match history cleared');
    console.log('   ✓ Win/loss counters reset to 0');
    console.log('   ✓ Attack counters reset');
    console.log('   ✓ Rooms and matchmaking cleared');
    console.log('\n💾 Preserved:');
    console.log('   ✓ User profiles and usernames');
    console.log('   ✓ Defense decks');
    console.log('   ✓ Total power and card counts');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error resetting game data:', error);
    process.exit(1);
  }
}

// Confirmação antes de executar
console.log('⚠️  WARNING: This will reset all game data!');
console.log('This includes:');
console.log('  - All match history');
console.log('  - All win/loss counters');
console.log('  - All attack counters');
console.log('\nBut will preserve:');
console.log('  - User profiles and usernames');
console.log('  - Defense decks');
console.log('  - Total power and card counts');
console.log('\n');

// Verifica se foi passado o argumento --confirm
if (process.argv.includes('--confirm')) {
  resetGameData();
} else {
  console.log('To proceed, run:');
  console.log('  node scripts/reset-game-data.js --confirm');
  process.exit(0);
}
