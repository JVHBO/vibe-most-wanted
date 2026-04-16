import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const APP_URL = "https://vibemostwanted.xyz";
const VIBE_MARKET_URL = "https://vibechain.com/market/vibe-most-wanted";
const VBMS_CONTRACT = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";

const PRIZE_POOL = [
  { tokenId: 15173, name: "Horsefarts",       img: "/images/baccarat/10%20clubs%2C%20horsefarts.png" },
  { tokenId: 15199, name: "JC Denton",        img: "/images/baccarat/10%20spades%2C%20jc%20denton.png" },
  { tokenId: 15172, name: "Beeper",           img: "/images/baccarat/10%20diamonds%2C%20beeper.png" },
  { tokenId: 14106, name: "Vibe Intern",      img: "/images/baccarat/9%20spades%2C%20vibe%20intern.png" },
  { tokenId: 15156, name: "Sartocrates",      img: "/images/baccarat/9%20hearts%2C%20sartocrates.png" },
  { tokenId: 15161, name: "Brian Armstrong",  img: "/images/baccarat/jack%20clubs%2C%20brian%20armstrong.png" },
  { tokenId: 14768, name: "Jack the Sniper",  img: "/images/baccarat/10%20hearts%2C%20jack%20the%20sniper.png" },
  { tokenId: 15218, name: "NFTKid",           img: "/images/baccarat/jack%20spades%2C%20nftkid.png" },
  { tokenId: 14440, name: "Slaterg",          img: "/images/baccarat/jack%20diamonds%2C%20slaterg.png" },
  { tokenId: 15164, name: "Zurkchad",         img: "/images/baccarat/jack%20hearts%2C%20zurkchad.png" },
];

const TIER_MILESTONES = [
  { tickets: 1,   cards: 1,  winners: 1 },
  { tickets: 20,  cards: 2,  winners: 1 },
  { tickets: 50,  cards: 4,  winners: 2 },
  { tickets: 100, cards: 6,  winners: 2 },
  { tickets: 150, cards: 8,  winners: 2 },
  { tickets: 200, cards: 10, winners: 2 },
];

function getTier(total: number) {
  let tier = TIER_MILESTONES[0];
  for (const t of TIER_MILESTONES) {
    if (total >= t.tickets) tier = t;
  }
  return tier;
}

function getNextTier(total: number) {
  return TIER_MILESTONES.find(t => total < t.tickets) ?? null;
}

function opensea(tokenId: number) {
  return `https://opensea.io/assets/base/${VBMS_CONTRACT}/${tokenId}`;
}

