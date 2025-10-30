# 🌈 Foil Card Effects - Implementação

## 📋 O que foi criado

### Componente: `FoilCardEffect.tsx`

Um wrapper component que adiciona efeitos holográficos visuais às cartas com foil.

**Localização**: `components/FoilCardEffect.tsx`

---

## 🚀 Como Usar

### 1. Import o componente

```tsx
import FoilCardEffect from '@/components/FoilCardEffect';
```

### 2. Envolva a imagem da carta

#### Exemplo Básico:
```tsx
<FoilCardEffect foilType={card.foil}>
  <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
</FoilCardEffect>
```

#### Exemplo Completo (div de carta):
```tsx
<FoilCardEffect
  foilType={card.foil}
  className="relative aspect-[2/3] rounded-lg overflow-hidden"
>
  <img
    src={card.imageUrl}
    alt={`#${card.tokenId}`}
    className="w-full h-full object-cover"
  />
  <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-sm px-2 py-1 rounded-br font-bold">
    {card.power}
  </div>
</FoilCardEffect>
```

---

## 🎨 Tipos de Foil

### **Standard Foil**
- Efeito holográfico suave
- Cores com 30-40% de opacidade
- Blur de 8px
- Ideal para cartas comuns/raras com foil

### **Prize Foil**
- Efeito holográfico intenso
- Cores com 50-60% de opacidade
- Blur de 12px + camada extra de sparkle
- Ideal para cartas épicas/lendárias com foil

### **Sem Foil** (null)
- Nenhum efeito aplicado
- Renderiza apenas o children

---

## 📍 Onde Aplicar

### ✅ Locais Recomendados:

1. **Home Page - Card Selection** (`app/page.tsx`)
   - Deck de seleção do jogador
   - Cards durante a batalha

2. **Profile Page** (`app/profile/[username]/page.tsx`)
   - Defense Deck display
   - Collection grid

3. **Battle Screen** (`app/page.tsx`)
   - Cartas do player
   - Cartas do dealer/oponente

---

## 💻 Exemplo de Implementação

### Antes (sem efeito):
```tsx
<div className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold">
  <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
</div>
```

### Depois (com efeito):
```tsx
<FoilCardEffect
  foilType={card.foil}
  className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold"
>
  <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
</FoilCardEffect>
```

---

## 🎯 Características do Efeito

- ✨ **Manchas de cor holográficas** que se movem organicamente
- 🌈 **Cores vibrantes**: rosa, amarelo, azul, verde
- 💫 **Shimmer effect**: brilho que passa pela carta
- ⭐ **Prize sparkle**: camada extra para Prize foils
- 🎭 **Mix blend mode**: se integra naturalmente com a carta
- ⚡ **Performance otimizada**: CSS animations only
- 🎮 **Não bloqueia interações**: pointer-events: none

---

## ⚙️ Personalização

### Ajustar Intensidade:
```tsx
// No componente FoilCardEffect.tsx, linha ~45-55
rgba(255, 0, 200, ${isPrize ? '0.5' : '0.3'}) // Ajuste os valores
```

### Ajustar Velocidade:
```tsx
// Linha ~63
animation: 'foilBlobMove 10s ease-in-out infinite' // Mude 10s
```

### Ajustar Blur:
```tsx
// Linha ~62
filter: `blur(${isPrize ? '12px' : '8px'})` // Ajuste px
```

---

## 🔧 Troubleshooting

### Efeito não aparece:
- ✅ Verifique se `card.foil` está sendo passado corretamente
- ✅ Confirme que o valor é 'Standard' ou 'Prize'
- ✅ Certifique-se que o parent tem `overflow-hidden`

### Performance ruim:
- ✅ Use apenas em cartas visíveis (não em toda coleção de uma vez)
- ✅ Considere limitar a ~10-20 cartas com efeito simultâneo
- ✅ O componente já está otimizado com CSS animations

### Cores muito fracas/fortes:
- ✅ Ajuste os valores rgba() no style inline
- ✅ Modifique o blur() se necessário
- ✅ Para Prize, ajuste o multiplicador de opacidade

---

## 📝 Checklist de Implementação

- [ ] Componente criado em `components/FoilCardEffect.tsx`
- [ ] Importado no arquivo onde será usado
- [ ] Envolvendo imagens de cartas com o wrapper
- [ ] Testado com Standard foil
- [ ] Testado com Prize foil
- [ ] Testado sem foil (deve renderizar normal)
- [ ] Performance verificada (FPS estável)
- [ ] Visual aprovado

---

## 🎮 Integração com Sistema Existente

O componente já está preparado para trabalhar com:

- **Foil types**: `'Standard' | 'Prize' | null`
- **Card objects**: `{ foil: string, imageUrl: string, ... }`
- **Tailwind CSS**: Classes podem ser passadas via `className`
- **React 19**: Totalmente compatível

---

## 🚀 Deploy

Após implementar, fazer commit:

```bash
git add components/FoilCardEffect.tsx
git add app/page.tsx  # ou outros arquivos modificados
git commit -m "Add holographic foil effects to cards"
git push
```

O Vercel vai fazer deploy automático! ✨

---

**Baseado no vídeo de referência de cartas holográficas com manchas de cor em movimento.**
