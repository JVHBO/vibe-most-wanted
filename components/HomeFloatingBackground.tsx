"use client";

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface FloatItem {
  id: string;
  href: string;
  type: "vibecard" | "castcard" | "followcard";
  imageUrl?: string;
  pfp?: string;
  username?: string;
  text?: string;
  winnerNum?: number;
  // follow card fields
  displayName?: string;
  description?: string;
  reward?: number;
  bannerUrl?: string;
}

const CACHE_KEY = "vmw_hfb_v15";
const CACHE_DATE_KEY = "vmw_hfb_date_v15";
const VIBEFID_CONVEX = "https://scintillating-mandrill-101.convex.cloud";

// Casts to hide from the background animation
const HIDDEN_CAST_URLS = new Set([
  "https://farcaster.xyz/jvhbo/0x20586a19",
]);

// Reduced local VBMS cards — fewer elements
const VIBEMARKET_URL = "https://vibechain.com/market?ref=XCLR1DJ6LQTT";
const LOCAL_VBMS_CARDS: FloatItem[] = [
  { id: "local-leg-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-39.png" },
  { id: "local-leg-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-52.png" },
  { id: "local-leg-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-57.png" },
  { id: "local-epc-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-43.png" },
  { id: "local-epc-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-47.png" },
  { id: "local-rar-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-37.png" },
  { id: "local-rar-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-42.png" },
];

// Follow mission banners — shown in background
const FOLLOW_BANNERS: FloatItem[] = [
  {
    id: "follow-jvhbo",
    href: "https://warpcast.com/jvhbo",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/3a7e672c-8ba9-496e-e651-4a27281a1500/original",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/75f1b780-45f6-4d39-b0f7-eeecc34aed00/original",
    displayName: "Follow @jvhbo",
    description: "Follow $VBMS creator",
    reward: 50,
  },
  {
    id: "follow-smolemaru",
    href: "https://warpcast.com/smolemaru",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/e4678b3c-40b1-4e64-20c3-af626d792f00/original",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/a9c9038f-4f3b-43cf-256a-7a4d4ef3b700/original",
    displayName: "Follow @smolemaru",
    description: "Follow Viberuto creator",
    reward: 50,
  },
  {
    id: "follow-zazza",
    href: "https://warpcast.com/zazza",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/92e7f5ba-a6d3-499a-47cc-b19bfd2bda00/original",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/9c712f19-2051-4c23-0836-f4ca201acf00/original",
    displayName: "Follow @zazza",
    description: "Follow Poorly Drawn Pepes creator",
    reward: 50,
  },
  {
    id: "follow-degencummunist",
    href: "https://warpcast.com/degencummunist.eth",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/7a30028d-83f9-46d9-1cc8-43b857638d00/original",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/63798561-7d8c-4e2c-5f28-8e4a9995c000/original",
    displayName: "Follow @degencummunist",
    description: "Follow Cumioh creator",
    reward: 50,
  },
  {
    id: "follow-kenny",
    href: "https://warpcast.com/kenny",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/e6f1d0c9-26ff-4701-4bc5-f748256ab900/rectcrop3",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/1463afd7-1798-4c25-7e0c-7f0bcb45f500/original",
    displayName: "Follow @kenny",
    description: "Follow Poidh creator",
    reward: 50,
  },
  {
    id: "follow-nezzar",
    href: "https://warpcast.com/nezzar",
    type: "followcard",
    pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/80ade64b-8417-4c74-1df6-8198656dc800/original",
    bannerUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/45f23684-d5d4-4ef1-60a7-c76440ff3c00/original",
    displayName: "Follow @nezzar",
    description: "Follow Astroblock creator",
    reward: 50,
  },
];

function makeCastEl(item: FloatItem): HTMLDivElement {
  const card = document.createElement("div");
  card.style.cssText = `
    width:220px;
    background:#1a1a1a;
    border:1px solid rgba(201,168,76,0.5);
    border-radius:10px;
    padding:10px;
    box-sizing:border-box;
    font-family:sans-serif;
    overflow:hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";

  if (item.pfp) {
    const pfpImg = document.createElement("img");
    pfpImg.src = item.pfp;
    pfpImg.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;";
    pfpImg.onerror = () => { pfpImg.style.display = "none"; };
    header.appendChild(pfpImg);
  }

  const nameDiv = document.createElement("div");
  nameDiv.style.cssText = "display:flex;flex-direction:column;min-width:0;flex:1;";

  const displayName = document.createElement("span");
  displayName.style.cssText = "color:#c9a84c;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  displayName.textContent = item.username ? `@${item.username}` : "@unknown";
  nameDiv.appendChild(displayName);

  const badgeRow = document.createElement("div");
  badgeRow.style.cssText = "display:flex;align-items:center;gap:4px;";

  const wantedBadge = document.createElement("span");
  wantedBadge.style.cssText = "color:#ef4444;font-size:8px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;";
  wantedBadge.textContent = "WANTED CAST";
  badgeRow.appendChild(wantedBadge);

  if (item.winnerNum !== undefined) {
    const winnerBadge = document.createElement("span");
    winnerBadge.style.cssText = "color:#888;font-size:8px;font-weight:600;";
    winnerBadge.textContent = `· WINNER #${item.winnerNum}`;
    badgeRow.appendChild(winnerBadge);
  }

  nameDiv.appendChild(badgeRow);
  header.appendChild(nameDiv);
  card.appendChild(header);

  if (item.text) {
    const textEl = document.createElement("p");
    textEl.style.cssText = "color:#ccc;font-size:10px;line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;";
    textEl.textContent = `"${item.text}"`;
    card.appendChild(textEl);
  }

  return card;
}

