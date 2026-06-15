import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await request.text().catch(() => null);
  return NextResponse.json({ ok: true, raffleDisabled: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, raffleDisabled: true });
}
