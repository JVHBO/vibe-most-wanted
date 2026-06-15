import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    liked: false,
    recasted: false,
    replied: false,
    disabled: true,
  });
}
