import { Metadata } from 'next';

const BASE_URL   = 'https://vibemostwanted.xyz';
const IMAGE_URL  = 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/75f1b780-45f6-4d39-b0f7-eeecc34aed00/original';
const TITLE      = 'Goofy Romero ($23) Raffle — $VBMS';
const DESCRIPTION = 'Win a Goofy Romero Legendary card. Ticket: $0.06 each.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `🎟️ ${TITLE}`,
    description: DESCRIPTION,
    url: `${BASE_URL}/share/raffle`,
    type: 'website',
    siteName: '$VBMS',
    images: [{ url: IMAGE_URL, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `🎟️ ${TITLE}`,
    description: DESCRIPTION,
    images: [IMAGE_URL],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: IMAGE_URL,
      button: {
        title: '🎟️ Enter Raffle',
        action: {
          type: 'launch_miniapp',
          name: '$VBMS · Vibe Most Wanted',
          url: BASE_URL + '/raffle',
        },
      },
    }),
  },
};

export default function ShareRafflePage() {
  return (
    <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#FFD700] mb-4">$VBMS Raffle</h1>
        <p className="text-white/60 mb-4">🎟️ Goofy Romero ($23)</p>
        <div className="animate-pulse text-5xl">🎟️</div>
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => { window.location.href = '/raffle'; }, 1500);` }} />
      </div>
    </div>
  );
}
