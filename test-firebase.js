// Teste rápido do Firebase
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyDLczdwnFDempReMc4FIVi7a6RbDVkHduY",
  authDomain: "vibe-most-wanted.firebaseapp.com",
  databaseURL: "https://vibe-most-wanted-default-rtdb.firebaseio.com",
  projectId: "vibe-most-wanted",
  storageBucket: "vibe-most-wanted.firebasestorage.app",
  messagingSenderId: "211235253869",
  appId: "1:211235253869:web:0fd32b492ede74cfdb5964"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function testCreateProfile() {
  try {
    console.log('🧪 Testando criar perfil no Firebase...\n');

    const testAddress = '0xTESTE123456789';
    const profileRef = ref(database, `profiles/${testAddress}`);

    // Tenta criar perfil igual ao código faz
    const profileData = {
      address: testAddress,
      username: 'testuserproducao',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      stats: {
        totalCards: 0,
        totalPower: 0,
        pveWins: 0,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0
      }
    };

    console.log('📝 Tentando salvar perfil...');
    await set(profileRef, profileData);
    console.log('✅ Perfil salvo com sucesso!');

    // Tenta ler de volta
    console.log('\n📖 Lendo perfil de volta...');
    const snapshot = await get(profileRef);

    if (snapshot.exists()) {
      console.log('✅ Perfil encontrado:', snapshot.val());
    } else {
      console.log('❌ Perfil não foi salvo');
    }

    // Testa username
    console.log('\n🔖 Testando reserva de username...');
    const usernameRef = ref(database, `usernames/${profileData.username.toLowerCase()}`);
    await set(usernameRef, testAddress);
    console.log('✅ Username reservado!');

    console.log('\n✅ TUDO FUNCIONANDO! Firebase está OK.');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Código:', error.code);

    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n🔥 PROBLEMA: Regras do Firebase estão bloqueando!');
      console.error('\n📋 SOLUÇÃO:');
      console.error('1. Acesse: https://console.firebase.google.com/project/vibe-most-wanted/database/vibe-most-wanted-default-rtdb/rules');
      console.error('2. Cole EXATAMENTE isso:');
      console.error(JSON.stringify({
        "rules": {
          ".read": true,
          ".write": true
        }
      }, null, 2));
      console.error('3. Clique em "Publish"');
      console.error('4. Aguarde 10-30 segundos');
      console.error('5. Rode este teste novamente: node test-firebase.js');
    }
  }

  process.exit(0);
}

testCreateProfile();
