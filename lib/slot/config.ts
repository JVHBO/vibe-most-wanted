export type SlotRarity =
  | "Special"
  | "Mythic"
  | "Legendary"
  | "Epic"
  | "Rare"
  | "Common";

export type SlotSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type SlotRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export type SlotCard = {
  baccarat: string;
  rarity: SlotRarity;
  suit?: SlotSuit;
  rank?: SlotRank;
  hasFoil?: boolean;
  wildcardLevel?: number;
  persistentWildcard?: boolean;
};

export type SlotCardDefinition = {
  baccarat: string;
  rarity: SlotRarity;
  weight: number;
};

// Suit/rank data from vmw-tcg-cards.json
export const SLOT_CARD_SUIT_RANK: Record<string, { suit: SlotSuit; rank: SlotRank }> = {
  "anon":             { suit: "hearts",   rank: "A" },
  "linda xied":       { suit: "diamonds", rank: "A" },
  "vitalik jumpterin":{ suit: "clubs",    rank: "A" },
  "jesse":            { suit: "spades",   rank: "A" },
  "rachel":           { suit: "hearts",   rank: "2" },
  "claude":           { suit: "diamonds", rank: "2" },
  "gozaru":           { suit: "clubs",    rank: "2" },
  "ink":              { suit: "spades",   rank: "2" },
  "casa":             { suit: "hearts",   rank: "3" },
  "groko":            { suit: "diamonds", rank: "3" },
  "rizkybegitu":      { suit: "clubs",    rank: "3" },
  "thosmur":          { suit: "spades",   rank: "3" },
  "brainpasta":       { suit: "hearts",   rank: "4" },
  "gaypt":            { suit: "diamonds", rank: "4" },
  "dan romero":       { suit: "clubs",    rank: "4" },
  "morlacos":         { suit: "spades",   rank: "4" },
  "landmine":         { suit: "hearts",   rank: "5" },
  "linux":            { suit: "diamonds", rank: "5" },
  "joonx":            { suit: "clubs",    rank: "5" },
  "don filthy":       { suit: "spades",   rank: "5" },
  "pooster":          { suit: "hearts",   rank: "6" },
  "john porn":        { suit: "diamonds", rank: "6" },
  "scum":             { suit: "clubs",    rank: "6" },
  "vlady":            { suit: "spades",   rank: "6" },
  "smolemaru":        { suit: "hearts",   rank: "7" },
  "ventra":           { suit: "diamonds", rank: "7" },
  "bradymck":         { suit: "clubs",    rank: "7" },
  "shills":           { suit: "spades",   rank: "7" },
  "betobutter":       { suit: "hearts",   rank: "8" },
  "qrcodo":           { suit: "diamonds", rank: "8" },
  "loground":         { suit: "clubs",    rank: "8" },
  "melted":           { suit: "spades",   rank: "8" },
  "sartocrates":      { suit: "hearts",   rank: "9" },
  "0xdeployer":       { suit: "diamonds", rank: "9" },
  "lombra jr":        { suit: "clubs",    rank: "9" },
  "vibe intern":      { suit: "spades",   rank: "9" },
  "jack the sniper":  { suit: "hearts",   rank: "10" },
  "beeper":           { suit: "diamonds", rank: "10" },
  "horsefarts":       { suit: "clubs",    rank: "10" },
  "jc denton":        { suit: "spades",   rank: "10" },
  "zurkchad":         { suit: "hearts",   rank: "J" },
  "slaterg":          { suit: "diamonds", rank: "J" },
  "brian armstrong":  { suit: "clubs",    rank: "J" },
  "nftkid":           { suit: "spades",   rank: "J" },
  "antonio":          { suit: "hearts",   rank: "Q" },
  "goofy romero":     { suit: "diamonds", rank: "Q" },
  "tukka":            { suit: "clubs",    rank: "Q" },
  "chilipepper":      { suit: "spades",   rank: "Q" },
  "miguel":           { suit: "hearts",   rank: "K" },
  "naughty santa":    { suit: "diamonds", rank: "K" },
  "ye":               { suit: "clubs",    rank: "K" },
  "nico":             { suit: "spades",   rank: "K" },
};

