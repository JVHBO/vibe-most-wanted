# 🔧 Correção: Mini App não aparece na busca do Farcaster

## ❌ PROBLEMA IDENTIFICADO

O mini app **VIBE MOST WANTED** não aparecia na busca do Farcaster porque estava faltando a meta tag **`fc:miniapp`** obrigatória.

## ✅ SOLUÇÃO APLICADA

### 1. Adicionada Meta Tag `fc:miniapp` ✅

**Arquivo:** `app/layout.tsx`

**O que foi adicionado:**
```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://www.vibemostwanted.xyz/screenshot.jpg","button":{"title":"🎮 Play Now","action":{"type":"launch_miniapp",...}}}' />
```

Esta é a tag **OBRIGATÓRIA** para o app aparecer na busca do Farcaster.

### 2. URLs de Imagem Corrigidas ✅

**Antes:** Usava `og-placeholder.svg` (placeholder)
**Depois:** Usa `screenshot.jpg` (imagem real)

### 3. Headers HTTP Configurados ✅

**Arquivo:** `next.config.js`

Adicionados headers para:
- ✅ Permitir acesso CORS ao `farcaster.json`
- ✅ Cache otimizado para imagens
- ✅ Content-Type correto para JSON

### 4. Backward Compatibility ✅

Mantida tag `fc:frame` para compatibilidade com versões antigas do Farcaster.

---

## 📁 ARQUIVOS MODIFICADOS

1. ✅ `app/layout.tsx` - Meta tags atualizadas
2. ✅ `next.config.js` - Headers HTTP adicionados
3. ✅ `FARCASTER-MINIAPP-CHECKLIST.md` - Documentação criada

---

## 🚀 PRÓXIMOS PASSOS (VOCÊ PRECISA FAZER)

### 1️⃣ DEPLOY IMEDIATO

```bash
# Commitar mudanças
git add app/layout.tsx next.config.js
git commit -m "fix: add fc:miniapp meta tag for Farcaster discovery"

# Push para produção
git push origin main
```

### 2️⃣ VERIFICAR APÓS DEPLOY

Espere o deploy terminar, então teste:

**A) Verificar meta tag no site:**
```bash
curl -s https://www.vibemostwanted.xyz | grep "fc:miniapp"
```

Deve retornar algo como:
```html
<meta name="fc:miniapp" content='{"version":"1",...}' />
```

**B) Verificar farcaster.json:**
```bash
curl https://www.vibemostwanted.xyz/.well-known/farcaster.json
```

Deve retornar JSON válido (não 404).

**C) Verificar imagens:**
- https://www.vibemostwanted.xyz/screenshot.jpg
- https://www.vibemostwanted.xyz/splash.png
- https://www.vibemostwanted.xyz/icon.png

### 3️⃣ VALIDAR NO FARCASTER

**Opção 1: Frame Validator**
- Acesse: https://warpcast.com/~/developers/frames
- Cole: https://www.vibemostwanted.xyz
- Clique "Validate"

**Opção 2: Testar Compartilhando**
1. Crie um cast no Warpcast
2. Cole o link: https://www.vibemostwanted.xyz
3. Deve aparecer preview com botão "🎮 Play Now"

### 4️⃣ AGUARDAR INDEXAÇÃO

**IMPORTANTE:** O Farcaster pode levar de **1 hora até 24 horas** para indexar o app na busca.

Enquanto isso:
- ✅ O botão de compartilhamento já deve funcionar
- ✅ Meta tags já estarão corretas
- ⏳ Busca pode demorar para atualizar

---

## 🔍 COMO SABER SE FUNCIONOU

### ✅ Sucesso Imediato (após deploy)

Você pode testar agora:
1. Compartilhe https://www.vibemostwanted.xyz em um cast
2. Deve aparecer preview com botão
3. Clicar no botão abre o mini app

### ✅ Sucesso na Busca (1-24h depois)

