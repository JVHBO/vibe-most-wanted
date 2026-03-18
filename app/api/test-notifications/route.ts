import { NextResponse } from "next/server";

// Disabled: debug endpoint removed from production.
// Previously allowed unauthenticated notification broadcasts to all users.
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
