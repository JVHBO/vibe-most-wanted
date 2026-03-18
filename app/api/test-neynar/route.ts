import { NextResponse } from "next/server";

// Disabled: debug endpoint removed from production.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
