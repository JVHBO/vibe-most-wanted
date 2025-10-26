/**
 * 📦 EXPORT FIREBASE DATA
 *
 * Exporta TODOS os dados do Firebase Realtime Database para JSON
 * SEM PERDER NADA!
 *
 * Usage: node scripts/export-firebase-data.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('📦 FIREBASE DATA EXPORT');
console.log('='.repeat(60));
console.log('');

async function exportData() {
  try {
    // Initialize Firebase
    console.log('🔧 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    const backup = {
      exportDate: new Date().toISOString(),
      exportTimestamp: Date.now(),
      data: {}
    };

    // Export Profiles
    console.log('\n📊 Exporting profiles...');
    const profilesRef = ref(database, 'profiles');
    const profilesSnapshot = await get(profilesRef);

    if (profilesSnapshot.exists()) {
      backup.data.profiles = profilesSnapshot.val();
      const count = Object.keys(backup.data.profiles).length;
      console.log(`   ✅ ${count} profiles exported`);
    } else {
      backup.data.profiles = {};
      console.log('   ⚠️  No profiles found');
    }

    // Export Usernames
    console.log('\n👤 Exporting usernames...');
    const usernamesRef = ref(database, 'usernames');
    const usernamesSnapshot = await get(usernamesRef);

    if (usernamesSnapshot.exists()) {
      backup.data.usernames = usernamesSnapshot.val();
      const count = Object.keys(backup.data.usernames).length;
      console.log(`   ✅ ${count} usernames exported`);
    } else {
      backup.data.usernames = {};
      console.log('   ⚠️  No usernames found');
    }

    // Export Player Matches
    console.log('\n⚔️  Exporting player matches...');
    const matchesRef = ref(database, 'playerMatches');
    const matchesSnapshot = await get(matchesRef);

    if (matchesSnapshot.exists()) {
      backup.data.playerMatches = matchesSnapshot.val();
      let totalMatches = 0;
      Object.keys(backup.data.playerMatches).forEach(address => {
        totalMatches += Object.keys(backup.data.playerMatches[address]).length;
      });
      console.log(`   ✅ ${totalMatches} matches exported`);
    } else {
      backup.data.playerMatches = {};
      console.log('   ⚠️  No matches found');
    }

    // Export Rooms (PvP)
    console.log('\n🚪 Exporting rooms...');
    const roomsRef = ref(database, 'rooms');
    const roomsSnapshot = await get(roomsRef);

    if (roomsSnapshot.exists()) {
      backup.data.rooms = roomsSnapshot.val();
      const count = Object.keys(backup.data.rooms).length;
      console.log(`   ✅ ${count} rooms exported`);
    } else {
      backup.data.rooms = {};
      console.log('   ⚠️  No rooms found');
    }

    // Export Matchmaking
    console.log('\n🔍 Exporting matchmaking...');
    const matchmakingRef = ref(database, 'matchmaking');
    const matchmakingSnapshot = await get(matchmakingRef);

    if (matchmakingSnapshot.exists()) {
      backup.data.matchmaking = matchmakingSnapshot.val();
      const count = Object.keys(backup.data.matchmaking).length;
      console.log(`   ✅ ${count} matchmaking entries exported`);
    } else {
      backup.data.matchmaking = {};
      console.log('   ⚠️  No matchmaking entries found');
    }

    // Export Notification Tokens
    console.log('\n🔔 Exporting notification tokens...');
    const tokensRef = ref(database, 'notificationTokens');
    const tokensSnapshot = await get(tokensRef);

    if (tokensSnapshot.exists()) {
      backup.data.notificationTokens = tokensSnapshot.val();
      const count = Object.keys(backup.data.notificationTokens).length;
      console.log(`   ✅ ${count} notification tokens exported`);
    } else {
      backup.data.notificationTokens = {};
      console.log('   ⚠️  No notification tokens found');
    }

    // Save to file
    console.log('\n💾 Saving backup...');
    const backupDir = join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `firebase-backup-${Date.now()}.json`;
    const filepath = join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ EXPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📄 File: ${filename}`);
    console.log(`📂 Location: ${filepath}`);
    console.log(`💾 Size: ${fileSize} KB`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Profiles: ${Object.keys(backup.data.profiles).length}`);
    console.log(`   - Usernames: ${Object.keys(backup.data.usernames).length}`);
    console.log(`   - Player Matches: ${Object.keys(backup.data.playerMatches).length} players`);
    console.log(`   - Rooms: ${Object.keys(backup.data.rooms).length}`);
    console.log(`   - Matchmaking: ${Object.keys(backup.data.matchmaking).length}`);
    console.log(`   - Notification Tokens: ${Object.keys(backup.data.notificationTokens).length}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Keep this backup safe!');
    console.log('   2. Set up Supabase (see PLANO-MIGRACAO-DATABASE.md)');
    console.log('   3. Run import script to migrate data');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

exportData();
