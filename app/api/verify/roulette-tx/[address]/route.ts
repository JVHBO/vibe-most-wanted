import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { verified: false, reason: "roulette_disabled" },
    { status: 200 }
  );
}
