import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ exists: false, disabled: true });
}
