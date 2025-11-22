# 🐉 RAID BOSS MODE - TECHNICAL PLAN

## Overview
Raid Boss is a **global cooperative mode** where all players attack the same boss using AFK auto-attacking decks. Bosses have high HP and rotate in difficulty as they're defeated.

---

## 🎯 Core Features

### 1. Boss System
- **Global Boss**: All players attack the same boss simultaneously
- **Boss Rotation**: 20 bosses total (5 rarities × 4 collections), loops infinitely
  ```
  1-5:   GM VBRS (Common → Rare → Epic → Legendary → Mythic)
  6-10:  VBMS (Common → Rare → Epic → Legendary → Mythic)
  11-15: VIBEFID (Common → Rare → Epic → Legendary → Mythic)
  16-20: AFCL (Common → Rare → Epic → Legendary → Mythic)
  Then loops back to GM VBRS Common
  ```
- **Boss Cards Source**: Use JC's NFTs from `JC_CONTRACT_ADDRESS` (same as PvE difficulty system)
  - Filter by collection and rarity
  - Select random card matching tier + collection
  - If no match found, use any card from collection
- **HP Per Tier**:
  ```typescript
  const BOSS_HP = {
    common: 1_000_000,      // 1M HP
    rare: 5_000_000,        // 5M HP
    epic: 25_000_000,       // 25M HP
    legendary: 100_000_000, // 100M HP
    mythic: 500_000_000     // 500M HP
  };
  ```
- **Visual**: Boss card image displayed large in modal

### 2. Card Energy System
- **Energy Cost**: Each card consumes energy per attack
- **Cooldown**: Cards attack every 5 minutes when energy available
- **Depletion**: Cards become exhausted (0 energy) and can't attack
- **Refuel**: Spend VBMS (real blockchain token) to refuel cards - TX to pool contract
- **No Duplicates**: Can't reuse exhausted cards until refueled

### 3. Attack Deck
- **Entry Fee**: 5 VBMS (real token) to set raid deck (TX to pool)
- Players select 5 cards for their raid deck
- Deck attacks automatically every 5 minutes
- Each card deals damage = card power
- Total deck damage per cycle = sum of all 5 cards' power
- **Economy**: Spend VBMS (real blockchain token), earn $TESTVBMS (in-game currency)

### 4. Rewards System
- **Contribution-Based**: Rewards based on % of total damage dealt
- **Distribution**: When boss dies, all contributors get $TESTVBMS
- **Formula**: `playerReward = totalRewardPool × (playerDamage / totalBossDamage)`

### 5. Social Sharing
- Share on Farcaster after setting raid deck
- Generated image showing:
  - Current boss (card image)
  - Player's raid deck power
  - Message: "Join me in this raid!"
- Similar to existing battle shares

---

## 📊 DATABASE SCHEMA (Convex)

### New Tables

#### `raidBosses`
```typescript
raidBosses: defineTable({
  // Boss Info
  bossId: v.string(), // "boss_1", "boss_2", etc.
  tier: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary"),
    v.literal("mythic")
  ),

  // Boss Card (from game collections)
  cardTokenId: v.string(), // Token ID of the card used as boss
  cardName: v.string(),
  cardImageUrl: v.string(),
  cardRarity: v.string(),
  cardCollection: v.string(), // "vibe", "vibefid", etc.

  // HP
  maxHp: v.number(), // Starting HP (1M, 5M, 25M, 100M)
  currentHp: v.number(), // Current HP remaining

  // Status
  status: v.union(
    v.literal("active"), // Currently being attacked
    v.literal("defeated"), // Boss defeated
    v.literal("upcoming") // Next boss in queue
  ),

  // Reward Pool
  rewardPool: v.number(), // Total $TESTVBMS to distribute
  rewardsDistributed: v.boolean(), // If rewards were sent

  // Stats
  totalDamage: v.number(), // Total damage dealt by all players
  participantCount: v.number(), // Number of unique attackers

  // Timestamps
  createdAt: v.number(),
  defeatedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()), // Auto-skip if no progress
})
  .index("by_status", ["status", "createdAt"])
  .index("by_tier", ["tier"])
```

