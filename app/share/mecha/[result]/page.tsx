import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ result: string }> }): Promise<Metadata> {
  const { result } = await params;

  // Decode result data (format: win|amount or loss|amount)
  const decoded = decodeURIComponent(result);
  const parts = decoded.split('|');
  const outcome = parts[0] || 'win';
  const amount = parts[1] || '0';
  const collection = parts[2] || 'mecha';

  const isWin = outcome === 'win';
  const title = isWin
    ? `🎰 Won +${amount} coins in Mecha Arena!`
    : `💔 Lost ${amount} coins in Mecha Arena`;

  const description = `Betting on CPU vs CPU battles - $VBMS Mecha Arena`;

  const baseUrl = 'https://vibemostwanted.xyz';
  const imageUrl = `${baseUrl}/share/mecha/${result}/opengraph-image?v=1`;

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
          alt: 'Mecha Arena Result',
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
      'fc:frame': JSON.stringify({
        version: 'vNext',
        imageUrl: imageUrl,
        button: {
          title: 'Play Mecha Arena',
          action: {
            type: 'launch_frame',
            name: '$VBMS',
            url: baseUrl,
          },
        },
      }),
    },
  };
}

export default function MechaSharePage() {
  // Redirect to main page
  redirect('/');
}
