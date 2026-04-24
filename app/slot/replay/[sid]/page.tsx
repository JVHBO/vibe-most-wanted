import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import SlotReplay from '@/app/share/slot/SlotReplay';

const BASE_URL = 'https://vibemostwanted.xyz';

type Props = {
  params: Promise<{ sid: string }>;
  searchParams: Promise<{ amount?: string; x?: string; type?: string; user?: string }>;
};

async function fetchFarcasterUser(userParam: string): Promise<{ pfp?: string; username?: string }> {
  if (!userParam) return {};
  try {
    const key = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    if (!key) return {};
    const isAddress = /^0x[0-9a-fA-F]{10,}/.test(userParam);
    const url = isAddress
      ? `https://api.neynar.com/v2/farcaster/user/by_verification?address=${userParam}`
      : `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(userParam)}`;
    const res = await fetch(url, { headers: { 'x-api-key': key }, cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    const u = isAddress ? data.users?.[0] : data.user;
    return { pfp: u?.pfp_url ?? undefined, username: u?.username ?? undefined };
  } catch {
    return {};
  }
}

async function fetchSessionSpins(sessionId: string) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return [];
    const res = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'slot:getSpinsBySession', args: { sessionId }, format: 'json' }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.value ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { sid } = await params;
  const p = await searchParams;
  const amount = p.amount ?? '0';
  const x = p.x ?? '0';
  const type = p.type ?? 'nice';
  const user = p.user ?? '';

  const labels: Record<string, string> = {
    max: 'MAX WIN', big: 'BIG WIN', great: 'GREAT WIN', nice: 'NICE WIN',
  };
  const label = labels[type] ?? 'WIN';
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K`
    : String(n);
  const amountFmt = fmt(parseInt(amount));

  const title = `🎰 ${label}! +${amountFmt} VBMS${x !== '0' && x !== '1' ? ` (${x}×)` : ''}${user ? ` by @${user}` : ''}`;
  const description = `${user ? `@${user} hit a ` : ''}${label} on Tukka Slots — +${amountFmt} VBMS coins${x !== '0' && x !== '1' ? ` at ${x}×` : ''}! Play now on Vibe Most Wanted.`;

  const ogParams = new URLSearchParams({ amount, x, type, ...(user ? { user } : {}), sid });
  const imageUrl = `${BASE_URL}/api/og/slot-win?${ogParams}`;
  const replayUrl = `${BASE_URL}/slot?replay=${sid}${user ? `&user=${encodeURIComponent(user)}` : ''}`;

  return {
    title,
    description,
    openGraph: {
      title, description,
      url: replayUrl,
      type: 'website',
      siteName: '$VBMS',
      images: [{ url: imageUrl, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title, description,
      images: [imageUrl],
    },
    other: {
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: 'Ver Replay',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: replayUrl,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: 'Ver Replay',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: replayUrl,
          },
        },
      }),
    },
  };
}

export default async function SlotReplayPage({ params, searchParams }: Props) {
  const { sid } = await params;
  const p = await searchParams;
  const amount = parseInt(p.amount ?? '0');
  const multX = parseInt(p.x ?? '0');
  const type = p.type ?? 'nice';
  const user = p.user ?? '';

  if (!sid) redirect('/slot');

  const [spins, fcUser] = await Promise.all([
    fetchSessionSpins(sid),
    fetchFarcasterUser(user),
  ]);
  const resolvedUsername = fcUser.username ?? (user.startsWith('0x') ? undefined : user) ?? user;
  const totalWin = spins.length > 0
    ? spins.reduce((acc: number, s: { winAmount: number }) => acc + s.winAmount, 0)
    : amount;

  return (
    <SlotReplay
      spins={spins}
      totalWin={totalWin}
      username={resolvedUsername}
      winType={type}
      amount={amount}
      multX={multX}
      pfp={fcUser.pfp}
      sid={sid}
    />
  );
}