export const SLOT_RANK_ORDER: SlotRank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

export const SLOT_SUIT_EMOJI: Record<SlotSuit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export const SLOT_SUIT_COLOR: Record<SlotSuit, string> = {
  hearts: "#ef4444",
  diamonds: "#f97316",
  clubs: "#22c55e",
  spades: "#3b82f6",
};

export const SLOT_COLS = 5;
export const SLOT_ROWS = 3;
export const SLOT_TOTAL_CELLS = SLOT_COLS * SLOT_ROWS;

export const SLOT_SPIN_BASE_COST = 1;
export const SLOT_BET_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const SLOT_BONUS_COST_MULT = 20;
export const SLOT_BONUS_FREE_SPINS = 10;
export const SLOT_BONUS_FOIL_COUNT = 4;
export const SLOT_FREE_SPINS_PER_DAY = 10;
export const SLOT_WILDCARD_CARDS: string[] = [
  "dragukka",
  "neymar",
  "clawdmoltopenbot",
];

export const SLOT_BONUS_WILDCARD = "dragukka";

export const SLOT_DEV_ALLOWED_ADDRESSES = [
  "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52",
  "0x9604fb9a88daef5f38681d7518092bd2a8508a65",
  "0xe167bfc5c8f6167fdb7a6667122418e026a4ce26",
  "0x1d7d4da72a32b0ab37b92c773c15412381c7203a",
  "0xd453151b8f811186bbe7b9a62e6537cd68abca3d",
  "0x02d50610393e528c381420c868200eff50f167d7",
  "0xddc754417cae5cd97b00b8fc7fcbae5f573216dd",
  "0xcf60075a449dec39843309c74ff7693baa35b824",
  "0x247116c752420ec7fe870d1549a1c2e8d44675c6",
  "0x89b0e4670c44246cc9c2d86d04c34d91064311ed",
] as const;

