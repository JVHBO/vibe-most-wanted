# 🖼️ URGENTE: Redimensionar screenshot.jpg

## ❌ PROBLEMA

A imagem `public/screenshot.jpg` tem dimensões **689x506px** (aspect ratio 1.36:1).

O Farcaster **exige** aspect ratio **3:2** (1.5:1).

**Isso está causando o erro "Embed Valid X"!**

---

## ✅ SOLUÇÃO

Você precisa redimensionar a imagem para um destes tamanhos:

### Opção 1: Alta Qualidade (Recomendado)
- **Dimensões:** 1200x800px
- **Aspect Ratio:** 3:2 ✅
- **Tamanho:** ~100-200KB

### Opção 2: Qualidade Média
- **Dimensões:** 900x600px
- **Aspect Ratio:** 3:2 ✅
- **Tamanho:** ~60-120KB

### Opção 3: Qualidade Mínima
- **Dimensões:** 750x500px
- **Aspect Ratio:** 3:2 ✅
- **Tamanho:** ~40-80KB

---

## 🛠️ COMO REDIMENSIONAR

### Opção A: Online (Mais Fácil)

1. Vá em: https://www.birme.net/ ou https://imageresize.org/
2. Faça upload de `public/screenshot.jpg`
3. Configure:
   - Width: **1200px**
   - Height: **800px**
   - Manter proporções: **Desligado** (forçar dimensões exatas)
4. Download e substitua `public/screenshot.jpg`

### Opção B: Photoshop / GIMP

1. Abra `public/screenshot.jpg`
2. Image → Image Size
3. Configure:
   - Width: 1200px
   - Height: 800px
   - Constrain Proportions: OFF
4. Salve (JPEG, qualidade 80-90%)

### Opção C: ImageMagick (Command Line)

```bash
cd vibe-most-wanted/public
magick screenshot.jpg -resize 1200x800! screenshot-new.jpg
mv screenshot-new.jpg screenshot.jpg
```

### Opção D: Python (Se tiver Pillow instalado)

```bash
cd vibe-most-wanted
python resize-screenshot.py
```

---

## 🚀 APÓS REDIMENSIONAR

1. Substitua `public/screenshot.jpg` pela versão redimensionada
2. Commit e push:
   ```bash
   git add public/screenshot.jpg
   git commit -m "fix: resize screenshot.jpg to 3:2 aspect ratio (1200x800)"
   git push
   ```
3. Aguarde deploy (2-3 minutos)
4. Teste no Embed Tool:
   - https://warpcast.com/~/developers/embeds
   - Cole URL e clique "Refetch"
   - **Embed Valid** deve marcar ✅

---

## ⚠️ IMPORTANTE

**NÃO** corte a imagem aleatoriamente! Certifique-se de que o conteúdo importante está visível.

Se a imagem atual for muito importante, você pode:
1. Adicionar barras pretas nas laterais para completar 3:2
2. Ou redimensionar com crop inteligente

---

## 📊 VERIFICAR DIMENSÕES

Depois de redimensionar, verifique:

```bash
file public/screenshot.jpg
```

Deve mostrar: `1200x800` ou `900x600` ou `750x500`

---

**Status:** BLOQUEADO - Aguardando redimensionamento da imagem
**Prioridade:** 🔴 ALTA
