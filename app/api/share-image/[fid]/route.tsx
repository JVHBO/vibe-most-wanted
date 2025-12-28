import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Translations for share image
const translations: Record<string, {
  criminalRecord: string;
  wantedFor: string;
  dangerLevel: string;
  lastSeen: string;
  warningCaution: string;
}> = {
  en: {
    criminalRecord: 'CRIMINAL RECORD',
    wantedFor: 'WANTED FOR',
    dangerLevel: 'DANGER LEVEL',
    lastSeen: 'LAST SEEN',
    warningCaution: '⚠️ APPROACH WITH EXTREME CAUTION ⚠️',
  },
  'pt-BR': {
    criminalRecord: 'FICHA CRIMINAL',
    wantedFor: 'PROCURADO POR',
    dangerLevel: 'NÍVEL DE PERIGO',
    lastSeen: 'VISTO POR ÚLTIMO',
    warningCaution: '⚠️ APROXIME-SE COM EXTREMA CAUTELA ⚠️',
  },
  es: {
    criminalRecord: 'FICHA CRIMINAL',
    wantedFor: 'BUSCADO POR',
    dangerLevel: 'NIVEL DE PELIGRO',
    lastSeen: 'VISTO POR ÚLTIMA VEZ',
    warningCaution: '⚠️ ACÉRQUESE CON EXTREMA PRECAUCIÓN ⚠️',
  },
  ja: {
    criminalRecord: '犯罪記録',
    wantedFor: '指名手配理由',
    dangerLevel: '危険度',
    lastSeen: '最後の目撃情報',
    warningCaution: '⚠️ 細心の注意を払ってください ⚠️',
  },
  'zh-CN': {
    criminalRecord: '犯罪记录',
    wantedFor: '通缉原因',
    dangerLevel: '危险等级',
    lastSeen: '最后出现',
    warningCaution: '⚠️ 请极度谨慎 ⚠️',
  },
  ru: {
    criminalRecord: 'КРИМИНАЛЬНОЕ ДОСЬЕ',
    wantedFor: 'РАЗЫСКИВАЕТСЯ ЗА',
    dangerLevel: 'УРОВЕНЬ ОПАСНОСТИ',
    lastSeen: 'ПОСЛЕДНИЙ РАЗ ЗАМЕЧЕН',
    warningCaution: '⚠️ СОБЛЮДАЙТЕ КРАЙНЮЮ ОСТОРОЖНОСТЬ ⚠️',
  },
  hi: {
    criminalRecord: 'आपराधिक रिकॉर्ड',
    wantedFor: 'वांछित',
    dangerLevel: 'खतरे का स्तर',
    lastSeen: 'आखिरी बार देखा गया',
    warningCaution: '⚠️ अत्यधिक सावधानी से संपर्क करें ⚠️',
  },
  fr: {
    criminalRecord: 'CASIER JUDICIAIRE',
    wantedFor: 'RECHERCHÉ POUR',
    dangerLevel: 'NIVEAU DE DANGER',
    lastSeen: 'DERNIÈRE APPARITION',
    warningCaution: '⚠️ APPROCHER AVEC EXTRÊME PRUDENCE ⚠️',
  },
  id: {
    criminalRecord: 'CATATAN KRIMINAL',
    wantedFor: 'DICARI KARENA',
    dangerLevel: 'TINGKAT BAHAYA',
    lastSeen: 'TERAKHIR TERLIHAT',
    warningCaution: '⚠️ DEKATI DENGAN SANGAT HATI-HATI ⚠️',
  },
};