#### `raidParticipants`
```typescript
raidParticipants: defineTable({
  bossId: v.string(), // Which boss
  playerAddress: v.string(),
  playerUsername: v.string(),

  // Deck
  attackDeck: v.array(v.object({
    tokenId: v.string(),
    power: v.number(),
    imageUrl: v.string(),
    rarity: v.string(),
    collection: v.string(),
  })),

  // Stats
  totalDamage: v.number(), // Total damage dealt to this boss
  attackCount: v.number(), // Number of attacks performed
  lastAttackAt: v.number(), // Last attack timestamp

  // Rewards
  rewardEarned: v.optional(v.number()), // $TESTVBMS earned when boss defeated
  rewardClaimed: v.boolean(),
  claimedAt: v.optional(v.number()),

  // Metadata
  joinedAt: v.number(), // When player joined this raid
})
  .index("by_boss", ["bossId", "totalDamage"]) // Leaderboard
  .index("by_player", ["playerAddress", "bossId"])
  .index("by_player_active", ["playerAddress", "rewardClaimed"])
```

#### `raidAttacks`
```typescript
raidAttacks: defineTable({
  bossId: v.string(),
  playerAddress: v.string(),

  // Attack Details
  damage: v.number(), // Total damage this attack
  cardsUsed: v.array(v.object({
    tokenId: v.string(),
    power: v.number(),
  })),

  // Auto-Attack
  isAutomatic: v.boolean(), // true for scheduled attacks, false for manual

  timestamp: v.number(),
})
  .index("by_boss", ["bossId", "timestamp"])
  .index("by_player", ["playerAddress", "timestamp"])
```

#### `raidCardEnergy`
```typescript
raidCardEnergy: defineTable({
  playerAddress: v.string(),
  cardTokenId: v.string(),
  collection: v.string(), // "vibe", "vibefid", etc.

  // Energy System
  energy: v.number(), // Current energy (0-100)
  maxEnergy: v.number(), // Max energy capacity (100)

  // Cooldown
  lastAttackAt: v.optional(v.number()), // Last time this card attacked
  nextAttackAt: v.optional(v.number()), // When card can attack again (5 min)

  // Refuel
  lastRefuelAt: v.optional(v.number()),
  refuelCount: v.number(), // Lifetime refuels

  // State
  isExhausted: v.boolean(), // true when energy = 0
  isEquipped: v.boolean(), // true if in current raid deck

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_player", ["playerAddress"])
  .index("by_player_card", ["playerAddress", "cardTokenId"])
  .index("by_next_attack", ["nextAttackAt"]) // For cron job
  .index("by_exhausted", ["isExhausted"])
```

---

## 🔧 BACKEND IMPLEMENTATION

### Convex Functions

#### 1. Boss Management (`convex/raidBoss.ts`)

```typescript
// Get current active boss
export const getCurrentBoss = query(async (ctx) => {
  // Return active boss or create new one if none exists
});

// Create next boss (when current defeated)
export const createNextBoss = mutation(async (ctx) => {
  // 1. Get next boss config from rotation
  const bossConfig = await getNextBossConfig();
  // { collection: 'gmvbrs', rarity: 'Common' }

  // 2. Select card from JC's NFTs
  const bossCard = await selectBossCard({
    collection: bossConfig.collection,
    rarity: bossConfig.rarity
  });

  // 3. Calculate HP based on rarity tier
  const tier = bossConfig.rarity.toLowerCase();
  const maxHp = BOSS_HP[tier];

  // 4. Set reward pool based on tier
  const rewardPool = BOSS_REWARDS[tier];

  // 5. Create boss record
  await ctx.db.insert("raidBosses", {
    bossId: `boss_${Date.now()}`,
    tier: tier,
    cardTokenId: bossCard.tokenId,
    cardName: bossCard.name,
    cardImageUrl: bossCard.imageUrl,
    cardRarity: bossConfig.rarity,
    cardCollection: bossConfig.collection,
    maxHp: maxHp,
    currentHp: maxHp,
    status: "active",
    rewardPool: rewardPool,
    rewardsDistributed: false,
    totalDamage: 0,
    participantCount: 0,
    createdAt: Date.now(),
  });
});

// Update boss HP (subtract damage)
export const damageBoss = mutation(async (ctx, args: {
  bossId: string,
  damage: number,
  playerAddress: string
}) => {
  // 1. Subtract HP from boss
  // 2. Update participant stats
  // 3. Check if boss defeated
  // 4. If defeated, trigger rewards distribution
});

// Distribute rewards when boss defeated
export const distributeRewards = mutation(async (ctx, args: {
  bossId: string
}) => {
  // 1. Get all participants sorted by damage
  // 2. Calculate % contribution for each
  // 3. Distribute $TESTVBMS proportionally
  // 4. Send to inbox (correio)
  // 5. Send notifications
});
```

#### 2. Player Actions (`convex/raidBoss.ts`)

