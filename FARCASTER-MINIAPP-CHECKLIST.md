# 🔍 Farcaster Mini App - Checklist de Verificação

## ✅ O QUE FOI CORRIGIDO

### 1. Meta Tags Adicionadas ✅

**ANTES (ERRADO):**
```html
<!-- Tags antigas que NÃO funcionam para discovery -->
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="..." />
<meta property="fc:frame:button:1" content="..." />
```

**DEPOIS (CORRETO):**
```html
<!-- Tag CORRETA para aparecer na busca do Farcaster -->
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{...}}' />
```

### 2. Arquivos Atualizados ✅

- ✅ `app/layout.tsx` - Adicionadas meta tags `fc:miniapp` corretas
- ✅ Metadata do Next.js atualizado
- ✅ URLs de imagem corrigidas (screenshot.jpg ao invés de og-placeholder.svg)

---

## 📋 CHECKLIST COMPLETO

### ✅ Arquivos Necessários (Verificar se existem)

- [x] `/public/screenshot.jpg` - Imagem principal (1200x800px)
- [x] `/public/splash.png` - Splash screen
- [x] `/public/icon.png` - Ícone do app
- [x] `/public/.well-known/farcaster.json` - Manifest

### ✅ Meta Tags Obrigatórias (Já adicionadas)

- [x] `fc:miniapp` com JSON stringificado
- [x] `fc:frame` para backward compatibility
- [x] OpenGraph tags (og:title, og:description, og:image, og:url)
- [x] Twitter Card tags

### ✅ Configuração do farcaster.json (Já configurado)

```json
{
  "frame": {
    "name": "VIBE MOST WANTED",
    "version": "1",
    "iconUrl": "https://www.vibemostwanted.xyz/icon.png",
    "homeUrl": "https://www.vibemostwanted.xyz",
    "imageUrl": "https://www.vibemostwanted.xyz/screenshot.jpg",
    "splashImageUrl": "https://www.vibemostwanted.xyz/splash.png",
    "splashBackgroundColor": "#FFD700",
    "webhookUrl": "https://www.vibemostwanted.xyz/api/webhook",
    "subtitle": "NFT Card Battle Game",
    "description": "Battle with your VIBE NFT cards in PvE and PvP modes. Join the most wanted card game on Base!",
    "primaryCategory": "games"
  }
}
```

---

## 🚀 PRÓXIMOS PASSOS (FAÇA AGORA)

### 1. Deploy das Mudanças

```bash
# Commitar as mudanças
git add app/layout.tsx
git commit -m "fix: add fc:miniapp meta tag for Farcaster discovery"

# Fazer push e deploy
git push
# Aguardar deploy no Vercel/sua plataforma
```

### 2. Verificar se as Imagens Estão Acessíveis

Abra cada URL no navegador e verifique se carregam:

- [ ] https://www.vibemostwanted.xyz/screenshot.jpg
- [ ] https://www.vibemostwanted.xyz/splash.png
- [ ] https://www.vibemostwanted.xyz/icon.png
- [ ] https://www.vibemostwanted.xyz/.well-known/farcaster.json

**Como verificar:**
```bash
# Teste localmente primeiro
curl https://www.vibemostwanted.xyz/screenshot.jpg
curl https://www.vibemostwanted.xyz/.well-known/farcaster.json
```

### 3. Validar Meta Tags

Use o validador oficial do Farcaster:

**Opções:**

**A) Usar Farcaster Frame Validator:**
- Acesse: https://warpcast.com/~/developers/frames
- Cole sua URL: https://www.vibemostwanted.xyz
- Clique em "Validate"

**B) Inspecionar no Navegador:**
```bash
# Rode seu app local
npm run dev

# Abra http://localhost:3000
# Clique com botão direito > Inspecionar
# Vá em <head> e verifique se tem:
# <meta name="fc:miniapp" content='{"version":"1",...}' />
```

### 4. Verificar no Farcaster

**IMPORTANTE:** Após o deploy, pode levar alguns minutos/horas para aparecer na busca.

1. Abra o Warpcast app
2. Vá para a aba de busca/discovery
3. Procure por "VIBE MOST WANTED"
4. OU compartilhe seu link em um cast e veja se aparece o botão de lançamento

---

## 🔧 TROUBLESHOOTING

### Problema: "Mini app não aparece na busca"

**Soluções:**

1. **Aguarde o cache expirar** (pode levar até 24h)
2. **Verifique se o farcaster.json está acessível:**
   ```bash
   curl https://www.vibemostwanted.xyz/.well-known/farcaster.json
   ```
3. **Verifique se as meta tags estão corretas:**
   - Abra https://www.vibemostwanted.xyz
   - View Source (Ctrl+U)
   - Procure por `fc:miniapp`
   - Deve ter um JSON stringificado

### Problema: "Imagens não carregam"

**Verifique:**
```bash
# No servidor
ls -la public/screenshot.jpg
ls -la public/splash.png
ls -la public/icon.png

# No browser
# Abra diretamente as URLs
```