function makeFollowEl(item: FloatItem): HTMLDivElement {
  const card = document.createElement("div");
  card.style.cssText = `
    width:240px;
    background:#111;
    border:2px solid #c9a84c;
    border-radius:10px;
    font-family:sans-serif;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(201,168,76,0.2);
  `;

  // Banner section
  const bannerWrap = document.createElement("div");
  bannerWrap.style.cssText = "position:relative;width:100%;height:80px;overflow:hidden;";

  if (item.bannerUrl) {
    const bannerImg = document.createElement("img");
    bannerImg.src = item.bannerUrl;
    bannerImg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    bannerImg.onerror = () => { bannerWrap.style.background = "#222"; };
    bannerWrap.appendChild(bannerImg);
  } else {
    bannerWrap.style.background = "#1a1a1a";
  }

  // @FOLLOW badge
  const followBadge = document.createElement("div");
  followBadge.style.cssText = "position:absolute;top:6px;left:6px;background:#c9a84c;color:#000;font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;letter-spacing:0.06em;";
  followBadge.textContent = "@FOLLOW";
  bannerWrap.appendChild(followBadge);

  // PFP overlapping banner
  if (item.pfp) {
    const pfpWrap = document.createElement("div");
    pfpWrap.style.cssText = "position:absolute;bottom:-18px;left:10px;width:36px;height:36px;border-radius:50%;border:2px solid #c9a84c;overflow:hidden;background:#111;";
    const pfpImg = document.createElement("img");
    pfpImg.src = item.pfp;
    pfpImg.style.cssText = "width:100%;height:100%;object-fit:cover;";
    pfpImg.onerror = () => { pfpWrap.style.background = "#333"; };
    pfpWrap.appendChild(pfpImg);
    bannerWrap.appendChild(pfpWrap);
  }

  card.appendChild(bannerWrap);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding:24px 10px 10px;";

  const name = document.createElement("div");
  name.style.cssText = "color:#fff;font-size:11px;font-weight:700;margin-bottom:2px;";
  name.textContent = item.displayName || "";
  body.appendChild(name);

  if (item.description) {
    const desc = document.createElement("div");
    desc.style.cssText = "color:#888;font-size:9px;margin-bottom:6px;";
    desc.textContent = item.description;
    body.appendChild(desc);
  }

  const rewardRow = document.createElement("div");
  rewardRow.style.cssText = "display:flex;align-items:center;gap:4px;";

  const rewardBadge = document.createElement("span");
  rewardBadge.style.cssText = "color:#c9a84c;font-size:10px;font-weight:800;";
  rewardBadge.textContent = `+${item.reward ?? 50} VBMS`;
  rewardRow.appendChild(rewardBadge);

  const questsLink = document.createElement("span");
  questsLink.style.cssText = "color:#555;font-size:9px;margin-left:auto;";
  questsLink.textContent = "→ Quests";
  rewardRow.appendChild(questsLink);

  body.appendChild(rewardRow);
  card.appendChild(body);

  return card;
}

