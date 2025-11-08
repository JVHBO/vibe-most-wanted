/**
 * Card Image Fallback Utilities
 *
 * Provides gradient fallbacks for cards without images (empty image strings from mock data)
 */

/**
 * Get rarity-based gradient background for card fallbacks
 */
export function getRarityGradient(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'mythic':
      return 'linear-gradient(135deg, #ff00ff 0%, #8b00ff 100%)';
    case 'legendary':
      return 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)';
    case 'epic':
      return 'linear-gradient(135deg, #9d4edd 0%, #5a189a 100%)';
    case 'rare':
      return 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)';
    case 'common':
      return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
    default:
      return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
  }
}

/**
 * Render card fallback with gradient background
 * Usage in JSX:
 *
 * {card.imageUrl ? (
 *   <img src={card.imageUrl} alt={card.name} className="..." />
 * ) : (
 *   <div style={{ background: getRarityGradient(card.rarity) }} className="...">
 *     <div className="text-white text-xs font-bold">{card.name}</div>
 *     <div className="text-white text-2xl font-bold">{card.power}</div>
 *   </div>
 * )}
 */
