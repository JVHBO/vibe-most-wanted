import type { Metadata } from 'next';
import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';

const baseUrl = 'https://vibemostwanted.xyz';

export const metadata: Metadata = {
  title: '$VBMS - Game and VibeMail',
  description: 'Play VBMS games and send VibeMail with your wallet.',
  openGraph: {
    title: '$VBMS - Game and VibeMail',
    description: 'Play VBMS games and send VibeMail with your wallet.',
    url: `${baseUrl}/fid/vibemail`,
    siteName: '$VBMS',
    locale: 'en_US',
    type: 'website',
  },
};

export default function FidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VibeFIDConvexProvider>{children}</VibeFIDConvexProvider>;
}
