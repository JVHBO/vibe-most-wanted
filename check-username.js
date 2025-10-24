import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function checkUsername() {
  console.log('🔍 Verificando username "Ted Binion" no Firebase...\n');

  // Tentar diferentes variações
  const variations = [
    'Ted Binion',
    'ted binion',
    'Ted%20Binion',
    'ted%20binion'
  ];

  for (const username of variations) {
    console.log(`Tentando: "${username}"`);
    const snapshot = await get(ref(database, `usernames/${username.toLowerCase()}`));

    if (snapshot.exists()) {
      const address = snapshot.val();
      console.log(`✅ ENCONTRADO! Username "${username}" -> Address: ${address}`);

      // Pega o perfil
      const profileSnapshot = await get(ref(database, `profiles/${address.toLowerCase()}`));
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val();
        console.log(`📋 Perfil:`, JSON.stringify(profile, null, 2));
      }
    } else {
      console.log(`❌ Não encontrado`);
    }
    console.log();
  }

  // Lista TODOS os usernames
  console.log('\n📝 Listando TODOS os usernames cadastrados:\n');
  const allUsernamesSnapshot = await get(ref(database, 'usernames'));
  if (allUsernamesSnapshot.exists()) {
    const usernames = allUsernamesSnapshot.val();
    Object.entries(usernames).forEach(([username, address]) => {
      console.log(`   "${username}" -> ${address}`);
    });
  } else {
    console.log('   Nenhum username encontrado');
  }
}

checkUsername()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });
