"use client";

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface FloatItem {
  id: string;
  href: string;
  type: "vibecard" | "castcard";
  imageUrl?: string;
  pfp?: string;
  username?: string;
  text?: string;
  winnerNum?: number;
}

const CACHE_KEY = "vmw_hfb_v14";
const CACHE_DATE_KEY = "vmw_hfb_date_v14";

// Casts to hide from the background animation
const HIDDEN_CAST_URLS = new Set([
  "https://farcaster.xyz/jvhbo/0x20586a19",
]);
const VIBEFID_CONVEX = "https://scintillating-mandrill-101.convex.cloud";

// Local VBMS card images — always available, no API call needed
const VIBEMARKET_URL = "https://vibechain.com/market?ref=XCLR1DJ6LQTT";
const LOCAL_VBMS_CARDS: FloatItem[] = [
  { id: "local-leg-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-39.png" },
  { id: "local-leg-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-50.png" },
  { id: "local-leg-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-52.png" },
  { id: "local-leg-4", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-55.png" },
  { id: "local-leg-5", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-56.png" },
  { id: "local-leg-6", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-57.png" },
  { id: "local-epc-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-43.png" },
  { id: "local-epc-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-44.png" },
  { id: "local-epc-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-46.png" },
  { id: "local-epc-4", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-47.png" },
  { id: "local-epc-5", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-49.png" },
  { id: "local-rar-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-37.png" },
  { id: "local-rar-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-38.png" },
  { id: "local-rar-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-40.png" },
  { id: "local-rar-4", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-42.png" },
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

  // Header: PFP + name + winner badge
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
          // Fetch VibeFID high-rarity cards
          let cards: Array<{ _id: string; fid: number; cardImageUrl: string }> = [];
          try {
            const res = await fetch(`${VIBEFID_CONVEX}/api/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "farcasterCards:getHighRarityCards",
                args: { limit: 20 },
                format: "json",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              cards = Array.isArray(data.value) ? data.value : [];
            }
          } catch {}

          // Fetch auction winners directly from Convex — no external API calls needed
          type HistoryItem = {
            _id: string;
            warpcastUrl?: string;
            castAuthorPfp?: string;
            castAuthorUsername?: string;
            castText?: string;
          };
          let winners: HistoryItem[] = [];
          try {
            winners = (await convex.query(api.castAuctions.getAuctionHistory, { limit: 100 })) as HistoryItem[];
          } catch {}

          // Build cast float items — use data already stored in Convex, no API calls
          // Reverse so oldest winner = #1, newest = #N
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

        const items: FloatItem[] = [...(apiItems ?? []), ...LOCAL_VBMS_CARDS];
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
          const isCast = item.type === "castcard";
          const w = isCast ? 220 : 80;
          const h = isCast ? 110 : 112;
          const x = 20 + Math.random() * (W - w - 40);
          const drift = (Math.random() - 0.5) * 80;
          const dur = (9 + Math.random() * 8) * 1000;
          const phase = Math.random();

          loadedFlags[idx] = isCast;

          const el = document.createElement("div");
          el.style.cssText = `
            position:absolute;
            left:${x}px;
            top:0px;
            width:${w}px;
            height:${h}px;
            border-radius:${isCast ? "10px" : "8px"};
            overflow:hidden;
            opacity:0;
            will-change:transform,opacity;
            cursor:pointer;
            pointer-events:none;
          `;

          el.addEventListener("mouseenter", () => { el.style.filter = "brightness(1.6)"; });
          el.addEventListener("mouseleave", () => { el.style.filter = ""; });
          el.addEventListener("click", (e) => {
            e.preventDefault();
            if (item.href.startsWith("http")) window.open(item.href, "_blank", "noopener");
            else routerRef.current?.push(item.href);
          });

          if (isCast) {
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
          particles.push({ el, x, w, h, rise: H + h + 20, drift, dur, phase, maxOpacity: isCast ? 0.7 : 0.25, idx });
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
