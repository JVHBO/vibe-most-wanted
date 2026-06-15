import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, disabled: true, error: "Wanted Cast auctions are disabled" },
    { status: 410 },
  );
}
