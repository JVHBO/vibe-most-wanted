import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const maxDuration = 30;

let fontData: ArrayBuffer | null = null;
let backgroundImageBase64: string | null = null;

// Farcaster Frames v2 size (3:2 aspect ratio)
const width = 1200;
const height = 800;

// Translations for labels
const gifTranslations: Record<string, {
  neynarScore: string;
  rarity: string;
  vibefidRank: string;
  globalRank: string;
  needMint: string;
}> = {
  en: {
    neynarScore: 'NEYNAR SCORE',
    rarity: 'Rarity:',
    vibefidRank: 'VibeFID Rank:',
    globalRank: 'Global Rank:',
    needMint: 'Need Mint',
  },
  'pt-BR': {
    neynarScore: 'NEYNAR SCORE',
    rarity: 'Raridade:',
    vibefidRank: 'Rank VibeFID:',
    globalRank: 'Rank Global:',
    needMint: 'Precisa Mintar',
  },
  es: {
    neynarScore: 'NEYNAR SCORE',
    rarity: 'Rareza:',
    vibefidRank: 'Rank VibeFID:',
    globalRank: 'Rank Global:',
    needMint: 'Necesita Mint',
  },
  ja: {
    neynarScore: 'NEYNARスコア',
    rarity: 'レアリティ:',
    vibefidRank: 'VibeFIDランク:',
    globalRank: 'グローバルランク:',
    needMint: 'ミント必要',
  },
  'zh-CN': {
    neynarScore: 'NEYNAR分数',
    rarity: '稀有度:',
    vibefidRank: 'VibeFID排名:',
    globalRank: '全球排名:',
    needMint: '需要铸造',
  },
  ru: {
    neynarScore: 'NEYNAR СЧЁТ',
    rarity: 'Редкость:',
    vibefidRank: 'Ранг VibeFID:',
    globalRank: 'Глобальный ранг:',
    needMint: 'Нужен Минт',
  },
  hi: {
    neynarScore: 'NEYNAR स्कोर',
    rarity: 'दुर्लभता:',
    vibefidRank: 'VibeFID रैंक:',
    globalRank: 'वैश्विक रैंक:',
    needMint: 'मिंट चाहिए',
  },
  fr: {
    neynarScore: 'SCORE NEYNAR',
    rarity: 'Rareté:',
    vibefidRank: 'Rang VibeFID:',
    globalRank: 'Rang Global:',
    needMint: 'Mint Requis',
  },
  id: {
    neynarScore: 'SKOR NEYNAR',
    rarity: 'Kelangkaan:',
    vibefidRank: 'Peringkat VibeFID:',
    globalRank: 'Peringkat Global:',
    needMint: 'Perlu Mint',
  },
};

