import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const secret = process.env.VMW_INTERNAL_SECRET;
  const authHeader = request.headers.get("authorization");
  const bodyKey: string | undefined = typeof body.adminKey === "string" ? body.adminKey : undefined;
  const authorized = secret && (authHeader === `Bearer ${secret}` || bodyKey === secret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, notificationsDisabled: true });
}