function buildMainView(totalTickets: number, epoch: number, timeLeftHours: number | null): object {
  const tier = getTier(totalTickets);
  const nextTier = getNextTier(totalTickets);
  const timeStr = timeLeftHours != null
    ? timeLeftHours > 24 ? `${Math.floor(timeLeftHours / 24)}d ${timeLeftHours % 24}h left` : `${timeLeftHours}h left`
    : "Ended";

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "stats_row", "progress_bar", "tier_info", "btns"],
    },
    header: {
      type: "text",
      props: { content: "🎰 Vibe Most Wanted Raffle · Epoch " + epoch, weight: "bold", size: "md", align: "center" },
    },
    stats_row: {
      type: "stack",
      props: { direction: "horizontal", gap: "md", justify: "between" },
      children: ["tickets_badge", "pool_badge", "time_badge"],
    },
    tickets_badge: {
      type: "badge",
      props: { label: totalTickets + " tickets", color: "accent" },
    },
    pool_badge: {
      type: "badge",
      props: { label: "$25 pool", color: "accent" },
    },
    time_badge: {
      type: "badge",
      props: { label: timeStr, color: "accent" },
    },
    progress_bar: {
      type: "progress",
      props: {
        value: nextTier ? totalTickets : 200,
        max: nextTier ? nextTier.tickets : 200,
        label: nextTier
          ? `Next: ${nextTier.tickets} tickets → ${nextTier.winners} winners · ${nextTier.cards} cards`
          : "🏆 Max tier reached! 2 winners · 10 cards",
      },
    },
    tier_info: {
      type: "text",
      props: {
        content: `Current tier: ${tier.winners} winner${tier.winners > 1 ? "s" : ""} · ${tier.cards / tier.winners} cards each · $0.06/ticket`,
        size: "sm",
        align: "center",
      },
    },
    btns: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["btn_buy", "btn_prizes", "btn_winners", "btn_share"],
    },
    btn_buy: {
      type: "button",
      props: { label: "Buy Ticket", variant: "primary", icon: "ticket" },
      on: {
        press: {
          action: "open_mini_app",
          params: { target: APP_URL + "/raffle" },
        },
      },
    },
    btn_prizes: {
      type: "button",
      props: { label: "Prize Pool", variant: "secondary", icon: "gift" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + "/api/snap/raffle?view=prize&page=0" },
        },
      },
    },
    btn_winners: {
      type: "button",
      props: { label: "Winners", variant: "secondary", icon: "trophy" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + "/api/snap/raffle?view=winners" },
        },
      },
    },
    btn_share: {
      type: "button",
      props: { label: "Share", variant: "secondary", icon: "share" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: `🎰 Vibe Most Wanted Raffle\n$25 prize pool · 10 Epic VBMS Cards\n$0.06/ticket · Buy on Base or Arb!\n${APP_URL}/raffle`,
          },
        },
      },
    },
  };

  return {
    version: "2.0",
    theme: { accent: "yellow" },
    ui: { root: "root", elements },
  };
}

function buildPrizeView(page: number): object {
  const card = PRIZE_POOL[page];
  const total = PRIZE_POOL.length;
  const imgUrl = APP_URL + card.img;

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "card_img", "card_name", "card_counter", "links_row", "nav_btns"],
    },
    header: {
      type: "text",
      props: { content: "🎁 Prize Pool · 10 Epic VBMS Cards", weight: "bold", size: "md", align: "center" },
    },
    card_img: {
      type: "image",
      props: { url: imgUrl, aspect: "1:1", alt: card.name },
    },
    card_name: {
      type: "text",
      props: { content: `#${page + 1} — ${card.name}`, weight: "bold", size: "md", align: "center" },
    },
    card_counter: {
      type: "text",
      props: { content: `Card ${page + 1} of ${total} · $2.50 value`, size: "sm", align: "center" },
    },
    links_row: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["btn_opensea", "btn_market"],
    },
    btn_opensea: {
      type: "button",
      props: { label: "OpenSea", variant: "secondary", icon: "external-link" },
      on: {
        press: {
          action: "open_url",
          params: { target: opensea(card.tokenId) },
        },
      },
    },
    btn_market: {
      type: "button",
      props: { label: "VibeMarket", variant: "secondary", icon: "external-link" },
      on: {
        press: {
          action: "open_url",
          params: { target: VIBE_MARKET_URL },
        },
      },
    },
    nav_btns: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "between" },
      children: ["btn_back_main", ...(page > 0 ? ["btn_prev"] : []), ...(page < total - 1 ? ["btn_next"] : []), "btn_buy"],
    },
    btn_back_main: {
      type: "button",
      props: { label: "← Raffle", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + "/api/snap/raffle?view=main" },
        },
      },
    },
    btn_buy: {
      type: "button",
      props: { label: "Buy Ticket", variant: "primary", icon: "ticket" },
      on: {
        press: {
          action: "open_mini_app",
          params: { target: APP_URL + "/raffle" },
        },
      },
    },
  };

  if (page > 0) {
    elements["btn_prev"] = {
      type: "button",
      props: { label: "← Prev", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + `/api/snap/raffle?view=prize&page=${page - 1}` },
        },
      },
    };
  }

  if (page < total - 1) {
    elements["btn_next"] = {
      type: "button",
      props: { label: "Next →", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + `/api/snap/raffle?view=prize&page=${page + 1}` },
        },
      },
    };
  }

  return {
    version: "2.0",
    theme: { accent: "yellow" },
    ui: { root: "root", elements },
  };
}

