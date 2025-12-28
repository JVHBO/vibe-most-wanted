import { NextRequest, NextResponse } from "next/server";

// Signature for www.vibemostwanted.xyz
const WWW_ASSOCIATION = {
  header: "eyJmaWQiOjIxNDc0NiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDJhOTU4NURhNDBkRTAwNGQ2RmYwZjVGMTJjZmU3MjZCRDJmOThCNTIifQ",
  payload: "eyJkb21haW4iOiJ3d3cudmliZW1vc3R3YW50ZWQueHl6In0",
  signature: "gl5wGfK7nb3pEC8oOMH9FW8jJgT+CRJEyxZ4rjtfklkd8rfLet6385USPwbAlQBzTOmoUaK8lejEC/VlFtrANxs="
};

// Signature for vibemostwanted.xyz (no www)
const NON_WWW_ASSOCIATION = {
  header: "eyJmaWQiOjIxNDc0NiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDJhOTU4NURhNDBkRTAwNGQ2RmYwZjVGMTJjZmU3MjZCRDJmOThCNTIifQ",
  payload: "eyJkb21haW4iOiJ2aWJlbW9zdHdhbnRlZC54eXoifQ",
  signature: "AuDgCWk/5/onxr+17EPM4qwjgBwrMIA+UoL6NAZqTtV//wJpLd6TRSYV83o1EEiE+5+OxbQrMW81B6nJ3GW8QRs="
};

function buildManifest(host: string) {
  const isWww = host.startsWith("www.");
  const domain = isWww ? "www.vibemostwanted.xyz" : "vibemostwanted.xyz";
  const accountAssociation = isWww ? WWW_ASSOCIATION : NON_WWW_ASSOCIATION;

  return {
    accountAssociation,
    miniapp: {
      version: "1",
      name: "$VBMS",
      iconUrl: `https://${domain}/icon.png`,
      homeUrl: `https://${domain}`,
      imageUrl: `https://${domain}/screenshot-1.png`,
      aspectRatio: "3:2",
      buttonTitle: "Play Now",
      splashImageUrl: `https://${domain}/splash-200.png`,
      splashBackgroundColor: "#0C0C0C",
      webhookUrl: "https://api.neynar.com/f/app/e4b053fc-a6bd-4975-a6bc-a3174e617d19/event",
      castShareUrl: `https://${domain}`,
      subtitle: "Meme Card Game",
      description: "Battle with meme cards in PvE and PvP modes. The most wanted meme card game on Base!",
      screenshotUrls: [
        `https://${domain}/screenshot-1.png`,
        `https://${domain}/screenshot-2.png`,
        `https://${domain}/screenshot-3.png`
      ],
      primaryCategory: "games",
      tags: ["meme", "cardgame", "battle", "pvp", "base"],
      heroImageUrl: `https://${domain}/hero.jpg`,
      tagline: "Battle with meme cards",
      ogTitle: "VBMS - Meme Card Game",
      ogDescription: "Battle with meme cards in PvE and PvP modes on Base!",
      ogImageUrl: `https://${domain}/og-image.png`,
      requiredCapabilities: ["wallet.getEthereumProvider"],
      noindex: false
    },
    baseBuilder: {
      ownerAddress: "0x89b0E4670c44246CC9c2d86D04c34D91064311Ed"
    }
  };
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "www.vibemostwanted.xyz";
  const manifest = buildManifest(host);

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Vary": "Host"
    }
  });
}
