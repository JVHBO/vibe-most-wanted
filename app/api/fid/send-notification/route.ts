import { NextResponse } from "next/server";

// Disabled: notifications are sent server-side via Convex actions only.
// This endpoint was open to the public and allowed spamming any FID.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been disabled." },
    { status: 410 }
  );
}
