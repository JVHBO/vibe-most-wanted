// Script para deletar perfil duplicado
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, remove } = require('firebase/database');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function findAndDeleteDuplicate() {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  try {
    // Busca todos os perfis
    const profilesRef = ref(database, 'profiles');
    const snapshot = await get(profilesRef);

    if (!snapshot.exists()) {
      console.log('Nenhum perfil encontrado');
      return;
    }

    const profiles = snapshot.val();

    // Procura por username "0xjoonx"
    console.log('🔍 Procurando perfis com username "0xjoonx"...\n');

    const joonxProfiles = [];

    for (const [address, profile] of Object.entries(profiles)) {
      if (profile.username && profile.username.toLowerCase() === '0xjoonx') {
        joonxProfiles.push({ address, profile });
        console.log(`Encontrado: ${profile.username}`);
        console.log(`  Address: ${address}`);
        console.log(`  Total Power: ${profile.stats?.totalPower || 0}`);
        console.log(`  Total Cards: ${profile.stats?.totalCards || 0}`);
        console.log(`  Created: ${new Date(profile.createdAt).toLocaleString()}`);
        console.log('');
      }
    }

    if (joonxProfiles.length === 0) {
      console.log('Nenhum perfil encontrado com username "0xjoonx"');
      return;
    }

    if (joonxProfiles.length === 1) {
      console.log('Apenas um perfil encontrado, não há duplicata');
      return;
    }

    // Ordena por totalPower e pega o que tem 0 power (duplicado vazio)
    joonxProfiles.sort((a, b) => {
      const powerA = a.profile.stats?.totalPower || 0;
      const powerB = b.profile.stats?.totalPower || 0;
      return powerA - powerB; // Menor power primeiro (0)
    });

    const toDelete = joonxProfiles[0]; // O que tem 0 power
    const toKeep = joonxProfiles[1]; // O que tem cards

    console.log('📊 Análise:');
    console.log(`Manter: ${toKeep.address} (${toKeep.profile.stats?.totalPower || 0} power)`);
    console.log(`Deletar: ${toDelete.address} (${toDelete.profile.stats?.totalPower || 0} power)\n`);

    // Deleta o perfil vazio
    console.log(`🗑️  Deletando perfil duplicado: ${toDelete.address}...`);
    await remove(ref(database, `profiles/${toDelete.address}`));
    console.log('✅ Perfil deletado!');

    // Nota: não deletamos o username mapping porque o perfil correto ainda usa
    console.log('✅ Username mapping mantido para o perfil correto');

    console.log('\n✨ Duplicata removida com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  process.exit(0);
}

findAndDeleteDuplicate();
