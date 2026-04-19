import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vibemostwanted.xyz";
const TOTAL_FRAMES = 39; // goofy romero

const HEADERS = {
  "Content-Type": "application/vnd.farcaster.snap+json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function frameUrl(i: number) {
  return `${APP_URL}/snap/goofy/frame_${String(i).padStart(2, "0")}_delay-0.05s.jpg`;
}

function snapUrl(frame: number) {
  return `${APP_URL}/api/snap/goofy?frame=${frame}`;
}

function buildSnap(frame: number) {
  // Intro screen
  if (frame < 0) {
    return {
      version: "2.0",
      theme: { accent: "purple" },
      ui: {
        root: "root",
        elements: {
          root: { type: "stack", props: { direction: "vertical", gap: "16", padding: "16" }, children: ["title", "btn_start"] },
          title: { type: "text", props: { content: "Goofy Romero", weight: "bold", size: "xl", alignment: "center" } },
          btn_start: { type: "button", props: { label: "▶ Start", variant: "primary" }, on: { press: { action: "submit", params: { target: snapUrl(0) } } } },
        },
      },
    };
  }

  const INTERSTITIAL_FRAME = 19;

  // Interstitial text-only screen
  if (frame === INTERSTITIAL_FRAME) {
    return {
      version: "2.0",
      theme: { accent: "purple" },
      ui: {
        root: "root",
        elements: {
          root: { type: "stack", props: { direction: "vertical", gap: "16", padding: "16" }, children: ["msg", "btns"] },
          msg: { type: "text", props: { content: "You're still here? 👀 Keep going...", weight: "bold", size: "xl", alignment: "center" } },
          btns: { type: "stack", props: { direction: "horizontal", gap: "8" }, children: ["btn_back", "btn_next"] },
          btn_back: { type: "button", props: { label: "◀ Back", variant: "secondary" }, on: { press: { action: "submit", params: { target: snapUrl(INTERSTITIAL_FRAME - 1) } } } },
          btn_next: { type: "button", props: { label: "Next ▶", variant: "primary" }, on: { press: { action: "submit", params: { target: snapUrl(INTERSTITIAL_FRAME + 1) } } } },
        },
      },
    };
  }

  const img = frameUrl(frame);
  const hasPrev = frame > 0;
  const hasNext = frame < TOTAL_FRAMES - 1;

  const children = ["img"];
  const els: Record<string, any> = {
    root: { type: "stack", props: { direction: "vertical", gap: "8", padding: "8" }, children },
    img: { type: "image", props: { url: img, aspect: "3:2", alt: `Frame ${frame}` } },
  };

  const btnRow: string[] = [];
  if (hasPrev) {
    els["btn_back"] = { type: "button", props: { label: "◀ Back", variant: "secondary" }, on: { press: { action: "submit", params: { target: snapUrl(frame - 1) } } } };
    btnRow.push("btn_back");
  }
  if (hasNext) {
    els["btn_next"] = { type: "button", props: { label: "Next ▶", variant: "primary" }, on: { press: { action: "submit", params: { target: snapUrl(frame + 1) } } } };
    btnRow.push("btn_next");
  }
  if (!hasNext) {
    els["congrats"] = { type: "text", props: { content: "🏳️‍🌈 Congrats, you are gay! Send a DM to @JVHBO to receive your Gay Certificate.", weight: "bold", size: "sm", alignment: "center" } };
    children.splice(1, 0, "congrats");
    els["btn_restart"] = { type: "button", props: { label: "↩ Restart", variant: "secondary" }, on: { press: { action: "submit", params: { target: snapUrl(-1) } } } };
    btnRow.push("btn_restart");
  }

  els["btns"] = { type: "stack", props: { direction: "horizontal", gap: "8" }, children: btnRow };
  children.push("btns");

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "root", elements: els } };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("application/vnd.farcaster.snap")) {
    return NextResponse.redirect(`${APP_URL}`);
  }
  return NextResponse.json(buildSnap(-1), { headers: HEADERS });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const frame = parseInt(searchParams.get("frame") ?? "-1", 10);
  return NextResponse.json(buildSnap(frame), { headers: HEADERS });
}