```typescript
// Set raid deck (requires 5 VBMS entry fee)
export const setRaidDeck = mutation(async (ctx, args: {
  playerAddress: string,
  cards: Card[],
  txHash: string // Proof of 5 VBMS payment to pool
}) => {
  // 1. Verify TX (5 VBMS sent to pool contract)
  // 2. Validate cards (owned, have energy)
  // 3. Mark cards as equipped
  // 4. Create/update participant record
  // 5. Initialize card energy (100 per card)
  // 6. Start auto-attack timer
  // 7. Record entry fee payment
});

// Manual attack (instant attack, consumes energy)
export const manualAttack = mutation(async (ctx, args: {
  playerAddress: string
}) => {
  // 1. Get player's raid deck
  // 2. Check card energy
  // 3. Deal damage = sum of card powers
  // 4. Consume card energy
  // 5. Update boss HP
  // 6. Record attack
});

// Refuel card energy
export const refuelCardEnergy = mutation(async (ctx, args: {
  playerAddress: string,
  cardTokenId: string,
  txHash: string // Proof of VBMS payment
}) => {
  // 1. Verify TX (sent VBMS to pool)
  // 2. Restore card energy to 100
  // 3. Mark as not exhausted
  // 4. Record refuel transaction
});
```

#### 3. Auto-Attack System (`convex/crons.ts`)

```typescript
// Scheduled function - runs every 5 minutes
export const processRaidAttacks = mutation(async (ctx) => {
  const now = Date.now();

  // 1. Get all cards where nextAttackAt <= now
  const readyCards = await ctx.db
    .query("raidCardEnergy")
    .withIndex("by_next_attack")
    .filter((q) => q.lte(q.field("nextAttackAt"), now))
    .collect();

  // 2. Group by player
  // 3. For each player deck ready:
  //    - Calculate damage
  //    - Update boss HP
  //    - Consume card energy
  //    - Set next attack time (+5 min)
  //    - Record attack
});
```

#### 4. Card Selection (`convex/raidBoss.ts`)

```typescript
// Boss rotation logic
const BOSS_ROTATION = [
  { collection: 'gmvbrs', rarity: 'Common' },
  { collection: 'gmvbrs', rarity: 'Rare' },
  { collection: 'gmvbrs', rarity: 'Epic' },
  { collection: 'gmvbrs', rarity: 'Legendary' },
  { collection: 'gmvbrs', rarity: 'Mythic' },
  { collection: 'vibe', rarity: 'Common' },
  { collection: 'vibe', rarity: 'Rare' },
  { collection: 'vibe', rarity: 'Epic' },
  { collection: 'vibe', rarity: 'Legendary' },
  { collection: 'vibe', rarity: 'Mythic' },
  { collection: 'vibefid', rarity: 'Common' },
  { collection: 'vibefid', rarity: 'Rare' },
  { collection: 'vibefid', rarity: 'Epic' },
  { collection: 'vibefid', rarity: 'Legendary' },
  { collection: 'vibefid', rarity: 'Mythic' },
  { collection: 'americanfootball', rarity: 'Common' },
  { collection: 'americanfootball', rarity: 'Rare' },
  { collection: 'americanfootball', rarity: 'Epic' },
  { collection: 'americanfootball', rarity: 'Legendary' },
  { collection: 'americanfootball', rarity: 'Mythic' },
];

// Get next boss in rotation
export const getNextBossConfig = query(async (ctx) => {
  // Get total bosses defeated count
  const allBosses = await ctx.db.query("raidBosses").collect();
  const defeatedCount = allBosses.filter(b => b.status === "defeated").length;

  // Rotation index (loops every 20 bosses)
  const rotationIndex = defeatedCount % 20;

  return BOSS_ROTATION[rotationIndex];
});

// Select card for boss from JC's collection
export const selectBossCard = mutation(async (ctx, args: {
  collection: CollectionId,
  rarity: CardRarity
}) => {
  // 1. Fetch JC's NFTs from Alchemy
  // 2. Filter by collection AND rarity
  // 3. If matches found, pick random
  // 4. If no matches, pick any card from collection
  // 5. Return card data (tokenId, imageUrl, name, power)
});
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Raid Boss Modal (`components/RaidBossModal.tsx`)

```typescript
interface RaidBossModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoss: Boss | null;
  userNfts: NFT[];
  userProfile: UserProfile | null;
}

