# ⚡ Deploy Rápido - Comandos Copy/Paste

## 🚀 Deploy em 5 Minutos

### 1️⃣ Instalar Firebase CLI (uma vez só)
```bash
npm install -g firebase-tools
```

### 2️⃣ Login no Firebase (uma vez só)
```bash
firebase login
```

### 3️⃣ Configurar Projeto
```bash
cd C:\Users\zoboo\vibe-most-wanted
firebase use --add
```
- Escolha o projeto: `vibe-most-wanted`
- Alias: `default`

### 4️⃣ Instalar Dependências
```bash
cd functions
npm install
cd ..
```

### 5️⃣ DEPLOY! 🚀
```bash
firebase deploy
```

Isso vai deployar:
- ✅ Cloud Functions (5 funções)
- ✅ Security Rules (database)
- ✅ Scheduled cleanup (a cada 5 min)

---

## 🎯 Comandos Úteis

### Ver Logs das Functions
```bash
firebase functions:log
```

### Deploy só Functions (mais rápido)
```bash
firebase deploy --only functions
```

### Deploy só Rules
```bash
firebase deploy --only database
```

### Testar Localmente
```bash
cd functions
npm run serve
```

---

## ✅ Checklist de Deploy

Após rodar `firebase deploy`, verifique:

- [ ] Console mostra: "✔ Deploy complete!"
- [ ] Vá em Firebase Console → Functions
- [ ] Veja as 5 funções listadas:
  - createProfile
  - recordMatch
  - updateStats
  - updateTwitter
  - cleanupOldRooms
- [ ] Vá em Firebase Console → Realtime Database → Rules
- [ ] Veja as novas regras aplicadas
- [ ] Status: "Published"

---

## 🐛 Problemas Comuns

### "Billing required"
Firebase precisa do Blaze plan para Functions.

**Solução:**
1. Vá em Firebase Console
2. Settings → Usage and billing
3. Upgrade to Blaze (pay-as-you-go)
4. Adicione cartão
5. **NÃO VAI COBRAR** até passar 125K invocações/mês (muito difícil)

### "Permission denied"
Você não tem permissão no projeto.

**Solução:**
1. Certifique-se que está logado: `firebase login`
2. Liste projetos: `firebase projects:list`
3. Use o correto: `firebase use vibe-most-wanted`

### "Build failed"
Erro ao compilar TypeScript.

**Solução:**
```bash
cd functions
npm install
npm run build
```

Se mostrar erros, me manda a mensagem!

---

## 📱 Após Deploy - Testar

1. Abra o jogo
2. F12 → Console
3. Tente criar um perfil
4. Veja os logs no console
5. Se der erro, copie e me manda

---

## 🔄 Atualizar Functions

Fez mudança no código?

```bash
firebase deploy --only functions
```

Demora ~2-3 minutos.

---

## 💡 Dica Pro

Adicione no `package.json` (raiz do projeto):

```json
{
  "scripts": {
    "deploy": "firebase deploy",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:db": "firebase deploy --only database",
    "logs": "firebase functions:log"
  }
}
```

Aí você pode rodar:
```bash
npm run deploy
npm run logs
```

Muito mais fácil! 😎

---

## 📞 Ajuda

Se travar em algum passo, me manda:
1. O comando que rodou
2. A mensagem de erro completa
3. Print da tela se possível

Eu te ajudo! 🤝
