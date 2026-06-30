import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { verified: false, disabled: true, error: "Social rewards are disabled" },
    { status: 410 },
  );
}
