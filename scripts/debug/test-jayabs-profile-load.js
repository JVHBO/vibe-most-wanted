const fetch = require('node-fetch');

const ALCHEMY_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CONTRACT = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728';
const JAYABS_ADDRESS = '0xa12fcb2e0ee6c6e4930edf254a9fa5a17636b67d';

// Helper to find attribute
function findAttr(nft, trait) {
  const locs = [
    nft?.raw?.metadata?.attributes,
    nft?.metadata?.attributes,
    nft?.metadata?.traits,
    nft?.raw?.metadata?.traits
  ];
  for (const attrs of locs) {
    if (Array.isArray(attrs)) {
      const found = attrs.find((a) => a.trait_type?.toLowerCase() === trait.toLowerCase());
      if (found?.value) return String(found.value);
    }
  }
  return '';
}

// Check if unrevealed (same logic as page.tsx)
function isUnrevealed(nft) {
  const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);

  if (!hasAttrs) return true;

  const n = String(nft?.name || '').toLowerCase();

  // ✅ IMPROVED: Check if card has revealed attributes (Wear, Character, Power) BEFORE checking Rarity
  const wear = findAttr(nft, 'wear');
  const character = findAttr(nft, 'character');
  const power = findAttr(nft, 'power');
  const actualRarity = findAttr(nft, 'rarity');

  // If card has Wear/Character/Power attributes, it's definitely revealed
  if (wear || character || power) {
    console.log(`  ✅ Card #${nft.tokenId} has revealing attrs: wear="${wear}", char="${character}", power="${power}"`);
    return false;
  }

  // Check if it has a real rarity (Common, Rare, Epic, Legendary)
  const r = (actualRarity || '').toLowerCase();
  if (r && r !== 'unopened' && (r.includes('common') || r.includes('rare') || r.includes('epic') || r.includes('legendary'))) {
    console.log(`  ✅ Card #${nft.tokenId} has real rarity: "${actualRarity}"`);
    return false;
  }

  const s = (findAttr(nft, 'status') || '').toLowerCase();

  // Only mark as unopened if explicitly stated
  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    console.log(`  ❌ Card #${nft.tokenId} marked as UNOPENED: rarity="${actualRarity}", status="${s}", name="${n}"`);
    return true;
  }

  const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
  const hasRarity = r !== '';

  const result = !(hasImage || hasRarity);
  console.log(`  ⚠️ Card #${nft.tokenId} fallback check: hasImage=${hasImage}, hasRarity=${hasRarity}, unopened=${result}`);
  return result;
}

async function testProfileLoad() {
  console.log('=== Simulating Profile Page Load for jayabs ===\n');

  // Step 1: Fetch NFTs from Alchemy (same as nft-fetcher.ts fetchRawNFTs)
  const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getNFTsForOwner?owner=${JAYABS_ADDRESS}&contractAddresses[]=${CONTRACT}&withMetadata=true&pageSize=100`;

  console.log('📡 Fetching NFTs from Alchemy...\n');
  const res = await fetch(url);
  const json = await res.json();
  const nfts = json.ownedNfts || [];

  console.log(`✅ Fetched ${nfts.length} NFTs\n`);

  // Step 2: Refresh metadata from tokenUri (same as nft-fetcher.ts refreshMetadata)
  console.log('🔄 Refreshing metadata from tokenUri for first 5 NFTs...\n');

  for (let i = 0; i < Math.min(5, nfts.length); i++) {
    const nft = nfts[i];
    const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;

    console.log(`\nCard #${nft.tokenId}:`);
    console.log(`  Token URI: ${tokenUri}`);

    if (tokenUri) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(tokenUri, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const metadata = await res.json();
          // Merge fresh metadata (same as line 241 in nft-fetcher.ts)
          nft.raw = { ...nft.raw, metadata };
          console.log(`  ✅ Metadata refreshed`);
          console.log(`  Attributes:`, metadata.attributes?.map(a => `${a.trait_type}=${a.value}`).join(', '));
        }
      } catch (error) {
        console.log(`  ⚠️ Failed to refresh:`, error.message);
      }
    }

    // Step 3: Check if unrevealed
    const unopened = isUnrevealed(nft);
    console.log(`  Final result: ${unopened ? '❌ UNOPENED' : '✅ REVEALED'}`);
  }
}

testProfileLoad().catch(console.error);
