import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

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

function findAttr(nft, traitType) {
  const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
  const found = attrs.find(a => a.trait_type?.toLowerCase() === traitType.toLowerCase());
  return found?.value || '';
}

function isUnrevealed(nft) {
  const name = nft?.name || nft?.raw?.metadata?.name || '';
  const desc = nft?.description || nft?.raw?.metadata?.description || '';
  return name.toLowerCase().includes('unrevealed') || desc.toLowerCase().includes('unrevealed');
}

function getImage(nft) {
  const rawImage = nft?.image?.thumbnailUrl || nft?.image?.cachedUrl || nft?.image?.originalUrl;
  if (rawImage) return rawImage;

  const metaImage = nft?.raw?.metadata?.image || nft?.metadata?.image;
  if (!metaImage) return '';

  if (metaImage.startsWith('ipfs://')) {
    const hash = metaImage.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }

  return metaImage;
}

async function main() {
  console.log('🔍 Buscando NFTs da wallet do JC...\n');
  console.log('Wallet:', JC_WALLET);
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('Chain:', CHAIN, '\n');

  const raw = await fetchNFTs(JC_WALLET);
  console.log('📦 Total de NFTs encontrados:', raw.length, '\n');

  // Filter unrevealed
  const revealed = raw.filter(nft => !isUnrevealed(nft));
  console.log('✅ NFTs revelados:', revealed.length, '\n');

  // Show first 10 token IDs to see format
  console.log('🔢 Primeiros 10 token IDs:');
  revealed.slice(0, 10).forEach(nft => {
    console.log(`   - ${nft.tokenId} (${nft.name || 'sem nome'})`);
  });
  console.log();

  // Process with existing metadata
  console.log('🖼️ Processando imagens e traits...\n');
  const processed = revealed.map(nft => ({
    tokenId: nft.tokenId,
    imageUrl: getImage(nft),
    rarity: findAttr(nft, 'rarity'),
    name: nft?.name || nft?.raw?.metadata?.name || `Token #${nft.tokenId}`,
  }));

  // Try to find token 7024 (try both formats)
  const token7024 = processed.find(nft => nft.tokenId === '7024' || nft.tokenId === '0x1b70' || parseInt(nft.tokenId, 16) === 7024);

  if (!token7024) {
    console.log('❌ Token 7024 não encontrado na wallet do JC!');
    console.log('   (Talvez o JC não possua esse token)\n');

    // Let's just analyze all rare cards instead
    console.log('📊 Analisando TODAS as cartas RARE no deck do JC:\n');
    const allRare = processed.filter(nft => nft.rarity?.toLowerCase() === 'rare');
    console.log(`   Total de cartas RARE: ${allRare.length}\n`);

    // Group by image
    const imageGroups = {};
    allRare.forEach(nft => {
      const img = nft.imageUrl || 'no-image';
      if (!imageGroups[img]) imageGroups[img] = [];
      imageGroups[img].push(nft);
    });

    console.log(`   Agrupadas por imagem: ${Object.keys(imageGroups).length} imagens únicas\n`);

    Object.entries(imageGroups).forEach(([img, cards], idx) => {
      if (cards.length > 1) {  // Only show duplicates
        console.log(`   Grupo ${idx + 1}: ${cards.length} cartas com a mesma imagem`);
        cards.forEach(card => {
          console.log(`      - Token #${card.tokenId} (${card.name})`);
        });
        console.log();
      }
    });

    return;
  }

  console.log('🎯 Token 7024 encontrado:');
  console.log('   Name:', token7024.name);
  console.log('   Rarity:', token7024.rarity);
  const imgPreview = token7024.imageUrl ? token7024.imageUrl.substring(0, 80) + '...' : 'sem imagem';
  console.log('   Image:', imgPreview, '\n');

  // Find all cards with same image
  const sameImage = processed.filter(nft => nft.imageUrl && token7024.imageUrl && nft.imageUrl === token7024.imageUrl);

  console.log(`🔍 Cartas com a mesma imagem do token 7024: ${sameImage.length}\n`);

  // Group by rarity
  const byRarity = {};
  sameImage.forEach(nft => {
    const rarity = nft.rarity || 'no-rarity';
    if (!byRarity[rarity]) byRarity[rarity] = [];
    byRarity[rarity].push(nft);
  });

  // Show all cards grouped by rarity
  console.log('📊 Agrupadas por raridade:\n');
  Object.entries(byRarity).forEach(([rarity, cards]) => {
    console.log(`   ${rarity.toUpperCase()}: ${cards.length} cartas`);
    cards.forEach(card => {
      console.log(`      - Token #${card.tokenId} (${card.name})`);
    });
    console.log();
  });

  // Show which will be filtered
  const toFilter = sameImage.filter(nft => nft.rarity?.toLowerCase() === 'rare');

  console.log('🚫 Cartas que serão FILTRADAS (mesma imagem + trait "rare"):\n');
  if (toFilter.length === 0) {
    console.log('   ✅ Nenhuma carta será filtrada!\n');
  } else {
    toFilter.forEach(card => {
      console.log(`   ❌ Token #${card.tokenId} - ${card.name} (RARE)`);
    });
    console.log();
  }

  console.log('📈 Resumo:');
  console.log(`   Total de NFTs no deck do JC: ${processed.length}`);
  console.log(`   Cartas com imagem do 7024: ${sameImage.length}`);
  console.log(`   Cartas RARE a filtrar: ${toFilter.length}`);
  console.log(`   Deck final do JC: ${processed.length - toFilter.length} cartas\n`);
}

main().catch(console.error);
