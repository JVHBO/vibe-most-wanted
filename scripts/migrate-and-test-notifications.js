/**
 * Script to:
 * 1. Migrate notification tokens from Firebase to Convex
 * 2. Send test notification to all users
 *
 * Run with: node scripts/migrate-and-test-notifications.js
 */

const admin = require('firebase-admin');
const { ConvexHttpClient } = require('convex/browser');

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://vibe-most-wanted-default-rtdb.firebaseio.com',
    });
  } else {
    // Fallback: use application default credentials
    admin.initializeApp({
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://vibe-most-wanted-default-rtdb.firebaseio.com',
    });
  }
}

const database = admin.database();

// Initialize Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || 'https://scintillating-crane-430.convex.cloud');

async function migrateTokens() {
  console.log('📦 Starting migration of notification tokens...\n');

  try {
    // 1. Get all tokens from Firebase
    console.log('🔍 Fetching tokens from Firebase...');
    const snapshot = await database.ref('notificationTokens').once('value');
    const firebaseTokens = snapshot.val();

    if (!firebaseTokens) {
      console.log('⚠️  No tokens found in Firebase');
      return [];
    }

    // Convert Firebase object to array
    const tokensArray = Object.entries(firebaseTokens).map(([fid, data]) => ({
      fid,
      token: data.token,
      url: data.url,
      createdAt: data.updatedAt || Date.now(),
    }));

    console.log(`✅ Found ${tokensArray.length} tokens in Firebase\n`);

    // 2. Import to Convex
    console.log('📥 Importing tokens to Convex...');
    const result = await convex.mutation('notifications:importTokens', {
      tokens: tokensArray,
    });

    console.log(`✅ Migration complete!`);
    console.log(`   - Imported: ${result.imported}`);
    console.log(`   - Updated: ${result.updated}\n`);

    return tokensArray;

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

async function sendTestNotification(token, url, fid) {
  try {
    const payload = {
      notificationId: `test_${fid}_${Date.now()}`,
      title: '🎮 Vibe Most Wanted',
      body: 'Notifications are working! Ready to play?',
      tokens: [token],
      targetUrl: 'https://vibe-most-wanted.vercel.app',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.log(`   ❌ Failed for FID ${fid}: ${response.statusText}`);
      return false;
    }

    const result = await response.json();

    if (result.invalidTokens?.includes(token)) {
      console.log(`   🗑️  Invalid token for FID ${fid}`);
      return false;
    }

    if (result.rateLimitedTokens?.includes(token)) {
      console.log(`   ⏱️  Rate limited for FID ${fid}`);
      return false;
    }

    console.log(`   ✅ Sent to FID ${fid}`);
    return true;

  } catch (error) {
    console.log(`   ❌ Error for FID ${fid}:`, error.message);
    return false;
  }
}

async function sendTestToAll() {
  console.log('📢 Sending test notifications...\n');

  try {
    // Get all tokens from Convex
    const tokens = await convex.query('notifications:getAllTokens');

    if (!tokens || tokens.length === 0) {
      console.log('⚠️  No tokens found in Convex');
      return;
    }

    console.log(`📱 Found ${tokens.length} users with notifications enabled\n`);

    let sent = 0;
    let failed = 0;

    // Send to each user with a small delay to avoid rate limits
    for (const tokenData of tokens) {
      await sendTestNotification(tokenData.token, tokenData.url, tokenData.fid);
      sent++;

      // Wait 100ms between notifications to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Total tokens: ${tokens.length}`);
    console.log(`   📤 Attempted: ${sent}`);
    console.log(`\n🎉 Test notifications sent!`);

  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting notification migration and test\n');
    console.log('=' .repeat(60));
    console.log('\n');

    // Step 1: Migrate tokens
    await migrateTokens();

    // Step 2: Send test notifications
    await sendTestToAll();

    console.log('\n');
    console.log('=' .repeat(60));
    console.log('✅ All done!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
