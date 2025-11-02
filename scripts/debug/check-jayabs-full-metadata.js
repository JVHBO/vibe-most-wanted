const fetch = require('node-fetch');

const ALCHEMY_KEY = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const CONTRACT = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728';
const JAYABS_ADDRESS = '0xa12fcb2e0ee6c6e4930edf254a9fa5a17636b67d';

async function checkFullMetadata() {
  // Get one specific NFT with FULL metadata and refreshMetadata
  const tokenId = '6256'; // One from the defense deck that should be revealed

  const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getNFTMetadata?contractAddress=${CONTRACT}&tokenId=${tokenId}&refreshCache=true`;

  const res = await fetch(url);
  const data = await res.json();

  console.log('=== NFT #6256 Full Metadata ===\n');
  console.log('Name:', data.name);
  console.log('Token URI:', data.tokenUri);
  console.log('\nRaw Metadata:');
  console.log(JSON.stringify(data.raw?.metadata, null, 2));

  console.log('\n=== Attributes ===');
  data.raw?.metadata?.attributes?.forEach(attr => {
    console.log(`${attr.trait_type}: ${attr.value}`);
  });
}

checkFullMetadata().catch(console.error);
