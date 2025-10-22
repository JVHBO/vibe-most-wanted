# Configuração do Firebase para PvP

## Passo 1: Criar Projeto no Firebase

1. Acesse https://console.firebase.google.com/
2. Clique em "Add project" (Adicionar projeto)
3. Nome do projeto: `vibe-most-wanted` (ou qualquer nome)
4. Desabilite Google Analytics (opcional)
5. Clique em "Create project"

## Passo 2: Ativar Realtime Database

1. No menu lateral, clique em "Realtime Database"
2. Clique em "Create Database"
3. Selecione o location mais próximo (ex: `us-central1`)
4. Escolha "Start in **test mode**" (importante!)
5. Clique em "Enable"

## Passo 3: Configurar Regras de Segurança

1. Na aba "Rules", substitua por:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "matchmaking": {
      "$playerId": {
        ".read": true,
        ".write": true
      }
    },
    "profiles": {
      "$address": {
        ".read": true,
        ".write": true
      }
    },
    "usernames": {
      "$username": {
        ".read": true,
        ".write": true
      }
    },
    "matches": {
      "$matchId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

2. Clique em "Publish"

## Passo 4: Obter Credenciais

1. Clique no ícone de engrenagem ⚙️ ao lado de "Project Overview"
2. Selecione "Project settings"
3. Role para baixo até "Your apps"
4. Clique no ícone `</>` (Web)
5. Registre o app com nickname: `vibe-tcg-web`
6. **NÃO** marque "Firebase Hosting"
7. Clique em "Register app"

## Passo 5: Copiar Configuração

Você verá algo como:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABC123...",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Passo 6: Atualizar .env.local

Copie os valores para o arquivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyABC123...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Passo 7: Reiniciar o Servidor

```bash
npm run dev
```

Pronto! O sistema PvP está configurado! 🎮
