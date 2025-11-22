# Raid Boss Cards

This folder contains the boss card database for the Raid Boss mode.

## Boss Rotation

The game cycles through 20 bosses in this order:

1. **GM VBRS** (5 bosses): Common → Rare → Epic → Legendary → Mythic
2. **VBMS** (5 bosses): Common → Rare → Epic → Legendary → Mythic
3. **VibeFID** (5 bosses): Common → Rare → Epic → Legendary → Mythic
4. **AFCL** (5 bosses): Common → Rare → Epic → Legendary → Mythic

After boss #20, it loops back to boss #1.

## Boss HP by Rarity

- **Common**: 1,000,000 HP
- **Rare**: 5,000,000 HP
- **Epic**: 25,000,000 HP
- **Legendary**: 100,000,000 HP
- **Mythic**: 500,000,000 HP

## Adding Boss Card Images

### 1. Create the folder structure

```bash
mkdir -p public/images/raid-bosses/gmvbrs
mkdir -p public/images/raid-bosses/vibe
mkdir -p public/images/raid-bosses/vibefid
mkdir -p public/images/raid-bosses/afcl
```

### 2. Add images for each collection

Place the boss card images in the following structure:

```
public/images/raid-bosses/
├── gmvbrs/
│   ├── common.png
│   ├── rare.png
│   ├── epic.png
│   ├── legendary.png
│   └── mythic.png
├── vibe/
│   ├── common.png
│   ├── rare.png
│   ├── epic.png
│   ├── legendary.png
│   └── mythic.png
├── vibefid/
│   ├── common.png
│   ├── rare.png
│   ├── epic.png
│   ├── legendary.png
│   └── mythic.png
└── afcl/
    ├── common.png
    ├── rare.png
    ├── epic.png
    ├── legendary.png
    └── mythic.png
```

### 3. Update boss-cards.ts

After adding images, update the `boss-cards.ts` file with:
- Actual tokenIds (if using real NFT cards)
- Actual card names
- Actual card power values
- Optional: Update description/flavor text

## VBMS Bosses

**Note**: VBMS bosses should be fetched from JC's NFTs dynamically. The hardcoded values in `boss-cards.ts` are just placeholders for the initial setup.

## Current Status

⚠️ **TODO**: Need to add actual card images for:
- GM VBRS (all rarities)
- VibeFID (all rarities)
- AFCL (all rarities)

For cards that don't exist yet, please provide:
1. Card image
2. Rarity
3. Token ID (optional)