export const SLOT_CARD_POOL: SlotCardDefinition[] = [
  { baccarat: "dragukka", rarity: "Special", weight: 5 },
  { baccarat: "neymar", rarity: "Special", weight: 5 },
  { baccarat: "clawdmoltopenbot", rarity: "Special", weight: 5 },
  { baccarat: "jesse", rarity: "Mythic", weight: 1 },
  { baccarat: "anon", rarity: "Mythic", weight: 1 },
  { baccarat: "linda xied", rarity: "Mythic", weight: 1 },
  { baccarat: "vitalik jumpterin", rarity: "Mythic", weight: 1 },
  { baccarat: "antonio", rarity: "Legendary", weight: 4 },
  { baccarat: "goofy romero", rarity: "Legendary", weight: 4 },
  { baccarat: "tukka", rarity: "Legendary", weight: 4 },
  { baccarat: "chilipepper", rarity: "Legendary", weight: 4 },
  { baccarat: "miguel", rarity: "Legendary", weight: 4 },
  { baccarat: "naughty santa", rarity: "Legendary", weight: 4 },
  { baccarat: "ye", rarity: "Legendary", weight: 4 },
  { baccarat: "nico", rarity: "Legendary", weight: 4 },
  { baccarat: "sartocrates", rarity: "Epic", weight: 10 },
  { baccarat: "0xdeployer", rarity: "Epic", weight: 10 },
  { baccarat: "lombra jr", rarity: "Epic", weight: 10 },
  { baccarat: "vibe intern", rarity: "Epic", weight: 10 },
  { baccarat: "jack the sniper", rarity: "Epic", weight: 10 },
  { baccarat: "beeper", rarity: "Epic", weight: 10 },
  { baccarat: "horsefarts", rarity: "Epic", weight: 10 },
  { baccarat: "jc denton", rarity: "Epic", weight: 10 },
  { baccarat: "zurkchad", rarity: "Epic", weight: 10 },
  { baccarat: "slaterg", rarity: "Epic", weight: 10 },
  { baccarat: "brian armstrong", rarity: "Epic", weight: 10 },
  { baccarat: "nftkid", rarity: "Epic", weight: 10 },
  { baccarat: "smolemaru", rarity: "Rare", weight: 20 },
  { baccarat: "ventra", rarity: "Rare", weight: 20 },
  { baccarat: "bradymck", rarity: "Rare", weight: 20 },
  { baccarat: "shills", rarity: "Rare", weight: 20 },
  { baccarat: "betobutter", rarity: "Rare", weight: 20 },
  { baccarat: "qrcodo", rarity: "Rare", weight: 20 },
  { baccarat: "loground", rarity: "Rare", weight: 20 },
  { baccarat: "melted", rarity: "Rare", weight: 20 },
  { baccarat: "rachel", rarity: "Common", weight: 35 },
  { baccarat: "claude", rarity: "Common", weight: 35 },
  { baccarat: "gozaru", rarity: "Common", weight: 35 },
  { baccarat: "ink", rarity: "Common", weight: 35 },
  { baccarat: "casa", rarity: "Common", weight: 35 },
  { baccarat: "groko", rarity: "Common", weight: 35 },
  { baccarat: "rizkybegitu", rarity: "Common", weight: 35 },
  { baccarat: "thosmur", rarity: "Common", weight: 35 },
  { baccarat: "brainpasta", rarity: "Common", weight: 35 },
  { baccarat: "gaypt", rarity: "Common", weight: 35 },
  { baccarat: "dan romero", rarity: "Common", weight: 35 },
  { baccarat: "morlacos", rarity: "Common", weight: 35 },
  { baccarat: "landmine", rarity: "Common", weight: 35 },
  { baccarat: "linux", rarity: "Common", weight: 35 },
  { baccarat: "joonx", rarity: "Common", weight: 35 },
  { baccarat: "don filthy", rarity: "Common", weight: 35 },
  { baccarat: "pooster", rarity: "Common", weight: 35 },
  { baccarat: "john porn", rarity: "Common", weight: 35 },
  { baccarat: "scum", rarity: "Common", weight: 35 },
  { baccarat: "vlady", rarity: "Common", weight: 35 },
] as const;

export const SLOT_CARD_LABELS: Record<string, string> = {
  dragukka: "Dragukka",
  jesse: "Jesse",
  anon: "Anon",
  "linda xied": "Linda Xied",
  "vitalik jumpterin": "Vitalik",
  antonio: "Antonio",
  "goofy romero": "Goofy Romero",
  tukka: "Tukka",
  chilipepper: "Chilli Pepper",
  miguel: "Miguel",
  "naughty santa": "Naughty Santa",
  ye: "Ye",
  nico: "Nico",
  sartocrates: "Sartocrates",
  "0xdeployer": "0xDeployer",
  "lombra jr": "Lombra Jr",
  "vibe intern": "Vibe Intern",
  "jack the sniper": "Jack Sniper",
  beeper: "Beeper",
  horsefarts: "Horsefarts",
  "jc denton": "JC Denton",
  zurkchad: "Zurkchad",
  slaterg: "Slaterg",
  "brian armstrong": "B. Armstrong",
  nftkid: "NFTKid",
  smolemaru: "Smolemaru",
  ventra: "Ventra",
  bradymck: "Bradymck",
  shills: "Shills",
  betobutter: "Betobutter",
  qrcodo: "Qrcodo",
  loground: "Loground",
  melted: "Melted",
  rachel: "Rachel",
  claude: "Claude",
  gozaru: "Gozaru",
  ink: "Ink",
  casa: "Casa",
  groko: "Groko",
  rizkybegitu: "Rizkybegitu",
  thosmur: "Thosmur",
  brainpasta: "Brainpasta",
  gaypt: "Gaypt",
  "dan romero": "Dan Romero",
  morlacos: "Morlacos",
  landmine: "Landmine",
  linux: "Linux",
  joonx: "Joonx",
  "don filthy": "Don Filthy",
  pooster: "Pooster",
  "john porn": "John Porn",
  scum: "Scum",
  vlady: "Vlady",
};

