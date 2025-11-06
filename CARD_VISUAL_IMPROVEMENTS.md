# 🃏 Card Visual Improvements
## Making NFT cards look premium and game-like

---

## 🎯 PROBLEM

Current cards (lines 292-450 in `app/page.tsx`):
- Simple scale on hover
- Static appearance
- No sense of value/rarity
- Looks like a basic image gallery
- Missing "premium collectible" feel

---

## ✨ SOLUTION: 3-Tier Card Enhancement

### Tier 1: Basic Hover (5 minutes)
### Tier 2: 3D Tilt (15 minutes)
### Tier 3: Holographic Effects (30 minutes)

---

## 🥉 TIER 1: BASIC HOVER UPGRADE (5 min)

### Add to `app/globals.css`:

```css
/* Basic card improvements */
.nft-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.nft-card:hover {
  transform: translateY(-8px) scale(1.05);
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.8))
          drop-shadow(0 0 20px rgba(255, 215, 0, 0.3));
  z-index: 10;
}

.nft-card.selected {
  transform: scale(0.95);
  filter: brightness(1.2);
}

/* Rarity glow rings */
.rarity-common { box-shadow: 0 0 15px rgba(156, 163, 175, 0.4); }
.rarity-rare { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
.rarity-epic { box-shadow: 0 0 20px rgba(168, 85, 247, 0.6); }
.rarity-legendary { box-shadow: 0 0 25px rgba(251, 146, 60, 0.7); }
.rarity-mythic {
  box-shadow:
    0 0 30px rgba(255, 215, 0, 0.8),
    0 0 50px rgba(255, 215, 0, 0.5);
  animation: mythic-pulse 2s ease-in-out infinite;
}

@keyframes mythic-pulse {
  0%, 100% {
    box-shadow:
      0 0 30px rgba(255, 215, 0, 0.8),
      0 0 50px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow:
      0 0 40px rgba(255, 215, 0, 1),
      0 0 70px rgba(255, 215, 0, 0.7),
      0 0 100px rgba(255, 215, 0, 0.4);
  }
}
```

### Update NFTCard component (line 292):

