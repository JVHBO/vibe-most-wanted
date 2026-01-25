import { NextRequest, NextResponse } from "next/server";
import { getCastByHash } from "@/lib/neynar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash) {
      return NextResponse.json(
        { error: "Cast hash is required" },
        { status: 400 }
      );
    }

    const cast = await getCastByHash(hash);

    if (!cast) {
      return NextResponse.json(
        { error: "Cast not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ cast }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error("Error fetching cast:", error);
    return NextResponse.json(
      { error: "Failed to fetch cast" },
      { status: 500 }
    );
  }
}
