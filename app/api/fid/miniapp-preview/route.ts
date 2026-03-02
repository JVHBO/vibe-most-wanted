import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!NEYNAR_API_KEY) return NextResponse.json({ error: "No API key" }, { status: 500 });

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/mini_app?url=${encodeURIComponent(url)}`,
      { headers: { api_key: NEYNAR_API_KEY } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Neynar error", status: response.status }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
