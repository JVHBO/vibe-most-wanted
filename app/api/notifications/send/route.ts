import { NextRequest, NextResponse } from 'next/server';
import { notifyDefenseAttacked } from '@/lib/notifications';

// Rate limit: max 10 notification requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { type, data } = body;

    // Only allow known notification types
    if (type === 'defense_attacked') {
      // Validate required fields exist before passing to notifier
      if (!data?.defenderAddress || !data?.attackerUsername || !data?.defenderUsername) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      // Sanitize string fields
      const sanitizedData = {
        defenderAddress: String(data.defenderAddress).slice(0, 42),
        defenderUsername: String(data.defenderUsername).slice(0, 50),
        attackerUsername: String(data.attackerUsername).slice(0, 50),
        result: (data.result === 'win' ? 'win' : 'lose') as 'win' | 'lose',
      };
      await notifyDefenseAttacked(sanitizedData);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });

  } catch (error: unknown) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
