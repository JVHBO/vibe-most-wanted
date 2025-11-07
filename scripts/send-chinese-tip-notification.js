/**
 * Send tip notification about Chinese language bonus
 * Run with: node scripts/send-chinese-tip-notification.js
 */

const { ConvexHttpClient } = require('convex/browser');

// Initialize Convex (production)
const convex = new ConvexHttpClient('https://scintillating-crane-430.convex.cloud');

async function sendTipNotification() {
  console.log('💡 Sending Chinese language tip notification...\n');

  try {
    // Get all notification tokens from Convex
    console.log('🔍 Fetching notification tokens...');
    const tokens = await convex.query('notifications:getAllTokens');

    if (!tokens || tokens.length === 0) {
      console.log('⚠️  No notification tokens found');
      return;
    }

    console.log(`✅ Found ${tokens.length} tokens\n`);

    // Send notification to all users
    let successCount = 0;
    let failCount = 0;

    for (const tokenData of tokens) {
      try {
        const payload = {
          notificationId: `chinese_tip_${tokenData.fid}_${Date.now()}`,
          title: '💡 VIBE Most Wanted Tip',
          body: 'Did you know? Playing in Chinese (中文) gives you more coins AND changes the music! Try it now! 🎵',
          tokens: [tokenData.token],
          targetUrl: 'https://www.vibemostwanted.xyz',
        };

        const response = await fetch(tokenData.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.log(`   ❌ Failed for FID ${tokenData.fid}: ${response.statusText}`);
          failCount++;
          continue;
        }

        const result = await response.json();

        if (result.invalidTokens?.includes(tokenData.token)) {
          console.log(`   🗑️  Invalid token for FID ${tokenData.fid}`);
          failCount++;
          continue;
        }

        if (result.rateLimitedTokens?.includes(tokenData.token)) {
          console.log(`   ⏱️  Rate limited for FID ${tokenData.fid}`);
          failCount++;
          continue;
        }

        console.log(`   ✅ Sent to FID ${tokenData.fid}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`   ❌ Error sending to FID ${tokenData.fid}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📧 Total: ${tokens.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
sendTipNotification()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
