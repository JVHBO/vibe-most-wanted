import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata({ params }: { params: { matchId: string } }): Promise<Metadata> {
  const matchId = params.matchId;

  // Decode match data from matchId (format: result_playerPower_opponentPower_opponentName_type)
  const parts = decodeURIComponent(matchId).split('_');
  const result = parts[0] || 'win';
  const playerPower = parts[1] || '0';
  const opponentPower = parts[2] || '0';
  const opponentName = parts[3] || 'Opponent';
  const type = parts[4] || 'pve';

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

  const description = `${playerPower} vs ${opponentPower} Power - VIBE Most Wanted Battle Result`;

  // Explicitly set the OpenGraph image URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibe-most-wanted.vercel.app';
  const imageUrl = `${baseUrl}/share/${matchId}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'VIBE Most Wanted',
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
  };
}

export default function SharePage({ params }: { params: { matchId: string } }) {
  return <SharePageClient />;
}