### Problema: "Meta tag não aparece no HTML"

**Causa:** Next.js pode estar fazendo cache.

**Solução:**
```bash
# Limpar cache
rm -rf .next
npm run dev

# Hard refresh no navegador
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Problema: "JSON inválido na meta tag"

**Verificar:**
```javascript
// No layout.tsx, a meta tag deve estar assim:
<meta name="fc:miniapp" content={JSON.stringify({
  version: "1",
  imageUrl: "https://www.vibemostwanted.xyz/screenshot.jpg",
  button: {
    title: "🎮 Play Now",
    action: {
      type: "launch_miniapp",
      name: "VIBE MOST WANTED",
      url: "https://www.vibemostwanted.xyz",
      splashImageUrl: "https://www.vibemostwanted.xyz/splash.png",
      splashBackgroundColor: "#FFD700"
    }
  }
})} />
```

---

## 📊 ESPECIFICAÇÕES DAS IMAGENS

### screenshot.jpg
- **Aspect Ratio:** 3:2 (recomendado)
- **Dimensões mínimas:** 600x400px
- **Dimensões máximas:** 3000x2000px
- **Tamanho do arquivo:** < 10MB
- **Formato:** PNG, JPG, GIF ou WebP (PNG recomendado)
- **Uso:** Preview principal quando compartilham seu app

### splash.png
- **Dimensões:** 512x512px ou similar (quadrado)
- **Formato:** PNG com transparência (recomendado)
- **Uso:** Tela de carregamento quando abrem o app

### icon.png
- **Dimensões:** 512x512px (quadrado)
- **Formato:** PNG com transparência
- **Uso:** Ícone do app na lista de mini apps

---

## ✅ VERIFICAÇÃO FINAL

Depois do deploy, rode este checklist:

```
[ ] Deploy feito e site acessível
[ ] https://www.vibemostwanted.xyz carrega normalmente
[ ] https://www.vibemostwanted.xyz/.well-known/farcaster.json retorna JSON válido
[ ] https://www.vibemostwanted.xyz/screenshot.jpg carrega imagem
[ ] https://www.vibemostwanted.xyz/splash.png carrega imagem
[ ] https://www.vibemostwanted.xyz/icon.png carrega imagem
[ ] Meta tag fc:miniapp aparece no View Source
[ ] JSON da meta tag é válido (cole em jsonlint.com)
[ ] Aguardei 1-24h para indexação do Farcaster
[ ] Testei compartilhar link em um cast
```

---

## 🎯 COMO TESTAR SE FUNCIONOU

### Teste 1: Meta Tag no HTML
```bash
# Abra seu site
curl -s https://www.vibemostwanted.xyz | grep -o 'fc:miniapp.*' | head -1

# Deve retornar algo como:
# fc:miniapp" content='{"version":"1","imageUrl":...}'
```

### Teste 2: Manifest Acessível
```bash
curl https://www.vibemostwanted.xyz/.well-known/farcaster.json

# Deve retornar JSON válido (não 404)
```

### Teste 3: Compartilhar no Warpcast
1. Crie um cast com o link: https://www.vibemostwanted.xyz
2. Deve aparecer um preview com botão "🎮 Play Now"
3. Ao clicar, deve abrir o mini app

---

## 📞 AINDA NÃO FUNCIONA?

### Possíveis causas:

1. **Cache do Farcaster** - Aguarde 24h
2. **Domínio não verificado** - Verifique se o `accountAssociation` no farcaster.json está correto
3. **HTTPS não configurado** - Farcaster requer HTTPS
4. **CORS bloqueando** - Verifique headers do servidor

### Next Config (Verificar)

Certifique-se que `next.config.js` permite acesso ao manifest:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};
```

---

## 📚 DOCUMENTAÇÃO OFICIAL

- [Farcaster Mini Apps - Sharing Guide](https://miniapps.farcaster.xyz/docs/guides/sharing)
- [Frame Specification](https://docs.farcaster.xyz/reference/frames/spec)
- [Mini App Manifest](https://miniapps.farcaster.xyz/docs/guides/manifest)

---

## 🎉 SUCESSO!

Quando funcionar, você verá:

✅ App aparece na busca do Warpcast
✅ Ao compartilhar link, aparece botão de lançamento
✅ Botão abre seu mini app dentro do Farcaster
✅ Splash screen aparece durante carregamento

---

**Última atualização:** 2025-11-01
**Status:** Correções aplicadas ✅
**Próximo passo:** Deploy e aguardar indexação

---

## 💡 DICA IMPORTANTE

Se o app não aparecer na busca após 24h:

1. Verifique se você está logado com a wallet correta (FID 214746)
2. Veja se o `accountAssociation` no farcaster.json corresponde
3. Tente fazer um cast mencionando o link
4. Entre em contato no Discord do Farcaster Developers

**Discord:** https://discord.gg/farcaster
**Canal:** #miniapps