export function HomeFloatingBackground() {
  const convex = useConvex();
  const containerRef = useRef<HTMLDivElement>(null);
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);
  const mountedRef = useRef(true);
  const router = useRouter();
  const rafRef = useRef<number>(0);

  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        let apiItems: FloatItem[] | null = null;

        if (localStorage.getItem(CACHE_DATE_KEY) === today) {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) apiItems = JSON.parse(raw);
        }

        if (!apiItems) {
          // Fetch VibeFID high-rarity cards — reduced to 6
          let cards: Array<{ _id: string; fid: number; cardImageUrl: string }> = [];
          try {
            const res = await fetch(`${VIBEFID_CONVEX}/api/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "farcasterCards:getHighRarityCards",
                args: { limit: 6 },
                format: "json",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              cards = Array.isArray(data.value) ? data.value : [];
            }
          } catch {}

          // Fetch only 15 most recent auction winners
          type HistoryItem = {
            _id: string;
            warpcastUrl?: string;
            castAuthorPfp?: string;
            castAuthorUsername?: string;
            castText?: string;
          };
          let winners: HistoryItem[] = [];
          try {
            winners = (await convex.query(api.castAuctions.getAuctionHistory, { limit: 15 })) as HistoryItem[];
          } catch {}

          const validWinners = winners.filter(w => w.warpcastUrl && !HIDDEN_CAST_URLS.has(w.warpcastUrl) && (w.castAuthorPfp || w.castAuthorUsername));
          const castItems: FloatItem[] = [...validWinners].reverse().map((w, idx) => ({
            id: w._id,
            href: w.warpcastUrl!,
            type: "castcard" as const,
            pfp: w.castAuthorPfp,
            username: w.castAuthorUsername,
            text: w.castText,
            winnerNum: idx + 1,
          }));

          apiItems = [
            ...cards.filter(c => c.cardImageUrl).map(c => ({
              id: c._id,
              href: `/fid/${c.fid}`,
              type: "vibecard" as const,
              imageUrl: c.cardImageUrl,
            })),
            ...castItems,
          ];

          localStorage.setItem(CACHE_KEY, JSON.stringify(apiItems));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current) return;

        // Combine: api items + local cards (fewer) + follow banners
        const items: FloatItem[] = [...(apiItems ?? []), ...LOCAL_VBMS_CARDS, ...FOLLOW_BANNERS];
        if (!items.length) return;

        const container = containerRef.current;
        if (!container) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        container.innerHTML = "";

        const loadedFlags: boolean[] = [];

        const particles: Array<{
          el: HTMLDivElement;
          x: number;
          w: number;
          h: number;
          rise: number;
          drift: number;
          dur: number;
          phase: number;
          maxOpacity: number;
          idx: number;
        }> = [];

        items.forEach((item, idx) => {
          const isFollow = item.type === "followcard";
          const isCast = item.type === "castcard";
          const w = isFollow ? 240 : isCast ? 220 : 80;
          const h = isFollow ? 160 : isCast ? 110 : 112;
          const x = 20 + Math.random() * (W - w - 40);
          const drift = (Math.random() - 0.5) * 80;
          const dur = (9 + Math.random() * 8) * 1000;
          const phase = Math.random();

          loadedFlags[idx] = isCast || isFollow;

          const el = document.createElement("div");
          el.className = "cursor-pointer";
          el.style.cssText = `
            position:absolute;
            left:${x}px;
            top:0px;
            width:${w}px;
            height:${h}px;
            border-radius:${isCast || isFollow ? "10px" : "8px"};
            overflow:hidden;
            opacity:0;
            will-change:transform,opacity;
            pointer-events:none;
          `;

          el.addEventListener("mouseenter", () => { el.style.filter = "brightness(1.6)"; });
          el.addEventListener("mouseleave", () => { el.style.filter = ""; });
          el.addEventListener("click", (e) => {
            e.preventDefault();
            if (item.href.startsWith("http")) window.open(item.href, "_blank", "noopener");
            else routerRef.current?.push(item.href);
          });

          if (isFollow) {
            el.appendChild(makeFollowEl(item));
            el.style.pointerEvents = "auto";
          } else if (isCast) {
            el.appendChild(makeCastEl(item));
            el.style.pointerEvents = "auto";
          } else {
            const img = document.createElement("img");
            img.src = item.imageUrl!;
            img.alt = "";
            img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
            img.onload = () => {
              loadedFlags[idx] = true;
              el.style.pointerEvents = "auto";
            };
            img.onerror = () => { el.style.display = "none"; };
            el.appendChild(img);
          }

          container.appendChild(el);
          particles.push({
            el, x, w, h,
            rise: H + h + 20,
            drift, dur, phase,
            maxOpacity: isFollow ? 0.8 : isCast ? 0.7 : 0.25,
            idx,
          });
        });

        let startTime: number | null = null;

        function frame(now: number) {
          if (!mountedRef.current) return;
          if (!startTime) startTime = now;

          for (const p of particles) {
            const t = ((now - startTime) / p.dur + p.phase) % 1;
            const y = H + p.h - t * p.rise;
            const dx = Math.sin(t * Math.PI * 2) * p.drift * 0.5 + t * p.drift * 0.5;

            p.el.style.transform = `translateY(${y.toFixed(1)}px) translateX(${dx.toFixed(1)}px)`;

            if (!loadedFlags[p.idx]) {
              p.el.style.opacity = "0";
            } else {
              const opacity = t < 0.08 ? (t / 0.08) * p.maxOpacity
                            : t > 0.92 ? ((1 - t) / 0.08) * p.maxOpacity
                            : p.maxOpacity;
              p.el.style.opacity = opacity.toFixed(3);
            }
          }

          rafRef.current = requestAnimationFrame(frame);
        }

        rafRef.current = requestAnimationFrame(frame);

      } catch (e) {
        console.warn("HomeFloatingBackground:", e);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [convex]);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
    />
  );
}