// Generate crime based on language
function generateCrime(rarity: string, lang: string): string {
  const crimes: Record<string, Record<string, string[]>> = {
    en: {
      Mythic: ['World-class Meme Warfare', 'Legendary Shitposting', 'Galaxy-brain Market Manipulation'],
      Legendary: ['High-stakes NFT Fraud', 'Elite Social Engineering', 'Master Token Sniping'],
      Epic: ['Advanced Rug Pulling', 'Professional FUD Spreading', 'Organized Pump & Dump'],
      Rare: ['Minor Airdrop Farming', 'Basic Sybil Attacks', 'Amateur Wash Trading'],
      Common: ['Excessive GM Posting', 'Chronic Reply Guying', 'Serial Like Farming'],
    },
    'pt-BR': {
      Mythic: ['Guerra de Memes de Classe Mundial', 'Shitposting Lendário', 'Manipulação de Mercado Genial'],
      Legendary: ['Fraude de NFT de Alto Risco', 'Engenharia Social Elite', 'Sniper de Token Mestre'],
      Epic: ['Rug Pull Avançado', 'Espalhamento Profissional de FUD', 'Pump & Dump Organizado'],
      Rare: ['Farming de Airdrop Menor', 'Ataques Sybil Básicos', 'Wash Trading Amador'],
      Common: ['Postagem Excessiva de GM', 'Reply Guy Crônico', 'Farming de Likes Serial'],
    },
    es: {
      Mythic: ['Guerra de Memes de Clase Mundial', 'Shitposting Legendario', 'Manipulación de Mercado Genial'],
      Legendary: ['Fraude de NFT de Alto Riesgo', 'Ingeniería Social Elite', 'Sniper de Token Maestro'],
      Epic: ['Rug Pull Avanzado', 'Difusión Profesional de FUD', 'Pump & Dump Organizado'],
      Rare: ['Farming de Airdrop Menor', 'Ataques Sybil Básicos', 'Wash Trading Amateur'],
      Common: ['Publicación Excesiva de GM', 'Reply Guy Crónico', 'Farming de Likes Serial'],
    },
    ja: {
      Mythic: ['世界クラスのミーム戦争', '伝説のシットポスティング', '天才的な市場操作'],
      Legendary: ['ハイステークスNFT詐欺', 'エリートソーシャルエンジニアリング', 'マスタートークンスナイピング'],
      Epic: ['高度なラグプル', 'プロフェッショナルFUD拡散', '組織的ポンプ&ダンプ'],
      Rare: ['マイナーエアドロップファーミング', '基本的なシビル攻撃', 'アマチュアウォッシュトレード'],
      Common: ['過剰なGM投稿', '慢性的なリプライガイ', 'シリアルいいねファーミング'],
    },
  };

  const langCrimes = crimes[lang] || crimes['en'];
  const rarityCrimes = langCrimes[rarity] || langCrimes['Common'];
  return rarityCrimes[Math.floor(Math.random() * rarityCrimes.length)];
}

