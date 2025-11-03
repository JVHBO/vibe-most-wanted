const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const ALCHEMY_API_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CHAIN = 'base-mainnet';
const CONTRACT_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';

// 23 token IDs com placeholder URLs
const TOKEN_IDS_WITH_PLACEHOLDER = [
  '1866', '2347', '2435', '2486', '2761', '2927', '3067', '3202',
  '4378', '4664', '5225', '6070', '6071', '6183', '6452', '6465',
  '6521', '6729', '7160', '7431', '7700', '7948', '8549'
];

console.log('🔧 Fixing 23 placeholder image URLs in jc-deck.json\n');
console.log(`📋 Token IDs to fix: ${TOKEN_IDS_WITH_PLACEHOLDER.length}`);
console.log(`   ${TOKEN_IDS_WITH_PLACEHOLDER.join(', ')}\n`);

/**
 * Fetch NFT metadata from Alchemy API
 */
async function fetchNFTMetadata(tokenId) {
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?` +
    `contractAddress=${CONTRACT_ADDRESS}&` +
    `tokenId=${tokenId}&` +
    `refreshCache=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ❌ HTTP ${res.status} for token ${tokenId}`);
      return null;
    }

    const data = await res.json();

    if (data.error || !data.image) {
      console.error(`  ❌ No image data for token ${tokenId}`);
      return null;
    }

    // Try to get best quality image URL
    const imageUrl = data.image.cachedUrl ||
                     data.image.originalUrl ||
                     data.image.thumbnailUrl ||
                     data.image.pngUrl ||
                     null;

    if (!imageUrl) {
      console.error(`  ❌ No valid image URL for token ${tokenId}`);
      return null;
    }

    console.log(`  ✅ Token ${tokenId}: ${imageUrl.substring(0, 60)}...`);
    return imageUrl;
  } catch (error) {
    console.error(`  ❌ Error fetching token ${tokenId}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  // Read jc-deck.json
  const deckPath = path.join(process.cwd(), 'public', 'data', 'jc-deck.json');

  console.log('📖 Reading jc-deck.json...');
  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'));
  console.log(`   Found ${deck.length} cards in deck\n`);

  // Find cards with placeholders
  const cardsToFix = deck.filter(card =>
    card.imageUrl && card.imageUrl.includes('hash-placeholder')
  );

  console.log(`🔍 Found ${cardsToFix.length} cards with placeholder URLs\n`);

  if (cardsToFix.length === 0) {
    console.log('✨ No placeholders found! All cards have real URLs.');
    return;
  }

  // Fetch real URLs
  console.log('🌐 Fetching real image URLs from Alchemy API...\n');

  const updates = {};

  for (const card of cardsToFix) {
    const tokenId = card.tokenId;
    console.log(`🔎 Fetching token #${tokenId}...`);

    const imageUrl = await fetchNFTMetadata(tokenId);

    if (imageUrl) {
      updates[tokenId] = imageUrl;
    }

    // Rate limiting: wait 300ms between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n✅ Successfully fetched ${Object.keys(updates).length}/${cardsToFix.length} image URLs\n`);

  // Update deck
  console.log('📝 Updating jc-deck.json...');

  let updatedCount = 0;
  deck.forEach(card => {
    if (updates[card.tokenId]) {
      card.imageUrl = updates[card.tokenId];
      updatedCount++;
    }
  });

  console.log(`   Updated ${updatedCount} cards\n`);

  // Save backup
  const backupPath = path.join(process.cwd(), 'public', 'data', 'jc-deck.backup.json');
  console.log('💾 Creating backup at jc-deck.backup.json...');
  fs.writeFileSync(backupPath, JSON.stringify(deck, null, 2));

  // Save updated deck
  console.log('💾 Saving updated jc-deck.json...');
  fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));

  console.log('\n✨ Done! Fixed placeholder URLs.\n');

  // Show failed tokens (if any)
  const failedTokens = cardsToFix
    .filter(card => !updates[card.tokenId])
    .map(card => card.tokenId);

  if (failedTokens.length > 0) {
    console.log(`⚠️  Failed to fetch ${failedTokens.length} tokens:`);
    console.log(`   ${failedTokens.join(', ')}\n`);
  }

  // Summary
  console.log('📊 Summary:');
  console.log(`   ✅ Fixed: ${updatedCount}`);
  console.log(`   ❌ Failed: ${failedTokens.length}`);
  console.log(`   📦 Total cards in deck: ${deck.length}\n`);
}

main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
