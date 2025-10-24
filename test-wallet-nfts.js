import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

async function main() {
  console.log('🔍 Checking wallet:', JC_WALLET);
  console.log('📡 Chain:', CHAIN);
  console.log('');

  // Fetch WITHOUT contract filter to see ALL NFTs
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${JC_WALLET}&withMetadata=true&pageSize=10`;

  console.log('Making API call...\n');

  const res = await fetch(url);
  if (!res.ok) {
    console.log('❌ API Error:', res.status, res.statusText);
    const errorText = await res.text();
    console.log('Error details:', errorText);
    return;
  }

  const json = await res.json();

  console.log('Response keys:', Object.keys(json));
  console.log('Total count:', json.totalCount);
  console.log('NFTs in this page:', json.ownedNfts?.length || 0);
  console.log('');

  if (json.ownedNfts && json.ownedNfts.length > 0) {
    console.log('✅ Found NFTs! First 5:\n');
    json.ownedNfts.slice(0, 5).forEach((nft, i) => {
      console.log(`${i + 1}. Contract: ${nft.contract?.address}`);
      console.log(`   Token ID: ${nft.tokenId}`);
      console.log(`   Name: ${nft.name || nft.raw?.metadata?.name || 'Unknown'}`);
      console.log('');
    });
  } else {
    console.log('❌ No NFTs found in this wallet!');
    console.log('');
    console.log('Possible issues:');
    console.log('- Wallet address might be incorrect');
    console.log('- Wallet might be empty on this chain');
    console.log('- API key might not have access');
  }
}

main().catch(console.error);
