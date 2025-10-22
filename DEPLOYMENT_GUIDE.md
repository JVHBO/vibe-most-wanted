# 🚀 Firebase Cloud Functions - Guia de Deploy

## ✅ O que foi criado

Implementação completa de segurança com Cloud Functions:

### Arquivos Criados:
1. `functions/` - Diretório com Cloud Functions
2. `functions/src/index.ts` - Código das funções serverside
3. `functions/package.json` - Dependências das funções
4. `functions/tsconfig.json` - Config TypeScript
5. `firebase.json` - Config do Firebase
6. `database.rules.json` - Regras de segurança
7. `lib/cloudFunctions.ts` - Wrapper para chamar as funções do client

### Cloud Functions Implementadas:
- ✅ `createProfile` - Cria perfil com validação
- ✅ `recordMatch` - Registra partidas com validação
- ✅ `updateStats` - Atualiza stats de NFTs
- ✅ `updateTwitter` - Atualiza Twitter OAuth
- ✅ `cleanupOldRooms` - Limpeza automática agendada (a cada 5 minutos)

---

## 📋 Passo a Passo para Deploy

### **1. Instalar Firebase CLI**

```bash
npm install -g firebase-tools
```

### **2. Login no Firebase**

```bash
firebase login
```

Vai abrir o navegador para você autorizar.

### **3. Inicializar Firebase no Projeto**

```bash
cd C:\Users\zoboo\vibe-most-wanted
firebase init
```

Quando perguntar:
- **Which Firebase features?** → Selecione:
  - ✅ Functions
  - ✅ Realtime Database
- **Use an existing project** → Selecione `vibe-most-wanted`
- **What language?** → TypeScript (já está configurado)
- **Use ESLint?** → No
- **Install dependencies now?** → Yes
- **Database rules file?** → `database.rules.json` (já existe)
- **Functions folder?** → `functions` (já existe)

### **4. Instalar Dependências das Functions**

```bash
cd functions
npm install
cd ..
```

### **5. Deploy das Regras de Segurança**

```bash
firebase deploy --only database
```

Isso vai aplicar as regras de `database.rules.json` que protegem o banco.

### **6. Deploy das Cloud Functions**

```bash
firebase deploy --only functions
```

Isso vai:
- Compilar o TypeScript
- Fazer upload das funções
- Criar os endpoints HTTPS
- Configurar a função agendada de cleanup

**ATENÇÃO:** Primeira vez pode demorar 5-10 minutos!

### **7. Verificar Deploy**

Após deploy, você vai ver URLs tipo:
```
✔ functions[createProfile(us-central1)] deployed
✔ functions[recordMatch(us-central1)] deployed
✔ functions[updateStats(us-central1)] deployed
✔ functions[updateTwitter(us-central1)] deployed
✔ functions[cleanupOldRooms] deployed
```

Copie essas URLs e guarde (não precisa fazer nada com elas, só confirmar que deployou).

---

## 🔧 Próximos Passos (Integração com Client)

Depois que deployar, você precisa atualizar o código do client para usar as Cloud Functions ao invés de acessar Firebase diretamente.

### Mudanças Necessárias:

**ANTES (inseguro):**
```typescript
// Direto no Firebase - qualquer um pode chamar
await ProfileService.createProfile(address, username);
```

**DEPOIS (seguro):**
```typescript
// Via Cloud Function - validação serverside
import { CloudFunctions } from '@/lib/cloudFunctions';
await CloudFunctions.createProfile(address, username);
```

### Arquivos a Modificar:

1. **lib/firebase.ts** - Comentar as funções que serão substituídas
2. **app/page.tsx** - Trocar chamadas diretas por CloudFunctions
3. **app/api/auth/twitter/callback/route.ts** - Usar CloudFunctions.updateTwitter

---

## 🧪 Testar Localmente (Opcional)

Antes de fazer deploy, você pode testar localmente:

```bash
# Terminal 1 - Emuladores do Firebase
cd functions
npm run serve

# Terminal 2 - Seu app Next.js
npm run dev
```

Isso roda as functions localmente. No `.env.local` adicione:
```
NEXT_PUBLIC_USE_EMULATOR=true
```

---

## 💰 Custos

### Firebase Spark Plan (GRÁTIS):
- ✅ 125K invocações/mês
- ✅ 40K GB-segundos
- ✅ 40K CPU-segundos
- ✅ 5GB outbound/mês

Para um jogo com 100-200 jogadores, fica de graça tranquilo!

### Firebase Blaze Plan (Pay-as-you-go):
Só se passar dos limites acima. Mesmo assim:
- $0.40 por milhão de invocações
- Muito barato para jogos pequenos/médios

---

## 🛡️ Regras de Segurança Aplicadas

Após deploy, seu Firebase terá:

```json
{
  "profiles": "❌ Só leitura - edição via Cloud Function",
  "usernames": "❌ Só leitura - criação via Cloud Function",
  "playerMatches": "❌ Só leitura - criação via Cloud Function",
  "rooms": "✅ Leitura/escrita - necessário para PvP em tempo real",
  "matchmaking": "✅ Leitura/escrita - necessário para auto match"
}
```

---

## ⚠️ IMPORTANTE

**NÃO DELETE** o Firebase atual ainda! As funções vão funcionar junto com o código antigo.

**Ordem de Migração:**
1. ✅ Deploy das functions (agora)
2. ✅ Testar se funcionam
3. ✅ Migrar código do client aos poucos
4. ✅ Quando tudo migrado → ativar regras estritas

---

## 🆘 Troubleshooting

### Erro: "Permission Denied"
- As funções ainda não foram deployadas
- OU as regras foram aplicadas mas o client ainda usa código antigo

**Solução:** Comente as regras estritas temporariamente

### Erro: "Functions not found"
- Certifique-se que deployou: `firebase deploy --only functions`
- Verifique no Firebase Console → Functions

### Erro: "Billing required"
- Cloud Functions precisa de Blaze plan
- Mas tem free tier generoso
- Configure cartão (não vai cobrar até passar do limite)

---

## 📞 Próximos Passos

Quando deployar, me avise para eu:
1. Atualizar o código do client para usar as functions
2. Testar tudo funcionando
3. Ativar as regras de segurança completas

**Pronto para deployar?** Siga os passos acima! 🚀