// Helper to estimate global rank if OpenRank fails
function estimateGlobalRank(neynarScore: number): string {
  if (neynarScore >= 1.00) return 'Top 50';
  if (neynarScore >= 0.99) return 'Top 200';
  if (neynarScore >= 0.95) return 'Top 1k';
  if (neynarScore >= 0.90) return 'Top 2.5k';
  if (neynarScore >= 0.85) return 'Top 5k';
  if (neynarScore >= 0.80) return 'Top 10k';
  if (neynarScore >= 0.70) return 'Top 25k';
  if (neynarScore >= 0.60) return 'Top 50k';
  if (neynarScore >= 0.50) return 'Top 100k';
  return 'Top 50%';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fid: string }> }
) {
  const { fid } = await params;
  const fidNum = parseInt(fid);

  // Get language from query param
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') || 'en';
  const t = gifTranslations[lang] || gifTranslations['en'];

  try {
    // Load font
    if (!fontData) {
      const fontResponse = await fetch(
        'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
      );
      fontData = await fontResponse.arrayBuffer();
    }

    // Load background image from filesystem (cached in memory)
    if (!backgroundImageBase64) {
      try {
        const bgPath = join(process.cwd(), 'public', 'images', 'gif-background.png');
        const buffer = readFileSync(bgPath);
        backgroundImageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
      } catch (e) {
        console.log('Failed to load background image from filesystem');
      }
    }

    const convexUrl = "https://scintillating-mandrill-101.convex.cloud";
    const neynarApiKey = process.env.NEYNAR_API_KEY;

    // Fetch card data from Convex
    let cardData: any = null;
    const cardResponse = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'farcasterCards:getFarcasterCardByFid',
        args: { fid: fidNum },
        format: 'json',
      }),
    });

    if (cardResponse.ok) {
      const data = await cardResponse.json();
      cardData = data.value;
    }

    // Fetch VibeFID rank from Convex
    let vibefidRank: number | null = null;
    let totalCards: number = 0;
    try {
      const rankResponse = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'farcasterCards:getVibeFIDRank',
          args: { fid: fidNum },
          format: 'json',
        }),
      });
      if (rankResponse.ok) {
        const rankData = await rankResponse.json();
        vibefidRank = rankData.value?.rank;
        totalCards = rankData.value?.totalCards || 0;
      }
    } catch (e) {
      console.log('VibeFID rank fetch failed');
    }

    // Fetch global rank from OpenRank API
    let globalRank: number | null = null;
    let globalRankDisplay: string = '';
    try {
      const openRankResponse = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([fidNum]),
      });
      if (openRankResponse.ok) {
        const openRankData = await openRankResponse.json();
        const results = openRankData.result || openRankData;
        if (Array.isArray(results) && results.length > 0 && results[0].rank) {
          globalRank = results[0].rank;
          globalRankDisplay = `#${globalRank?.toLocaleString()}`;
        }
      }
    } catch (e) {
      console.log('OpenRank API fetch failed');
    }

    // Always fetch current score from Neynar API
    let neynarData: any = null;
    if (neynarApiKey) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          { headers: { api_key: neynarApiKey } }
        );
        if (neynarResponse.ok) {
          const data = await neynarResponse.json();
          const user = data.users?.[0];
          if (user) {
            const neynarScore = user.experimental?.neynar_user_score || 0;
            let neynarRarity = 'Common';
            if (neynarScore >= 0.99) neynarRarity = 'Mythic';
            else if (neynarScore >= 0.90) neynarRarity = 'Legendary';
            else if (neynarScore >= 0.79) neynarRarity = 'Epic';
            else if (neynarScore >= 0.70) neynarRarity = 'Rare';

            neynarData = {
              username: user.username,
              score: neynarScore,
              rarity: neynarRarity,
              pfpUrl: user.pfp_url,
            };

            // If OpenRank failed, use estimate based on score
            if (!globalRank) {
              globalRankDisplay = estimateGlobalRank(neynarScore);
            }
          }
        }
      } catch (e) {
        console.log('Neynar API fetch failed');
      }
    }

    const hasMinted = !!cardData;
    const username = cardData?.username || neynarData?.username || `FID ${fid}`;
    const displayName = cardData?.displayName || neynarData?.displayName || username;
    // Always use current Neynar score, fallback to card score if API fails
    const score = neynarData?.score ?? cardData?.neynarScore ?? 0;
    const rarity = neynarData?.rarity || cardData?.rarity || 'Common';
    const power = cardData?.power ?? 0;
    const foil = cardData?.foil || 'None';

    // Fallback for global rank estimate if still empty
    if (!globalRankDisplay) {
      globalRankDisplay = estimateGlobalRank(score);
    }

    const rarityColors: Record<string, string> = {
      Common: '#9ca3af',
      Rare: '#3B82F6',
      Epic: '#a855f7',
      Legendary: '#F59E0B',
      Mythic: '#EF4444',
    };
    const borderColor = rarityColors[rarity] || '#9ca3af';
    const gold = '#d4af37';

    // Fetch card image from IPFS
    let cardImageBase64 = '';
    const cardImageUrl = cardData?.cardImageUrl;

    if (cardImageUrl && cardImageUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        const imgResponse = await fetch(cardImageUrl, { signal: controller.signal });
        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          cardImageBase64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (e) {
        console.log('Failed to fetch card image');
      }
    }

    // Fetch PFP as fallback when no card
    let pfpImageBase64 = '';
    if (!hasMinted && neynarData?.pfpUrl) {
      try {
        const pfpResponse = await fetch(neynarData.pfpUrl);
        if (pfpResponse.ok) {
          const buffer = await pfpResponse.arrayBuffer();
          const contentType = pfpResponse.headers.get('content-type') || 'image/jpeg';
          pfpImageBase64 = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (e) {
        console.log('Failed to fetch PFP');
      }
    }

    // Card dimensions
    const cardWidth = 320;
    const cardHeight = 448;

    const svg = await satori(
      // @ts-ignore - satori accepts this format
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            width: '100%',
            height: '100%',
            position: 'relative',
            fontFamily: 'Inter',
          },
          children: [
            // Background image
            backgroundImageBase64 ? {
              type: 'img',
              props: {
                src: backgroundImageBase64,
                width: width,
                height: height,
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              },
            } : {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 50%, #1a1a2e 100%)',
                },
              },
            },
            // Outer gold border
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: `4px solid ${gold}`,
                },
              },
            },
            // Inner border
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  right: 8,
                  bottom: 8,
                  border: `1px solid ${gold}50`,
                },
              },
            },
            // Decorative line top
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 16,
                  left: 50,
                  width: width - 100,
                  height: 1,
                  backgroundColor: `${gold}60`,
                },
              },
            },
            // Decorative line bottom
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  bottom: 16,
                  left: 50,
                  width: width - 100,
                  height: 1,
                  backgroundColor: `${gold}60`,
                },
              },
            },
            // Main content
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  padding: 40,
                },
                children: [
                  // Left side - Card
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 380,
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              width: cardWidth,
                              height: cardHeight,
                              borderRadius: 12,
                              border: `4px solid ${borderColor}`,
                              overflow: 'hidden',
                              backgroundColor: '#1a1a2e',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 0 30px ${borderColor}40`,
                            },
                            children: cardImageBase64 ? [
                              {
                                type: 'img',
                                props: {
                                  src: cardImageBase64,
                                  width: cardWidth - 8,
                                  height: cardHeight - 8,
                                  style: {
                                    objectFit: 'cover',
                                  },
                                },
                              },
                            ] : pfpImageBase64 ? [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%',
                                    gap: 12,
                                  },
                                  children: [
                                    {
                                      type: 'img',
                                      props: {
                                        src: pfpImageBase64,
                                        width: 180,
                                        height: 180,
                                        style: {
                                          borderRadius: '50%',
                                          objectFit: 'cover',
                                          border: `3px solid ${borderColor}`,
                                        },
                                      },
                                    },
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          color: 'white',
                                          fontSize: 16,
                                          fontWeight: 600,
                                        },
                                        children: `@${username}`,
                                      },
                                    },
                                  ],
                                },
                              },
                            ] : [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    color: 'white',
                                    fontSize: 24,
                                  },
                                  children: `@${username}`,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  // Right side - Score info with dark background for contrast
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        flex: 1,
                        paddingLeft: 40,
                        paddingRight: 40,
                      },
                      children: [
                        // Dark background panel for readability
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              backgroundColor: 'rgba(0, 0, 0, 0.75)',
                              borderRadius: 16,
                              padding: '30px 40px',
                              border: `2px solid ${gold}`,
                            },
                            children: [
                              // Display Name
                              {
                                type: 'div',
                                props: {
                                  style: { color: '#ffffff', fontSize: 36, fontWeight: 700, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
                                  children: displayName,
                                },
                              },
                              // Username
                              {
                                type: 'div',
                                props: {
                                  style: { color: gold, fontSize: 20, marginTop: 4, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' },
                                  children: `@${username}`,
                                },
                              },
                              // Divider
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    width: '100%',
                                    height: 2,
                                    backgroundColor: `${gold}60`,
                                    marginTop: 16,
                                    marginBottom: 16,
                                  },
                                },
                              },
                              // Score label
                              {
                                type: 'div',
                                props: {
                                  style: { color: gold, fontSize: 18, fontWeight: 700, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' },
                                  children: t.neynarScore,
                                },
                              },
                              // Score value
                              {
                                type: 'div',
                                props: {
                                  style: { color: '#ffffff', fontSize: 56, fontWeight: 700, marginTop: 4, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
                                  children: score.toFixed(3),
                                },
                              },
                              // Rarity + Foil row
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    marginTop: 16,
                                    alignItems: 'center',
                                    gap: 12,
                                  },
                                  children: [
                                    // Rarity badge
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          color: borderColor,
                                          fontSize: 24,
                                          fontWeight: 700,
                                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                          padding: '6px 14px',
                                          backgroundColor: `${borderColor}30`,
                                          borderRadius: 6,
                                          border: `2px solid ${borderColor}`,
                                        },
                                        children: rarity.toUpperCase(),
                                      },
                                    },
                                    // Foil badge (if not None)
                                    foil !== 'None' ? {
                                      type: 'div',
                                      props: {
                                        style: {
                                          color: foil === 'Prize' ? '#fbbf24' : '#a78bfa',
                                          fontSize: 20,
                                          fontWeight: 700,
                                          padding: '6px 14px',
                                          backgroundColor: foil === 'Prize' ? 'rgba(251, 191, 36, 0.25)' : 'rgba(167, 139, 250, 0.25)',
                                          borderRadius: 6,
                                          border: `2px solid ${foil === 'Prize' ? '#fbbf24' : '#a78bfa'}`,
                                        },
                                        children: foil === 'Prize' ? '✨ PRIZE FOIL' : '✨ FOIL',
                                      },
                                    } : null,
                                  ],
                                },
                              },
                              // FID badge
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    marginTop: 20,
                                    color: gold,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    padding: '8px 16px',
                                    border: `2px solid ${gold}`,
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  },
                                  children: `FID #${fid}`,
                                },
                              },
                              // Need Mint badge
                              !hasMinted ? {
                                type: 'div',
                                props: {
                                  style: {
                                    marginTop: 12,
                                    color: '#ef4444',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    border: '2px solid #ef4444',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  },
                                  children: t.needMint,
                                },
                              } : {
                                type: 'div',
                                props: { style: { display: 'none' } },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        width,
        height,
        fonts: [
          {
            name: 'Inter',
            data: fontData!,
            weight: 400,
            style: 'normal' as const,
          },
        ],
      }
    );

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();

    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });

  } catch (e: any) {
    console.error('Image Error:', e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
