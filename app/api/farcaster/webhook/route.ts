import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await request.json().catch(() => null);
  return NextResponse.json({ success: true, miniappDisabled: true, notificationsDisabled: true });
}
