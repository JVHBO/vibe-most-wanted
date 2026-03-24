import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  const baseUrl = 'https://vibemostwanted.xyz';
  const imageUrl = `${baseUrl}/share/vibe/${address}/opengraph-image?v=1`;

  return {
    title: 'Vibe Most Wanted — Play Now',
    description: 'Collect cards, earn $VBMS, and battle for glory!',
    openGraph: {
      title: 'Vibe Most Wanted ⚔️',
      description: 'Collect cards, earn $VBMS, and battle for glory!',
      type: 'website',
      siteName: '$VBMS',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Vibe Most Wanted' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Vibe Most Wanted ⚔️',
      description: 'Collect cards, earn $VBMS, and battle for glory!',
      images: [imageUrl],
    },
    other: {
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: '⚔️ Play Now',
          action: {
            type: 'launch_miniapp',
            name: 'Vibe Most Wanted',
            url: baseUrl,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: '⚔️ Play Now',
          action: {
            type: 'launch_miniapp',
            name: 'Vibe Most Wanted',
            url: baseUrl,
          },
        },
      }),
    },
  };
}

export default function ShareVibePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <a href="https://vibemostwanted.xyz" style={{ color: '#FFD700', textDecoration: 'none', fontSize: '24px', fontWeight: 700 }}>
        ⚔️ Play Vibe Most Wanted
      </a>
    </div>
  );
}
