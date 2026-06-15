import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { quests: [], questsDisabled: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