```tsx
const NFTCard = memo(({ nft, selected, onSelect }: { nft: any; selected: boolean; onSelect: (nft: any) => void }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);

  const getRarityClass = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('mythic')) return 'rarity-mythic';
    if (r.includes('legend')) return 'rarity-legendary';
    if (r.includes('epic')) return 'rarity-epic';
    if (r.includes('rare')) return 'rarity-rare';
    return 'rarity-common';
  };

  const getRarityColor = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'from-orange-500 to-yellow-400';
    if (r.includes('epic')) return 'from-purple-500 to-pink-500';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-400';
    return 'from-gray-600 to-gray-500';
  };

  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const fallbacks = useMemo(() => {
    const allUrls = [];
    if (nft.imageUrl) allUrls.push(nft.imageUrl);
    if (nft?.raw?.metadata?.image) allUrls.push(String(nft.raw.metadata.image));
    [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl].forEach((url) => {
      if (url) allUrls.push(String(url));
    });
    if (nft?.metadata?.image) allUrls.push(String(nft.metadata.image));
    allUrls.push(`https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`);
    return [...new Set(allUrls)].filter(url => url && !url.includes('undefined') && url.startsWith('http'));
  }, [nft, tid]);

  const currentSrc = fallbacks[imgError] || fallbacks[fallbacks.length - 1];
  const foilValue = (nft.foil || '').trim();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(nft);
  }, [nft, onSelect]);

  return (
    <div
      className={`nft-card ${getRarityClass(nft.rarity || '')} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      data-card-id={tid}
    >
      {/* Ring wrapper */}
      <div className={`rounded-lg ${
        selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
        'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
      }`}>
        <FoilCardEffect
          foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
          className="relative rounded-lg"
        >
          <div style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}} className="rounded-lg overflow-hidden">
            <img
              src={currentSrc}
              alt={`#${tid}`}
              className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none"
              loading="lazy"
              onError={() => { if (imgError < fallbacks.length - 1) setImgError(imgError + 1); }}
            />

            {/* Power badge */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3 pointer-events-none z-20">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}>
                  {nft.power || 0} PWR
                </span>
                {selected && <span className="text-vintage-gold text-2xl drop-shadow-lg font-bold">✓</span>}
              </div>
            </div>

            {/* Card info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pointer-events-none z-20">
              {nft.rarity && (
                <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-lg">
                  {nft.rarity}
                </div>
              )}
              {nft.wear && (
                <div className="text-xs text-yellow-300 font-semibold drop-shadow-lg">
                  {nft.wear}
                </div>
              )}
            </div>
          </div>
        </FoilCardEffect>
      </div>
    </div>
  );
});
```

✅ **Result**: Better hover states, rarity-based glows

---

## 🥈 TIER 2: 3D TILT EFFECT (15 min)

### Add to `app/globals.css`:

```css
/* 3D card tilt */
.card-3d {
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-3d:hover {
  transform:
    perspective(1000px)
    rotateX(var(--rotate-x, 0deg))
    rotateY(var(--rotate-y, 0deg))
    scale(1.08);
}

/* Light reflection on tilt */
.card-3d::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    calc(var(--mouse-angle, 45deg)),
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: 0;
  pointer-events: none;
  border-radius: inherit;
  transition: opacity 0.3s;
  z-index: 30;
}

.card-3d:hover::after {
  opacity: 1;
}
```

### Update NFTCard with mouse tracking:

```tsx
const NFTCard = memo(({ nft, selected, onSelect }: { nft: any; selected: boolean; onSelect: (nft: any) => void }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // ... existing code ...

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (max 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    // Calculate light angle
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);

    cardRef.current.style.setProperty('--rotate-x', `${rotateX}deg`);
    cardRef.current.style.setProperty('--rotate-y', `${rotateY}deg`);
    cardRef.current.style.setProperty('--mouse-angle', `${angle}deg`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--rotate-x', '0deg');
    cardRef.current.style.setProperty('--rotate-y', '0deg');
  }, []);

  return (
    <div
      ref={cardRef}
      className={`nft-card card-3d ${getRarityClass(nft.rarity || '')} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-card-id={tid}
    >
      {/* ... rest of card content ... */}
    </div>
  );
});
```

✅ **Result**: Cards tilt in 3D based on mouse position

---

## 🥇 TIER 3: HOLOGRAPHIC EFFECTS (30 min)

### Add to `app/globals.css`:

```css
/* Holographic rainbow effect */
@keyframes holographicShift {
  0%, 100% {
    background-position: 0% 50%;
    filter: hue-rotate(0deg);
  }
  50% {
    background-position: 100% 50%;
    filter: hue-rotate(180deg);
  }
}

.card-holographic {
  position: relative;
  overflow: hidden;
}

/* Rainbow gradient overlay */
.card-holographic::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background:
    repeating-linear-gradient(
      calc(var(--mouse-angle, 45deg) + 45deg),
      transparent 0px,
      rgba(255, 0, 255, 0.1) 10px,
      transparent 20px,
      rgba(0, 255, 255, 0.1) 30px,
      transparent 40px,
      rgba(255, 255, 0, 0.1) 50px,
      transparent 60px
    );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: 25;
  mix-blend-mode: screen;
}

.card-holographic:hover::before {
  opacity: 1;
}

/* Sparkle particles */
@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(180deg);
  }
}

.card-sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, white 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 35;
  animation: sparkle 2s ease-in-out infinite;
}

/* Rarity-specific particle effects */
.legendary-aura {
  position: absolute;
  inset: -4px;
  background:
    radial-gradient(
      circle at 30% 30%,
      rgba(251, 146, 60, 0.3) 0%,
      transparent 50%
    );
  filter: blur(10px);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1;
  pointer-events: none;
}

.card-holographic:hover .legendary-aura {
  opacity: 1;
  animation: holographicShift 3s linear infinite;
}

.mythic-aura {
  position: absolute;
  inset: -8px;
  background:
    radial-gradient(
      circle at 50% 50%,
      rgba(255, 215, 0, 0.4) 0%,
      rgba(255, 165, 0, 0.2) 30%,
      transparent 60%
    );
  filter: blur(15px);
  animation: holographicShift 2s linear infinite;
  z-index: 1;
  pointer-events: none;
}
```

### Enhanced NFTCard with particles:

```tsx
const NFTCard = memo(({ nft, selected, onSelect }: { nft: any; selected: boolean; onSelect: (nft: any) => void }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // ... existing state and functions ...

  const isLegendary = (nft.rarity || '').toLowerCase().includes('legend');
  const isMythic = (nft.rarity || '').toLowerCase().includes('mythic');

  return (
    <div
      ref={cardRef}
      className={`nft-card card-3d card-holographic ${getRarityClass(nft.rarity || '')} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-card-id={tid}
    >
      {/* Aura effects for rare cards */}
      {isLegendary && <div className="legendary-aura" />}
      {isMythic && <div className="mythic-aura" />}

      {/* Sparkle particles for mythic cards */}
      {isMythic && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card-sparkle"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Ring wrapper */}
      <div className={`rounded-lg ${
        selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
        'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
      }`}>
        <FoilCardEffect
          foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
          className="relative rounded-lg"
        >
          <div style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}} className="rounded-lg overflow-hidden">
            <img
              src={currentSrc}
              alt={`#${tid}`}
              className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none"
              loading="lazy"
              onError={() => { if (imgError < fallbacks.length - 1) setImgError(imgError + 1); }}
            />

            {/* Power badge with extra glow for high power */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3 pointer-events-none z-20">
              <div className="flex items-center justify-between">
                <span
                  className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}
                  style={{
                    textShadow: (nft.power || 0) > 100 ? '0 0 10px currentColor' : undefined
                  }}
                >
                  {nft.power || 0} PWR
                </span>
                {selected && (
                  <span className="text-vintage-gold text-2xl drop-shadow-lg font-bold animate-pulse">
                    ✓
                  </span>
                )}
              </div>
            </div>

            {/* Card info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pointer-events-none z-20">
              {nft.rarity && (
                <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-lg flex items-center gap-1">
                  {isMythic && <span className="text-yellow-400 animate-pulse">✦</span>}
                  {nft.rarity}
                  {isMythic && <span className="text-yellow-400 animate-pulse">✦</span>}
                </div>
              )}
              {nft.wear && (
                <div className="text-xs text-yellow-300 font-semibold drop-shadow-lg">
                  {nft.wear}
                </div>
              )}
            </div>
          </div>
        </FoilCardEffect>
      </div>
    </div>
  );
});
```

✅ **Result**: Premium holographic effects with particle systems

---

## 🎨 SELECTION ANIMATION

### Add to `app/globals.css`:

```css
/* Card selection animations */
@keyframes selectPop {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.15) rotate(3deg);
  }
  60% {
    transform: scale(0.95) rotate(-2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes selectionRipple {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.card-select-animation {
  animation: selectPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.selection-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 4px solid currentColor;
  border-radius: inherit;
  transform: translate(-50%, -50%) scale(0.8);
  opacity: 0;
  pointer-events: none;
  animation: selectionRipple 0.7s ease-out;
  z-index: 40;
}
```

### Update handleSelectCard in page.tsx:

```tsx
const handleSelectCard = useCallback((card: any) => {
  setSelectedCards(prev => {
    const isSelected = prev.find(c => c.tokenId === card.tokenId);

    if (isSelected) {
      if (soundEnabled) AudioManager.deselectCard();
      return prev.filter(c => c.tokenId !== card.tokenId);
    } else if (prev.length < HAND_SIZE) {
      if (soundEnabled) AudioManager.selectCard();

      // Visual feedback
      const cardElement = document.querySelector(`[data-card-id="${card.tokenId}"]`);
      if (cardElement) {
        // Add pop animation
        cardElement.classList.add('card-select-animation');

        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'selection-ripple';

        // Set ripple color based on rarity
        const rarity = (card.rarity || '').toLowerCase();
        if (rarity.includes('mythic')) {
          ripple.style.borderColor = '#FFD700';
          ripple.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        } else if (rarity.includes('legend')) {
          ripple.style.borderColor = '#FB923C';
          ripple.style.boxShadow = '0 0 15px rgba(251, 146, 60, 0.6)';
        } else if (rarity.includes('epic')) {
          ripple.style.borderColor = '#A855F7';
          ripple.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.6)';
        } else if (rarity.includes('rare')) {
          ripple.style.borderColor = '#3B82F6';
          ripple.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
        } else {
          ripple.style.borderColor = '#9CA3AF';
        }

        cardElement.appendChild(ripple);

        // Cleanup
        setTimeout(() => {
          cardElement.classList.remove('card-select-animation');
          ripple.remove();
        }, 700);
      }

      const newSelection = [...prev, card];

      // Auto-scroll on mobile when hand is full
      if (newSelection.length === HAND_SIZE) {
        setTimeout(() => {
          const battleButton = document.getElementById('battle-button');
          if (battleButton && window.innerWidth < 768) {
            battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Pulse the battle button
            battleButton.classList.add('animate-tutorial-pulse');
            setTimeout(() => {
              battleButton.classList.remove('animate-tutorial-pulse');
            }, 3000);
          }
        }, 300);
      }

      return newSelection;
    }
    return prev;
  });
}, [soundEnabled]);
```

✅ **Result**: Satisfying selection with rarity-colored ripples

---

## 📱 MOBILE OPTIMIZATION

### Add to `app/globals.css`:

```css
/* Disable expensive effects on mobile */
@media (max-width: 768px) {
  .card-3d {
    /* Disable 3D tilt on mobile */
    transform: none !important;
  }

  .card-3d:active {
    /* Simple scale on tap */
    transform: scale(0.95) !important;
  }

  .card-holographic::before,
  .legendary-aura,
  .mythic-aura {
    /* Reduce effects on mobile for performance */
    display: none;
  }

  .card-sparkle {
    /* Keep sparkles but reduce count (handle in component) */
    animation-duration: 3s; /* Slower animation */
  }

  /* Larger touch target */
  .nft-card {
    min-width: 80px;
    min-height: 120px;
  }
}

/* High-end devices can keep effects */
@media (min-width: 769px) and (hover: hover) {
  /* All effects enabled */
}
```

### Update sparkle count for mobile:

```tsx
{isMythic && (
  <>
    {Array.from({ length: window.innerWidth < 768 ? 3 : 6 }).map((_, i) => (
      <div
        key={i}
        className="card-sparkle"
        style={{
          top: `${20 + Math.random() * 60}%`,
          left: `${20 + Math.random() * 60}%`,
          animationDelay: `${i * 0.3}s`,
        }}
      />
    ))}
  </>
)}
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Tier 1 (5 min):
- [ ] Add basic hover CSS to globals.css
- [ ] Add rarity glow classes
- [ ] Update NFTCard with getRarityClass
- [ ] Test hover states
- [ ] Test rarity glows on different cards

### Tier 2 (15 min):
- [ ] Add 3D tilt CSS
- [ ] Add light reflection CSS
- [ ] Add useRef and mouse tracking to NFTCard
- [ ] Add handleMouseMove and handleMouseLeave
- [ ] Test tilt on desktop
- [ ] Verify no tilt on mobile

### Tier 3 (30 min):
- [ ] Add holographic CSS
- [ ] Add sparkle animation CSS
- [ ] Add aura effects CSS
- [ ] Update NFTCard with aura and sparkle elements
- [ ] Test on Legendary cards
- [ ] Test on Mythic cards
- [ ] Optimize particle count for mobile

### Selection Animation:
- [ ] Add selection CSS animations
- [ ] Update handleSelectCard with ripple logic
- [ ] Test selection feedback
- [ ] Test rarity-colored ripples
- [ ] Test on mobile

---

## 🎯 EXPECTED RESULTS

### Common Cards:
- Subtle gray glow
- Basic 3D tilt
- Simple selection ripple

### Rare Cards:
- Blue glow ring
- 3D tilt + light reflection
- Blue selection ripple

### Epic Cards:
- Purple glow ring
- 3D tilt + holographic overlay
- Purple selection ripple

### Legendary Cards:
- Orange glow ring
- 3D tilt + holographic + aura
- Orange selection ripple with extra glow

### Mythic Cards:
- **Golden pulsing glow**
- **3D tilt + rainbow holographic**
- **Animated aura**
- **6 sparkle particles**
- **Golden ripple with intense glow**
- **Power number glows**
- **Rarity label has stars**

---

## 🔥 FINAL NOTES

With all tiers implemented:
- Common cards look good
- Rare cards look premium
- Legendary cards look special
- **Mythic cards look LEGENDARY** ✨

Users will immediately recognize card value by visual effects.
The collection will feel like a premium card game, not an image gallery.

Total implementation time: **~50 minutes** for all tiers + selection.

Start with Tier 1 for quick results, then add Tier 2/3 when you have time!
