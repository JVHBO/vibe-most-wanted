// Script para atualizar estatísticas de todos os perfis
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');
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

// Calculate card power
function calcPower(nft) {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';
  let base = 1;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 350;
  else if (r.includes('legend')) base = 150;
  else if (r.includes('epic')) base = 60;
  else if (r.includes('rare')) base = 15;
  else if (r.includes('uncommon')) base = 8;
  else base = 1;
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.4;
  else if (w.includes('mint')) wearMult = 1.2;
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;
  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
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

// Enrich NFT metadata by fetching from tokenUri (like main page does)
async function enrichMetadata(nfts) {
  const METADATA_BATCH_SIZE = 50;
  const enrichedRaw = [];

  for (let i = 0; i < nfts.length; i += METADATA_BATCH_SIZE) {
    const batch = nfts.slice(i, i + METADATA_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (nft) => {
        const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
        if (!tokenUri) return nft;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(tokenUri, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = await res.json();
            // Merge fresh metadata
            return { ...nft, raw: { ...nft.raw, metadata: json } };
          }
        } catch {}
        return nft;
      })
    );
    enrichedRaw.push(...batchResults);
  }

  return enrichedRaw;
}

async function updateAllProfiles() {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  try {
    console.log('📊 Buscando todos os perfis...\n');

    // Busca todos os perfis
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) {
      console.log('❌ Nenhum perfil encontrado');
      return;
    }

    const profiles = snapshot.val();
    const addresses = Object.keys(profiles);

    console.log(`✅ Encontrados ${addresses.length} perfis\n`);
    console.log('🔄 Atualizando estatísticas...\n');

    let updated = 0;
    let failed = 0;

    for (const address of addresses) {
      try {
        const profile = profiles[address];
        console.log(`\n📍 Processando: ${profile.username} (${address.slice(0, 6)}...${address.slice(-4)})`);

        // Busca NFTs do usuário
        const rawNfts = await fetchNFTs(address);
        console.log(`   📦 NFTs encontrados: ${rawNfts.length}`);

        // Enrich metadata from tokenUri (fresh data!)
        console.log(`   🔄 Buscando metadata fresca...`);
        const nfts = await enrichMetadata(rawNfts);
        console.log(`   ✅ Metadata atualizada`);

        if (nfts.length === 0) {
          console.log(`   ⚠️  Nenhum NFT, pulando...`);
          continue;
        }

        // Calcula estatísticas
        const revealedNfts = nfts.filter(nft => !isUnrevealed(nft));
        const openedCards = revealedNfts.length;
        const unopenedCards = nfts.filter(nft => isUnrevealed(nft)).length;
        const totalPower = revealedNfts.reduce((sum, nft) => sum + calcPower(nft), 0); // Apenas cartas reveladas dão power!
        const totalCards = nfts.length;

        console.log(`   🃏 Opened: ${openedCards}`);
        console.log(`   📦 Unopened: ${unopenedCards}`);
        console.log(`   💪 Total Power: ${totalPower}`);

        // Atualiza no Firebase
        await update(ref(database, `profiles/${address}/stats`), {
          totalCards,
          openedCards,
          unopenedCards,
          totalPower
        });

        console.log(`   ✅ Atualizado!`);
        updated++;

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Erro: ${error.message}`);
        failed++;
      }
    }

    console.log('\n\n═══════════════════════════════════════');
    console.log('✨ Atualização concluída!');
    console.log(`   ✅ Atualizados: ${updated}`);
    console.log(`   ❌ Falhas: ${failed}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
  }

  process.exit(0);
}

updateAllProfiles();
