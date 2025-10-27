/**
 * Simple script to migrate 5 notification tokens from Firebase to Convex
 * Run with: node scripts/migrate-tokens-simple.js
 */

require('dotenv').config({ path: '.env.local' });

const { ConvexHttpClient } = require('convex/browser');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

// Firebase config (from .env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Initialize Convex
const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || 'https://scintillating-crane-430.convex.cloud'
);

async function migrateTokens() {
  console.log('📦 Migrating notification tokens...\n');

  try {
    // Get tokens from Firebase
    console.log('🔍 Fetching from Firebase...');
    const snapshot = await get(ref(database, 'notificationTokens'));

    if (!snapshot.exists()) {
      console.log('⚠️  No tokens found');
      return;
    }

    const firebaseTokens = snapshot.val();
    const tokensArray = Object.entries(firebaseTokens).map(([fid, data]) => ({
      fid,
      token: data.token,
      url: data.url,
      createdAt: data.updatedAt || Date.now(),
    }));

    console.log(`✅ Found ${tokensArray.length} tokens\n`);

    // Import to Convex
    console.log('📥 Importing to Convex...');
    const result = await convex.mutation('notifications:importTokens', {
      tokens: tokensArray,
    });

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Imported: ${result.imported}`);
    console.log(`   - Updated: ${result.updated}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

migrateTokens();