// Features:
// - Boss display (card image, HP bar, stats)
// - Deck builder (select 5 cards)
// - Energy indicators on cards
// - Damage leaderboard (top contributors)
// - Auto-attack timer display
// - Refuel button (with cost)
// - Share button
```

### 2. Components Structure

```
components/
├── RaidBossModal.tsx          # Main modal
├── RaidBossDisplay.tsx        # Boss HP, image, stats
├── RaidDeckBuilder.tsx        # Deck selection interface
├── RaidLeaderboard.tsx        # Damage contribution leaderboard
├── RaidCardEnergyBar.tsx      # Energy indicator on cards
└── RaidShareImage.tsx         # Share image generator
```

### 3. State Management

```typescript
// In app/page.tsx or context
const [currentBoss, setCurrentBoss] = useState<Boss | null>(null);
const [raidDeck, setRaidDeck] = useState<Card[]>([]);
const [cardEnergies, setCardEnergies] = useState<Map<string, number>>(new Map());
const [showRaidBossModal, setShowRaidBossModal] = useState(false);
const [raidParticipation, setRaidParticipation] = useState<RaidParticipant | null>(null);
```

---

## 🖼️ SHARE IMAGE GENERATION

### Share Image Template (`lib/raid-share-image.ts`)

```typescript
export async function generateRaidShareImage({
  boss: {
    cardName: string,
    cardImageUrl: string,
    tier: string,
    currentHp: number,
    maxHp: number
  },
  player: {
    username: string,
    deckPower: number,
    totalDamage: number
  }
}): Promise<string> {
  // Use same pattern as existing share images
  // Canvas API or html2canvas

  // Layout:
  // - Boss card image (large, center)
  // - Boss HP bar
  // - Player deck power
  // - Text: "JOIN ME IN THIS RAID!"
  // - Username

  // Return base64 or upload to storage
}
```

### Farcaster Share (`lib/farcaster-raid-share.ts`)

```typescript
export async function shareRaidBoss({
  bossId: string,
  playerAddress: string,
  deckPower: number
}) {
  // 1. Generate share image
  const imageUrl = await generateRaidShareImage({...});

  // 2. Create Farcaster cast
  const text = `⚔️ Join me attacking the ${boss.tier.toUpperCase()} boss!\n\nMy deck power: ${deckPower}\n\nPlay now: ${APP_URL}/raid`;

  // 3. Post via Farcaster API
  // 4. Award share bonus (similar to existing shares)
}
```

---

## 💰 ECONOMY INTEGRATION

### Entry Fee (VBMS - Real Blockchain Token)

```typescript
// Entry fee to join raid
const RAID_ENTRY_FEE = 5; // 5 VBMS

// Payment flow:
// 1. Player selects 5 cards
// 2. Clicks "Start Raid"
// 3. Wallet prompts TX: Send 5 VBMS to pool
// 4. Wait for TX confirmation
// 5. Call setRaidDeck mutation with txHash
// 6. Deck activated, auto-attacks begin
```

### Energy Refuel Cost (VBMS - Real Blockchain Token)

```typescript
// Energy refuel pricing (in VBMS - real blockchain token)
const REFUEL_COST = {
  perCard: 1,   // 1 VBMS per card
  bulk5: 4,     // 20% discount for refueling all 5 cards (4 VBMS instead of 5)
};

// Payment flow:
// 1. Player clicks "Refuel Card"
// 2. Modal shows cost in VBMS
// 3. Wallet prompts TX: Send VBMS to pool
// 4. Wait for TX confirmation
// 5. Call Convex mutation with txHash
// 6. Energy restored to 100
```

### Reward Distribution

```typescript
// Reward pool calculation
const BOSS_REWARDS = {
  common: 10000,      // 10k $TESTVBMS
  rare: 50000,        // 50k
  epic: 250000,       // 250k
  legendary: 1000000, // 1M
  mythic: 5000000     // 5M
};

// Distribution formula
playerReward = (rewardPool × playerDamage) / totalBossDamage
```

---

## ⚡ CRON JOBS

### Add to `convex/crons.ts`

```typescript
export default cronJobs();

cronJobs.interval(
  "process-raid-attacks",
  { minutes: 5 }, // Every 5 minutes
  internal.raidBoss.processRaidAttacks
);

cronJobs.interval(
  "check-boss-timeout",
  { hours: 1 }, // Check hourly
  internal.raidBoss.checkBossTimeout // Auto-skip inactive bosses
);
```

---

## 🎮 USER FLOW

### 1. Entering Raid Boss Mode
```
Player clicks "Raid Boss" button
↓
Modal opens showing current boss
↓
Player selects 5 cards for deck
↓
Cards with energy > 0 are available
↓
Player clicks "Start Raid" (5 VBMS required)
↓
Wallet prompts: Send 5 VBMS to pool
↓
Player confirms transaction
↓
Wait for TX confirmation
↓
Deck saved, auto-attacks enabled
```

### 2. Auto-Attacking
```
Every 5 minutes (cron):
↓
For each player with active raid deck:
  ↓
  Check if cards have energy
  ↓
  If yes: Deal damage, consume energy
  ↓
  If no: Skip attack (exhausted)