export const SLOT_RARITY_ORDER: SlotRarity[] = [
  "Special",
  "Mythic",
  "Legendary",
  "Epic",
  "Rare",
  "Common",
];

export const SLOT_RARITY_REWARD: Record<SlotRarity, number> = {
  Special: 220,
  Mythic: 140,
  Legendary: 80,
  Epic: 40,
  Rare: 20,
  Common: 10,
};

const SLOT_TOTAL_WEIGHT = SLOT_CARD_POOL.reduce((sum, card) => sum + card.weight, 0);

export function isSlotWildcardCard(card: Pick<SlotCard, "baccarat">): boolean {
  return card.baccarat === SLOT_BONUS_WILDCARD;
}

export function isDeveloperSlotAddress(address?: string | null): boolean {
  if (!address) return false;
  return SLOT_DEV_ALLOWED_ADDRESSES.includes(address.toLowerCase() as (typeof SLOT_DEV_ALLOWED_ADDRESSES)[number]);
}

export function getSlotLabel(name: string): string {
  return SLOT_CARD_LABELS[name] ?? name;
}

export function getSlotCardRarity(name: string): SlotRarity | null {
  if (name === SLOT_BONUS_WILDCARD) return "Special";
  const found = SLOT_CARD_POOL.find((card) => card.baccarat === name);
  return found?.rarity ?? null;
}

export function pickSlotCard(bonusWeightMultiplier = 1): SlotCardDefinition {
  const adjustedPool = SLOT_CARD_POOL.map((card) => ({
    ...card,
    adjustedWeight:
      card.rarity === "Mythic" || card.rarity === "Legendary"
        ? card.weight * bonusWeightMultiplier * 2
        : card.rarity === "Epic"
          ? card.weight * bonusWeightMultiplier * 1.5
          : card.weight,
  }));

  const totalWeight = adjustedPool.reduce((sum, card) => sum + card.adjustedWeight, 0);
  let random = Math.random() * totalWeight;

  for (const card of adjustedPool) {
    random -= card.adjustedWeight;
    if (random <= 0) return card;
  }

  return adjustedPool[0] ?? SLOT_CARD_POOL[0];
}

export function createSlotCard(input: SlotCard): SlotCard {
  const suitRank = SLOT_CARD_SUIT_RANK[input.baccarat];
  return {
    baccarat: input.baccarat,
    rarity: input.rarity,
    ...(suitRank ? { suit: suitRank.suit, rank: suitRank.rank } : {}),
    ...(input.suit ? { suit: input.suit } : {}),
    ...(input.rank ? { rank: input.rank } : {}),
    ...(input.hasFoil ? { hasFoil: true } : {}),
    ...(input.wildcardLevel ? { wildcardLevel: input.wildcardLevel } : {}),
    ...(input.persistentWildcard ? { persistentWildcard: true } : {}),
  };
}

export function getSlotCardSuit(name: string): SlotSuit | undefined {
  return SLOT_CARD_SUIT_RANK[name]?.suit;
}

export function getSlotCardRank(name: string): SlotRank | undefined {
  return SLOT_CARD_SUIT_RANK[name]?.rank;
}

export function getBasePoolProbability(name: string): number {
  const card = SLOT_CARD_POOL.find((entry) => entry.baccarat === name);
  if (!card) return 0;
  return card.weight / SLOT_TOTAL_WEIGHT;
}
