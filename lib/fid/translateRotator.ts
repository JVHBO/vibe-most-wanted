/**
 * Translation via VibeFID Convex HTTP action
 *
 * All translation calls are routed through the VibeFID Convex server
 * (scintillating-mandrill-101.convex.site/translate) so the free-tier
 * rate limits apply to the server IP, not each individual user.
 *
 * The server rotates between: MyMemory → LibreTranslate → Lingva
 */

const CONVEX_TRANSLATE_URL = "https://scintillating-mandrill-101.convex.site/translate";

// Normalise fidTranslations codes (pt-BR → pt, zh-CN → zh)
function normLang(lang: string): string {
  const map: Record<string, string> = { "pt-BR": "pt", "zh-CN": "zh" };
  return map[lang] ?? lang.split("-")[0];
}

/**
 * Translate `text` to `targetLang`.
 * Returns null if the server is unreachable or all providers fail.
 */
export async function translateText(text: string, targetLang: string): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const res = await fetch(CONVEX_TRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang: normLang(targetLang) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translation ?? null;
  } catch {
    return null;
  }
}
