# Segurança do Firebase - Vibe Most Wanted

## ⚠️ IMPORTANTE: Segurança em Produção

Atualmente, o Firebase está configurado em **modo de desenvolvimento** com regras abertas (`".read": true, ".write": true`). Isso é aceitável para desenvolvimento e testes, mas **NUNCA deve ser usado em produção**.

## Problema com Wallet Authentication

O Firebase Realtime Database requer autenticação Firebase (via `auth.uid`) para regras de segurança robustas. Como este projeto usa Web3 wallets (sem Firebase Auth), temos as seguintes opções:

---

## Opção 1: Firebase Auth com Custom Claims (Recomendado)

### Como funciona:
1. User conecta wallet
2. Backend gera custom token do Firebase usando a wallet address
3. User autentica no Firebase com o custom token
4. `auth.uid` = wallet address
5. Regras do Firebase validam ownership

### Implementação:

#### 1. Instale Firebase Admin SDK (backend):
```bash
npm install firebase-admin
```

#### 2. Crie `/app/api/auth/firebase/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { recoverMessageAddress } from 'viem';

// Inicializa Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json();

    // Verifica signature
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Cria custom token
    const customToken = await admin.auth().createCustomToken(address.toLowerCase());

    return NextResponse.json({ token: customToken });
  } catch (error) {
    console.error('Error creating custom token:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
```

#### 3. Atualizar Frontend (app/page.tsx):
```typescript
import { signInWithCustomToken, getAuth } from 'firebase/auth';

// Após conectar wallet:
async function authenticateWithFirebase(address: string) {
  // Gera mensagem e assina
  const message = `Sign in to Vibe Most Wanted\nWallet: ${address}\nTime: ${Date.now()}`;
  const signature = await walletClient.signMessage({ message });

  // Chama backend para gerar token
  const response = await fetch('/api/auth/firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, message }),
  });

  const { token } = await response.json();

  // Autentica no Firebase
  const auth = getAuth();
  await signInWithCustomToken(auth, token);
}
```

#### 4. Aplicar Regras Seguras (`FIREBASE_RULES.json`):
```json
{
  "rules": {
    "profiles": {
      "$address": {
        ".read": true,
        ".write": "$address === auth.uid"
      }
    },
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "
          auth != null && (
            newData.child('host/address').val() === auth.uid ||
            data.child('host/address').val() === auth.uid ||
            newData.child('guest/address').val() === auth.uid ||
            data.child('guest/address').val() === auth.uid
          )
        "
      }
    }
  }
}
```

---

## Opção 2: Backend Middleware com Admin SDK

### Como funciona:
1. Frontend nunca acessa Firebase diretamente
2. Todas operações passam por API Routes
3. Backend valida signatures e usa Admin SDK
4. Firebase mantém regras `.write: false` para o client

### Implementação:

#### 1. Criar API Routes para cada operação:
```typescript
// /app/api/profile/create/route.ts
export async function POST(request: NextRequest) {
  const { address, username, signature, message } = await request.json();

  // Valida signature
  if (!await verifySignature(address, signature, message)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Usa Admin SDK
  const db = admin.database();
  await db.ref(`profiles/${address}`).set({
    address,
    username,
    createdAt: Date.now(),
    // ...
  });

  return NextResponse.json({ success: true });
}
```

#### 2. Regras do Firebase:
```json
{
  "rules": {
    ".read": true,
    ".write": false  // Apenas Admin SDK pode escrever
  }
}
```

---

## Opção 3: Regras Básicas (Menos Seguro)

Se você aceita os riscos, pode usar regras de validação de estrutura:

```json
{
  "rules": {
    "profiles": {
      "$address": {
        ".read": true,
        ".write": "newData.child('address').val() === $address",
        ".validate": "newData.hasChildren(['address', 'username', 'createdAt'])",
        "username": {
          ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 20"
        }
      }
    }
  }
}
```

**Problema**: Qualquer pessoa pode escrever em qualquer endereço se souber a estrutura dos dados.

---

## Recomendação Final

Para **produção**, implemente a **Opção 1** (Firebase Auth com Custom Claims). É a solução mais segura e escalável.

Para **desenvolvimento/teste**, mantenha as regras abertas mas com validação de estrutura.

---

## Configuração das Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Para Opção 1 ou 2 (Backend)
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Obtenha as credenciais em:
Firebase Console → Project Settings → Service Accounts → Generate New Private Key