function buildWinnersView(results: any[]): object {
  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "results_group", "btn_back"],
    },
    header: {
      type: "text",
      props: { content: "🏆 Past Winners", weight: "bold", size: "md", align: "center" },
    },
    results_group: {
      type: "item_group",
      props: { border: true, separator: true },
      children: results.slice(0, 6).map((r, i) => "result_" + i),
    },
    btn_back: {
      type: "button",
      props: { label: "← Back to Raffle", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: APP_URL + "/api/snap/raffle?view=main" },
        },
      },
    },
  };

  results.slice(0, 6).forEach((r, i) => {
    const winner = r.username ? `@${r.username}` : r.winner ? r.winner.slice(0, 8) + "…" : "Unknown";
    const chain = r.winnerChain ? r.winnerChain.toUpperCase() : "";
    const prize = r.prizeDescription ?? "Prize";
    elements["result_" + i] = {
      type: "item",
      props: {
        title: `Epoch #${r.epoch} — ${winner}`,
        description: `Ticket #${r.winnerTicket} · ${chain} · ${prize.slice(0, 60)}`,
      },
    };
  });

  return {
    version: "2.0",
    theme: { accent: "yellow" },
    ui: { root: "root", elements },
  };
}

async function getRaffleData() {
  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    const [config, liveState] = await Promise.all([
      convex.query(api.raffle.getRaffleConfig),
      convex.action(api.raffle.getLiveRaffleState),
    ]);
    const totalTickets = (liveState as any)?.totalTickets ?? 0;
    const epoch = (config as any)?.epoch ?? 6;
    const updatedAt = (config as any)?.updatedAt ?? Date.now();
    const durationDays = (config as any)?.durationDays ?? 7;
    const endsAt = updatedAt + durationDays * 86400000;
    const diffMs = endsAt - Date.now();
    const timeLeftHours = diffMs > 0 ? Math.floor(diffMs / 3600000) : null;
    return { totalTickets, epoch, timeLeftHours };
  } catch {
    return { totalTickets: 0, epoch: 6, timeLeftHours: null };
  }
}

async function getPastResults() {
  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(api.raffle.getAllRaffleResults);
    return (results as any[]).reverse(); // most recent first
  } catch {
    return [];
  }
}

const SNAP_CONTENT_TYPE = "application/vnd.farcaster.snap+json";

const SNAP_HEADERS = {
  "Content-Type": SNAP_CONTENT_TYPE,
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: SNAP_HEADERS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "main";
  const page = Math.max(0, Math.min(9, parseInt(searchParams.get("page") ?? "0")));

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("application/vnd.farcaster.snap")) {
    return NextResponse.redirect(APP_URL + "/raffle");
  }

  let snap: object;
  if (view === "prize") {
    snap = buildPrizeView(page);
  } else if (view === "winners") {
    const results = await getPastResults();
    snap = buildWinnersView(results);
  } else {
    const data = await getRaffleData();
    snap = buildMainView(data.totalTickets, data.epoch, data.timeLeftHours);
  }

  return NextResponse.json(snap, {
    headers: SNAP_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "main";
  const page = Math.max(0, Math.min(9, parseInt(searchParams.get("page") ?? "0")));

  let snap: object;
  if (view === "prize") {
    snap = buildPrizeView(page);
  } else if (view === "winners") {
    const results = await getPastResults();
    snap = buildWinnersView(results);
  } else {
    const data = await getRaffleData();
    snap = buildMainView(data.totalTickets, data.epoch, data.timeLeftHours);
  }

  return NextResponse.json(snap, {
    headers: SNAP_HEADERS,
  });
}
