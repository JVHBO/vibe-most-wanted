import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Player quests disabled", questsDisabled: true },
    { status: 200 }
  );
}
