"use client";

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface FloatItem {
  id: string;
  href: string;
  type: "vibecard" | "castcard";
  // vibecard
  imageUrl?: string;
  // castcard
  pfp?: string;
  username?: string;
  text?: string;
  likes?: number;
  recasts?: number;
  replies?: number;
}

const CACHE_KEY = "vmw_hfb_v8";
const CACHE_DATE_KEY = "vmw_hfb_date_v8";
const VIBEFID_CONVEX = "https://scintillating-mandrill-101.convex.cloud";

function makeCastEl(item: FloatItem): HTMLDivElement {
  const card = document.createElement("div");
  card.style.cssText = `
    width:220px;
    background:#1e1e1e;
    border:1px solid rgba(201,168,76,0.5);
    border-radius:10px;
    padding:10px;
    box-sizing:border-box;
    font-family:sans-serif;
    overflow:hidden;
  `;

  // Header
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
  nameDiv.style.cssText = "display:flex;flex-direction:column;min-width:0;";
  const displayName = document.createElement("span");
  displayName.style.cssText = "color:#c9a84c;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  displayName.textContent = item.username ? `@${item.username}` : "@unknown";
  nameDiv.appendChild(displayName);
  header.appendChild(nameDiv);
  card.appendChild(header);

  // Text
  if (item.text) {
    const textEl = document.createElement("p");
    textEl.style.cssText = "color:#ccc;font-size:10px;line-height:1.4;margin:0 0 8px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;";
    textEl.textContent = item.text;
    card.appendChild(textEl);
  }

  // Stats
  const stats = document.createElement("div");
  stats.style.cssText = "display:flex;gap:12px;";

  const statItems = [
    { icon: "♥", val: item.likes ?? 0, color: "#f472b6" },
    { icon: "↺", val: item.recasts ?? 0, color: "#4ade80" },
    { icon: "◯", val: item.replies ?? 0, color: "#60a5fa" },
  ];
  statItems.forEach(s => {
    const span = document.createElement("span");
    span.style.cssText = `color:${s.color};font-size:10px;display:flex;align-items:center;gap:2px;`;
    span.textContent = `${s.icon} ${s.val}`;
    stats.appendChild(span);
  });
  card.appendChild(stats);

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
        let items: FloatItem[] | null = null;

        if (localStorage.getItem(CACHE_DATE_KEY) === today) {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) items = JSON.parse(raw);
        }

        if (!items) {
          // Fetch VibeFID cards from VibeFID Convex (scintillating-mandrill-101)
          let cards: Array<{ _id: string; fid: number; cardImageUrl: string }> = [];
          try {
            const res = await fetch(`${VIBEFID_CONVEX}/api/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "farcasterCards:getHighRarityCards",
                args: { limit: 12 },
                format: "json",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              cards = Array.isArray(data.value) ? data.value : [];
            }
          } catch {}

          // Fetch all featured casts from VMW Convex (active + history)
          const featuredCasts = await convex.query(
            (api as any).featuredCasts.getAllCasts,
            {}
          ) as Array<{ _id: string; warpcastUrl: string; castHash: string }>;

          // Enrich each featured cast with Neynar data (text, pfp, username, stats)
          const castItems: FloatItem[] = [];
          await Promise.all(featuredCasts.map(async (fc) => {
            try {
              const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(fc.warpcastUrl)}`);
              if (res.ok) {
                const data = await res.json();
                if (data.cast) {
                  castItems.push({
                    id: fc._id,
                    href: fc.warpcastUrl,
                    type: "castcard" as const,
                    pfp: data.cast.author?.pfp_url,
                    username: data.cast.author?.username,
                    text: data.cast.text,
                    likes: data.cast.reactions?.likes_count || 0,
                    recasts: data.cast.reactions?.recasts_count || 0,
                    replies: data.cast.replies?.count || 0,
                  });
                }
              }
            } catch {}
          }));

          // Sort by most likes
          castItems.sort((a, b) => (b.likes || 0) - (a.likes || 0));

          items = [
            ...cards.filter(c => c.cardImageUrl).map(c => ({
              id: c._id,
              href: `/fid/${c.fid}`,
              type: "vibecard" as const,
              imageUrl: c.cardImageUrl,
            })),
            ...castItems,
          ];

          localStorage.setItem(CACHE_KEY, JSON.stringify(items));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current || !items?.length) return;
        const container = containerRef.current;
        if (!container) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        container.innerHTML = "";

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
        }> = [];

        items.forEach((item) => {
          const isCast = item.type === "castcard";
          const w = isCast ? 220 : 80;
          const h = isCast ? 110 : 112;
          const x = 20 + Math.random() * (W - w - 40);
          const drift = (Math.random() - 0.5) * 80;
          const dur = (9 + Math.random() * 8) * 1000;
          const phase = Math.random();

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
            const castEl = makeCastEl(item);
            el.appendChild(castEl);
            el.style.pointerEvents = "auto";
          } else {
            const img = document.createElement("img");
            img.src = item.imageUrl!;
            img.alt = "";
            img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
            img.onload = () => { el.style.pointerEvents = "auto"; };
            img.onerror = () => { el.style.display = "none"; };
            el.appendChild(img);
          }

          container.appendChild(el);
          particles.push({ el, x, w, h, rise: H + h + 20, drift, dur, phase, maxOpacity: isCast ? 0.65 : 0.25 });
        });

        let startTime: number | null = null;
        function frame(now: number) {
          if (!mountedRef.current) return;
          if (!startTime) startTime = now;
          for (const p of particles) {
            const t = ((now - startTime) / p.dur + p.phase) % 1;
            const y = H + p.h - t * p.rise;
            const dx = Math.sin(t * Math.PI * 2) * p.drift * 0.5 + t * p.drift * 0.5;
            const opacity = t < 0.08 ? t / 0.08 * p.maxOpacity
                          : t > 0.92 ? (1 - t) / 0.08 * p.maxOpacity
                          : p.maxOpacity;
            p.el.style.transform = `translateY(${y.toFixed(1)}px) translateX(${dx.toFixed(1)}px)`;
            p.el.style.opacity = opacity.toFixed(3);
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
