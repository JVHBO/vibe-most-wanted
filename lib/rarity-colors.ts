/**
 * Fonte única de verdade para cores de raridade.
 * Use RARITY_HEX / RARITY_SHADOW_HEX onde Tailwind não é aplicável
 * (canvas rendering, FloatingCardsBackground, inline SVG, OG images).
 *
 * Para Tailwind use as classes diretamente nos componentes:
 *   border-fuchsia-300  → Mythic
 *   border-yellow-400   → Legendary
 *   border-purple-400   → Epic
 *   border-blue-400     → Rare
 *   border-vintage-ice/50 → Common
 */

export const RARITY_HEX: Record<string, string> = {
  Mythic:    '#E879F9', // fuchsia-400 — iridescente, distinto do roxo Epic
  Legendary: '#FFD700', // vintage-gold
  Epic:      '#A855F7', // purple-500
  Rare:      '#3B82F6', // blue-500
  Common:    '#6B7280', // gray-500
};

export const RARITY_BORDER_HEX: Record<string, string> = {
  Mythic:    '#F0ABFC', // fuchsia-300 (mais claro, melhor contraste em dark)
  Legendary: '#FFD700',
  Epic:      '#A855F7',
  Rare:      '#3B82F6',
  Common:    '#6B7280',
};

/** Usado em FloatingCardsBackground.tsx e canvas renders */
export const RARITY_SHADOW_HEX: Record<string, string> = {
  Mythic:    '0 0 14px rgba(232,121,249,0.8), 0 0 28px rgba(168,85,247,0.4)',
  Legendary: '0 0 12px rgba(255,215,0,0.5)',
  Epic:      '0 0 8px rgba(168,85,247,0.5)',
  Rare:      '0 0 6px rgba(59,130,246,0.4)',
  Common:    'none',
};

/** Tailwind className para borda de raridade (use em card thumbnails) */
export const RARITY_BORDER_CLASS: Record<string, string> = {
  Mythic:    'border-fuchsia-300',
  Legendary: 'border-yellow-400',
  Epic:      'border-purple-400',
  Rare:      'border-blue-400',
  Common:    'border-vintage-ice/50',
};

/** Tailwind className para badge de raridade (bg + texto) */
export const RARITY_BADGE_CLASS: Record<string, string> = {
  Mythic:    'bg-fuchsia-600 text-white',
  Legendary: 'bg-orange-500 text-black',
  Epic:      'bg-purple-500 text-white',
  Rare:      'bg-blue-500 text-white',
  Common:    'bg-gray-500 text-white',
};
