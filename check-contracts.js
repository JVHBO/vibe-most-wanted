import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

const JC_WALLET = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const CONTRACT_1 = '0x29f9673bbcbab3dece542fc78f4f3b5b61c5a15a'; // Original
const CONTRACT_2 = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728'; // Descoberto

async function checkContract(wallet, contract, name) {
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${wallet}&contractAddresses[]=${contract}&withMetadata=true&pageSize=10`;

  const res = await fetch(url);
  if (!res.ok) {
    console.log(`❌ ${name} - API Error:`, res.status);
    return;
  }

  const json = await res.json();
  console.log(`\n${name}:`);
  console.log(`   Wallet: ${wallet}`);
  console.log(`   Contract: ${contract}`);
  console.log(`   Total NFTs: ${json.totalCount}`);
  console.log(`   NFTs nesta página: ${json.ownedNfts?.length || 0}`);

  if (json.ownedNfts && json.ownedNfts.length > 0) {
    const first = json.ownedNfts[0];
    console.log(`   Exemplo: #${first.tokenId} - ${first.name || first.raw?.metadata?.name || 'Unknown'}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VERIFICANDO CONTRATOS');
  console.log('═══════════════════════════════════════════════════════════');

  console.log('\n📊 WALLET DO JC:\n');
  await checkContract(JC_WALLET, CONTRACT_1, '🔷 Contrato Original (0x29f...)');
  await checkContract(JC_WALLET, CONTRACT_2, '🔶 Contrato Descoberto (0xF14...)');

  console.log('\n\n❓ Qual é a SUA wallet? (Cole o endereço)');
  console.log('   Ou me diga qual contrato estava funcionando antes!');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
