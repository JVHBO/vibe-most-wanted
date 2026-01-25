import { NextRequest, NextResponse } from "next/server";
import { getCastByUrl } from "@/lib/neynar";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Warpcast URL is required" },
        { status: 400 }
      );
    }

    const cast = await getCastByUrl(url);

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
    console.error("Error fetching cast by URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch cast" },
      { status: 500 }
    );
  }
}
