import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.VMW_INTERNAL_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await request.json().catch(() => null);
  return NextResponse.json({
    success: true,
    sentCount: 0,
    failedCount: 0,
    targetCount: 0,
    notificationsDisabled: true,
  });
}