// Generate danger level based on rarity
function getDangerLevel(rarity: string, lang: string): { text: string; color: string } {
  const levels: Record<string, Record<string, { text: string; color: string }>> = {
    en: {
      Mythic: { text: 'EXTREME', color: '#ff4444' },
      Legendary: { text: 'HIGH', color: '#ff8800' },
      Epic: { text: 'HIGH', color: '#ff8800' },
      Rare: { text: 'MEDIUM', color: '#ffcc00' },
      Common: { text: 'LOW', color: '#44ff44' },
    },
    'pt-BR': {
      Mythic: { text: 'EXTREMO', color: '#ff4444' },
      Legendary: { text: 'ALTO', color: '#ff8800' },
      Epic: { text: 'ALTO', color: '#ff8800' },
      Rare: { text: 'MÉDIO', color: '#ffcc00' },
      Common: { text: 'BAIXO', color: '#44ff44' },
    },
    es: {
      Mythic: { text: 'EXTREMO', color: '#ff4444' },
      Legendary: { text: 'ALTO', color: '#ff8800' },
      Epic: { text: 'ALTO', color: '#ff8800' },
      Rare: { text: 'MEDIO', color: '#ffcc00' },
      Common: { text: 'BAJO', color: '#44ff44' },
    },
    ja: {
      Mythic: { text: '極めて危険', color: '#ff4444' },
      Legendary: { text: '高', color: '#ff8800' },
      Epic: { text: '高', color: '#ff8800' },
      Rare: { text: '中', color: '#ffcc00' },
      Common: { text: '低', color: '#44ff44' },
    },
  };

  const langLevels = levels[lang] || levels['en'];
  return langLevels[rarity] || langLevels['Common'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const { fid } = await params;
  const lang = request.nextUrl.searchParams.get('lang') || 'en';

  console.log(`[Share Image API] Generating for FID: ${fid}, lang: ${lang}`);

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'farcasterCards:getFarcasterCardByFid',
        args: { fid: parseInt(fid) },
        format: 'json',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      cardData = data.value;
    }

    if (!cardData) {
      throw new Error('Card not found');
    }

    // Get translations
    const t = translations[lang] || translations['en'];

    // Generate crime and danger level
    const crime = generateCrime(cardData.rarity, lang);
    const danger = getDangerLevel(cardData.rarity, lang);

    // Fetch card image
    let cardImageData: ArrayBuffer | null = null;
    if (cardData.cardImageUrl) {
      let cid = '';
      if (cardData.cardImageUrl.startsWith('ipfs://')) {
        cid = cardData.cardImageUrl.replace('ipfs://', '');
      } else if (cardData.cardImageUrl.includes('/ipfs/')) {
        cid = cardData.cardImageUrl.split('/ipfs/')[1];
      }

      if (cid) {
        const imgResponse = await fetch(`https://ipfs.filebase.io/ipfs/${cid}`);
        if (imgResponse.ok) {
          cardImageData = await imgResponse.arrayBuffer();
        }
      }
    }

    // Convert to base64 for embedding
    const cardImageBase64 = cardImageData
      ? `data:image/png;base64,${Buffer.from(cardImageData).toString('base64')}`
      : null;

    // Generate share image using ImageResponse (Satori)
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: '#1a1a1a',
            padding: '20px',
          }}
        >
          {/* Border */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              border: '6px solid #d4af37',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            {/* Card Image */}
            <div style={{ display: 'flex', width: '400px', marginRight: '30px' }}>
              {cardImageBase64 ? (
                <img
                  src={cardImageBase64}
                  style={{
                    width: '400px',
                    height: '560px',
                    objectFit: 'cover',
                    border: '3px solid #d4af37',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '400px',
                    height: '560px',
                    background: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #d4af37',
                    borderRadius: '8px',
                    color: '#d4af37',
                    fontSize: '32px',
                  }}
                >
                  FID #{fid}
                </div>
              )}
            </div>

            {/* Criminal Record Text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                color: '#f5f5dc',
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: '42px',
                  fontWeight: 'bold',
                  color: '#d4af37',
                  marginBottom: '10px',
                }}
              >
                {t.criminalRecord}
              </div>

              {/* Divider */}
              <div
                style={{
                  width: '100%',
                  height: '2px',
                  background: '#d4af37',
                  marginBottom: '20px',
                }}
              />

              {/* Name */}
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  marginBottom: '30px',
                }}
              >
                {cardData.displayName?.slice(0, 25) || cardData.username}
              </div>

              {/* Wanted For */}
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#c9a961',
                  marginBottom: '8px',
                }}
              >
                {t.wantedFor}
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#d4af37',
                  marginBottom: '25px',
                }}
              >
                {crime}
              </div>

              {/* Danger Level */}
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#c9a961',
                  marginBottom: '8px',
                }}
              >
                {t.dangerLevel}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: danger.color,
                  marginBottom: '25px',
                }}
              >
                {danger.text}
              </div>

              {/* Last Seen */}
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#c9a961',
                  marginBottom: '8px',
                }}
              >
                {t.lastSeen}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  marginBottom: '30px',
                }}
              >
                Farcaster Network
              </div>

              {/* Warning Box - at bottom */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '15px',
                  background: 'rgba(139, 0, 0, 0.3)',
                  border: '2px solid #ff4444',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#ff6666',
                  }}
                >
                  {t.warningCaution}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          // Cache for 1 hour per FID+lang combo
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[Share Image API] Error:', error);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#d4af37',
            fontSize: '32px',
          }}
        >
          VibeFID #{fid}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
