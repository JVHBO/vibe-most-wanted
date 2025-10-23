// Script para debugar as cartas do 0xStk
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Helper to find attribute
function findAttr(nft, trait) {
  const locs = [nft?.raw?.metadata?.attributes, nft?.metadata?.attributes, nft?.metadata?.traits, nft?.raw?.metadata?.traits];
  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;
    const found = attrs.find((a) => {
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      return traitType === searchTrait || traitType.includes(searchTrait) || searchTrait.includes(traitType);
    });
    if (found) {
      return String(found?.value || found?.trait_value || found?.displayType || '').trim();
    }
  }
  return '';
}

// Check if card is unrevealed
function isUnrevealed(nft) {
  const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);

  if (!hasAttrs) return true;

  const r = (findAttr(nft, 'rarity') || '').toLowerCase();
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  const n = String(nft?.name || '').toLowerCase();

  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
  const hasRarity = r !== '';

  return !(hasImage || hasRarity);
}

// Fetch NFTs from Alchemy
async function fetchNFTs(owner) {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  if (!CONTRACT_ADDRESS) throw new Error("Contract address não configurado");

  let allNfts = [];
  let pageKey = undefined;
  let pageCount = 0;
  const maxPages = 20;

  do {
    pageCount++;
    const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();
    allNfts = allNfts.concat(json.ownedNfts || []);
    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

async function debugStkCards() {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  try {
    console.log('🔍 Buscando perfil do 0xStk...\n');

    // Busca o endereço do 0xStk
    const stkAddress = '0x28f4a9a2e747ec2cb1b4e235a55dff5be2ef48d6';

    console.log(`📍 Endereço: ${stkAddress}\n`);

    // Busca NFTs
    const nfts = await fetchNFTs(stkAddress);
    console.log(`📦 Total de NFTs: ${nfts.length}\n`);

    // Analisa cada NFT
    nfts.forEach((nft, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`NFT #${index + 1} - Token ID: ${nft.tokenId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Nome
      console.log(`📛 Name: ${nft.name || 'N/A'}`);

      // Imagens
      console.log(`\n🖼️  Images:`);
      console.log(`   cachedUrl: ${nft?.image?.cachedUrl || 'N/A'}`);
      console.log(`   originalUrl: ${nft?.image?.originalUrl || 'N/A'}`);
      console.log(`   metadata.image: ${nft?.metadata?.image || 'N/A'}`);
      console.log(`   raw.metadata.image: ${nft?.raw?.metadata?.image || 'N/A'}`);

      // Attributes
      console.log(`\n📊 Attributes:`);
      const attrLocs = [
        { name: 'raw.metadata.attributes', attrs: nft?.raw?.metadata?.attributes },
        { name: 'metadata.attributes', attrs: nft?.metadata?.attributes },
        { name: 'raw.metadata.traits', attrs: nft?.raw?.metadata?.traits },
        { name: 'metadata.traits', attrs: nft?.metadata?.traits }
      ];

      let foundAttrs = false;
      attrLocs.forEach(loc => {
        if (Array.isArray(loc.attrs) && loc.attrs.length > 0) {
          foundAttrs = true;
          console.log(`\n   Location: ${loc.name}`);
          loc.attrs.forEach(attr => {
            const traitType = attr?.trait_type || attr?.traitType || attr?.name || 'unknown';
            const value = attr?.value || attr?.trait_value || attr?.displayType || 'N/A';
            console.log(`     - ${traitType}: ${value}`);
          });
        }
      });

      if (!foundAttrs) {
        console.log(`   ❌ Nenhum attribute encontrado!`);
      }

      // Extracted traits usando findAttr
      console.log(`\n🔍 Extracted Traits (via findAttr):`);
      console.log(`   Rarity: "${findAttr(nft, 'rarity')}"`);
      console.log(`   Status: "${findAttr(nft, 'status')}"`);
      console.log(`   Foil: "${findAttr(nft, 'foil')}"`);
      console.log(`   Wear: "${findAttr(nft, 'wear')}"`);
      console.log(`   Power: "${findAttr(nft, 'power')}"`);

      // Análise isUnrevealed
      const unrevealed = isUnrevealed(nft);
      const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);
      const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
      const rarity = findAttr(nft, 'rarity');

      console.log(`\n🎯 isUnrevealed Analysis:`);
      console.log(`   Has attributes: ${hasAttrs}`);
      console.log(`   Has image: ${hasImage}`);
      console.log(`   Has rarity: ${rarity !== ''}`);
      console.log(`   ➜ Is Unrevealed: ${unrevealed ? '❌ YES (FECHADA)' : '✅ NO (ABERTA)'}`);
    });

    console.log('\n\n═══════════════════════════════════════');
    const revealed = nfts.filter(nft => !isUnrevealed(nft));
    const unrevealed = nfts.filter(nft => isUnrevealed(nft));
    console.log(`📊 Summary:`);
    console.log(`   Total: ${nfts.length}`);
    console.log(`   Opened (revealed): ${revealed.length}`);
    console.log(`   Unopened (unrevealed): ${unrevealed.length}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  process.exit(0);
}

debugStkCards();
