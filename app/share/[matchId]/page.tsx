import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;

  // Decode match data from matchId (format: result|playerPower|opponentPower|opponentName|playerName|type)
  const decoded = decodeURIComponent(matchId);
  // Support both old format (_) and new format (|)
  const parts = decoded.includes('|') ? decoded.split('|') : decoded.split('_');
  const result = parts[0] || 'win';
  const playerPower = parts[1] || '0';
  const opponentPower = parts[2] || '0';
  const opponentName = parts[3] || 'Opponent';
  const playerName = parts[4] || 'Player';
  const type = parts[5] || 'pve';

  const isWin = result === 'win';
  const isTie = result === 'tie';

  let title = '';
  if (type === 'attack') {
    title = isWin ? `⚔️ Attack Victory vs ${opponentName}!` : isTie ? `⚔️ Attack Tie vs ${opponentName}` : `⚔️ Attack Defeat vs ${opponentName}`;
  } else if (type === 'defense') {
    title = isWin ? `🛡️ Defense Victory vs ${opponentName}!` : isTie ? `🛡️ Defense Tie vs ${opponentName}` : `🛡️ Defense Defeat vs ${opponentName}`;
  } else if (type === 'pvp') {
    title = isWin ? `👑 PvP Victory vs ${opponentName}!` : isTie ? `👑 PvP Tie vs ${opponentName}` : `👑 PvP Defeat vs ${opponentName}`;
  } else {
    title = isWin ? `🎮 Victory vs Mecha George Floyd!` : isTie ? `🎮 Tie vs Mecha George Floyd` : `🎮 Defeat vs Mecha George Floyd`;
  }

  const description = `${playerPower} vs ${opponentPower} Power - $VBMS Battle Result`;

  // Explicitly set the OpenGraph image URL with cache busting
  const baseUrl = 'https://www.vibemostwanted.xyz';
  const imageUrl = `${baseUrl}/share/${matchId}/opengraph-image?v=14`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: '$VBMS',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Battle Result',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    other: {
      // Farcaster miniapp format with embedded image
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Play $VBMS',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: baseUrl,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Play $VBMS',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: baseUrl,
          },
        },
      }),
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <SharePageClient />;
}