No Warpcast app:
1. Vá para aba de mini apps / busca
2. Procure "VIBE MOST WANTED"
3. Deve aparecer na lista

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ANTES (Errado) ❌
```html
<!-- Tags antigas que NÃO funcionam para discovery -->
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="..." />
<meta property="fc:frame:button:1" content="..." />
```

**Resultado:** App não aparecia na busca

### DEPOIS (Correto) ✅
```html
<!-- Tag CORRETA para discovery -->
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{...}}' />
```

**Resultado:** App aparece na busca do Farcaster

---

## 🐛 TROUBLESHOOTING

### "Ainda não aparece na busca após 24h"

**Possíveis causas:**

1. **Deploy não concluído** - Verifique se as mudanças estão no ar
2. **Meta tag incorreta** - Faça View Source e verifique
3. **Farcaster.json inacessível** - Teste com curl
4. **Domain não verificado** - Verifique accountAssociation

**Solução:**
```bash
# Verificar se deploy funcionou
curl -I https://www.vibemostwanted.xyz

# Verificar meta tag
curl -s https://www.vibemostwanted.xyz | grep -i "fc:miniapp"

# Verificar manifest
curl https://www.vibemostwanted.xyz/.well-known/farcaster.json
```

### "Meta tag não aparece no HTML"

**Causa:** Cache do Next.js ou navegador

**Solução:**
```bash
# Local
rm -rf .next
npm run dev

# Produção
# Aguarde deploy ou force rebuild na Vercel
```

### "JSON inválido na meta tag"

**Verificar:**
1. Abra View Source do site
2. Copie o conteúdo da meta tag fc:miniapp
3. Cole em https://jsonlint.com
4. Deve ser JSON válido

---

## 📋 CHECKLIST FINAL

Depois do deploy:

```
[ ] Deploy concluído
[ ] Site https://www.vibemostwanted.xyz acessível
[ ] Meta tag fc:miniapp aparece no View Source
[ ] JSON da meta tag é válido
[ ] farcaster.json retorna 200 (não 404)
[ ] screenshot.jpg carrega
[ ] splash.png carrega
[ ] icon.png carrega
[ ] Teste compartilhar link - botão aparece
[ ] Aguardei 1-24h para busca indexar
```

---

## 🎯 EXPECTATIVA DE RESULTADO

### Imediato (após deploy)
✅ Compartilhar link mostra botão "🎮 Play Now"
✅ Clicar no botão abre o mini app
✅ Splash screen aparece

### 1-24 horas depois
✅ App aparece na busca do Warpcast
✅ Usuários podem descobrir o app organicamente
✅ Listado na categoria "games"

---

## 📚 DOCUMENTAÇÃO

Para mais detalhes, consulte:
- `FARCASTER-MINIAPP-CHECKLIST.md` - Checklist completo
- Documentação oficial: https://miniapps.farcaster.xyz/docs/guides/sharing

---

## ✨ RESUMO TÉCNICO

**O que estava faltando:**
- Meta tag `fc:miniapp` com JSON stringificado

**O que foi adicionado:**
- Meta tag `fc:miniapp` no layout.tsx
- Headers HTTP no next.config.js
- Meta tag `fc:frame` para backward compatibility

**Impacto:**
- ✅ App agora é descoberto na busca do Farcaster
- ✅ Compartilhamento funciona corretamente
- ✅ Preview e botão aparecem em casts

---

**Status:** Correções aplicadas ✅
**Ação necessária:** Deploy para produção
**Tempo esperado:** 1-24h para aparecer na busca

---

## 💡 DICA IMPORTANTE

Se após 24h ainda não aparecer:
1. Entre no Discord do Farcaster Developers
2. Canal #miniapps
3. Compartilhe seu manifest e peça feedback
4. Link: https://discord.gg/farcaster

---

**Última atualização:** 2025-11-01
**Correção por:** Claude Code
