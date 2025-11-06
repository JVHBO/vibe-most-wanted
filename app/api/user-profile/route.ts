import { NextResponse } from 'next/server';
import { ConvexProfileService } from '@/lib/convex-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const address = await ConvexProfileService.getAddressByUsername(username.toLowerCase());
    if (!address) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = await ConvexProfileService.getProfile(address);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
