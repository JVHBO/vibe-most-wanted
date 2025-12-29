/**
 * CHINESE LANGUAGE BOOST SYSTEM (Convex Backend)
 *
 * Players using Chinese language (zh-CN) receive a 5% boost on all coin rewards
 * as a tribute to the Social Credit System aesthetic.
 */

type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'hi' | 'ru' | 'zh-CN' | 'id' | 'fr' | 'ja' | 'it';

/**
 * Check if current language has boost enabled
 */
export function hasLanguageBoost(lang: SupportedLanguage): boolean {
  return lang === 'zh-CN';
}

/**
 * Apply language boost to coin reward
 * @param baseAmount - Base coin amount before boost
 * @param lang - Current language
 * @returns Amount with boost applied (if applicable)
 */
export function applyLanguageBoost(baseAmount: number, lang: SupportedLanguage): number {
  if (!hasLanguageBoost(lang)) {
    return baseAmount;
  }

  // 5% boost for Chinese language
  const boostedAmount = Math.floor(baseAmount * 1.05);

  console.log(`🇨🇳 Social Credit Boost Applied! ${baseAmount} → ${boostedAmount} (+5%)`);

  return boostedAmount;
}

/**
 * Get boost percentage for display
 */
export function getBoostPercentage(lang: SupportedLanguage): number {
  return hasLanguageBoost(lang) ? 5 : 0;
}

/**
 * Get boost multiplier
 */
export function getBoostMultiplier(lang: SupportedLanguage): number {
  return hasLanguageBoost(lang) ? 1.05 : 1.0;
}