↓
Update boss HP
↓
If boss HP = 0: Trigger rewards
```

### 3. Boss Defeated
```
Boss HP reaches 0
↓
Calculate contribution % for all players
↓
Distribute rewards to inbox
↓
Send notifications
↓
Spawn next tier boss
↓
Reset all raid decks (players must re-join)
```

### 4. Refueling Energy
```
Player's cards exhausted
↓
Click "Refuel" on card
↓
Wallet prompts: Pay 1 VBMS per card (TX to pool)
↓
Player confirms transaction
↓
Wait for TX confirmation
↓
Card energy restored to 100
```

---

## 📱 UI/UX MOCKUP

### Raid Boss Modal Layout

```
╔══════════════════════════════════════╗
║  🐉 RAID BOSS - EPIC TIER            ║
╠══════════════════════════════════════╣
║                                      ║
║     [BOSS CARD IMAGE - LARGE]        ║
║                                      ║
║  HP: [████████░░] 750k / 1M          ║
║                                      ║
║  Contributors: 1,247 players         ║
║  Total Damage: 250,000               ║
║  Reward Pool: 250,000 $TESTVBMS      ║
║                                      ║
╠══════════════════════════════════════╣
║  YOUR RAID DECK (Select 5 cards)     ║
╠══════════════════════════════════════╣
║                                      ║
║  [Card] [Card] [Card] [Card] [Card]  ║
║   ⚡80%  ⚡60%  ⚡40%  ⚡20%  ⚡0%      ║
║                                      ║
║  Deck Power: 850                     ║
║  Next Attack: 3:45 remaining         ║
║                                      ║
║  [ START RAID ]  [ REFUEL ALL ]      ║
║  [ SHARE RAID ]                      ║
║                                      ║
╠══════════════════════════════════════╣
║  TOP CONTRIBUTORS                    ║
╠══════════════════════════════════════╣
║  1. PlayerX     125,000 dmg (50%)    ║
║  2. PlayerY      62,500 dmg (25%)    ║
║  3. PlayerZ      31,250 dmg (12.5%)  ║
║  ...                                 ║
╚══════════════════════════════════════╝
```

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Core Backend (3-4 hours)
- [ ] Add schema tables to `convex/schema.ts`
- [ ] Create `convex/raidBoss.ts` with boss management
- [ ] Implement damage calculation and HP updates
- [ ] Add reward distribution logic
- [ ] Test with manual attacks

### Phase 2: Energy System (2-3 hours)
- [ ] Implement card energy tracking
- [ ] Create refuel mutation (with TX verification)
- [ ] Add energy checks to attack flow
- [ ] Test energy depletion and refuel

### Phase 3: Auto-Attack Cron (2 hours)
- [ ] Add cron job to `convex/crons.ts`
- [ ] Implement 5-minute scheduled attacks
- [ ] Test automatic damage dealing
- [ ] Add logging for monitoring

### Phase 4: Frontend UI (4-5 hours)
- [ ] Create `RaidBossModal.tsx`
- [ ] Build deck selection interface
- [ ] Add energy bars to cards
- [ ] Implement boss display with HP bar
- [ ] Add leaderboard component
- [ ] Test full user flow

### Phase 5: Share Integration (2 hours)
- [ ] Create share image generator
- [ ] Implement Farcaster posting
- [ ] Add share button to modal
- [ ] Test share flow

### Phase 6: Polish & Testing (2-3 hours)
- [ ] Add animations (HP bar, attacks)
- [ ] Implement notifications
- [ ] Test edge cases (boss defeated during attack, etc.)
- [ ] Add error handling
- [ ] Performance optimization

---

## 🎯 SUCCESS METRICS

- **Engagement**: % of daily active users participating
- **Retention**: Players returning to refuel and re-engage
- **Economy**: $TESTVBMS burned via refuels vs distributed via rewards
- **Social**: Shares to Farcaster driving new players

---

## 🔮 FUTURE ENHANCEMENTS

- **Boss Variants**: Special event bosses with unique rewards
- **Team Raids**: Guild/clan system for coordinated attacks
- **Boss Abilities**: Bosses that heal, shield, or counter-attack
- **Card Synergies**: Bonus damage for using cards from same collection
- **Leaderboard Rewards**: Extra rewards for top 10 contributors
- **NFT Drops**: Rare NFTs as boss loot (1% drop chance)

---

**Total Estimated Development Time**: 15-20 hours

**Ready to start implementing?** 🚀
