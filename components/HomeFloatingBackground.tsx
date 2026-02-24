"use client";

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface CardItem {
  id: string;
  imageUrl: string;
  href: string;
  isCard: boolean;
}

const CACHE_KEY = "vmw_hfb_items_v3";
const CACHE_DATE_KEY = "vmw_hfb_date_v3";

export function HomeFloatingBackground() {
  const convex = useConvex();
  const containerRef = useRef<HTMLDivElement>(null);
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);
  const mountedRef = useRef(true);
  const router = useRouter();

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        let items: CardItem[] | null = null;

        if (localStorage.getItem(CACHE_DATE_KEY) === today) {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) items = JSON.parse(raw);
        }

        if (!items) {
          const cards = await convex.query(
            (api as any).farcasterCards.getHighRarityCards,
            { limit: 16 }
          ) as Array<{ _id: string; fid: number; cardImageUrl: string }>;

          const casts = await convex.query(
            (api as any).featuredCasts.getActiveCasts,
            {}
          ) as Array<{ _id: string; warpcastUrl: string; castHash: string }>;

          items = cards.filter(c => c.cardImageUrl).map(c => ({
            id: c._id,
            imageUrl: c.cardImageUrl,
            href: `/fid/${c.fid}`,
            isCard: true,
          }));

          for (const cast of casts.slice(0, 8)) {
            try {
              const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(cast.warpcastUrl)}`);
              if (res.ok) {
                const data = await res.json();
                const embedImg = data.cast?.embeds?.[0]?.metadata?.image?.url
                  || data.cast?.embeds?.find((e: any) => /\.(jpg|jpeg|png|gif|webp)/i.test(e.url || ''))?.url;
                if (embedImg) {
                  items!.push({ id: cast._id + '_e', imageUrl: embedImg, href: cast.warpcastUrl, isCard: false });
                }
                if (data.cast?.author?.pfp_url) {
                  items!.push({ id: cast._id + '_p', imageUrl: data.cast.author.pfp_url, href: cast.warpcastUrl, isCard: false });
                }
              }
            } catch {}
          }

          localStorage.setItem(CACHE_KEY, JSON.stringify(items));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current || !items?.length) return;

        const container = containerRef.current;
        if (!container) return;

        // Use window dimensions — container is position:fixed inset:0
        const W = window.innerWidth;
        const H = window.innerHeight;
        container.innerHTML = "";

        // Remove old per-item keyframes
        const oldStyle = document.getElementById("hfb-item-styles");
        if (oldStyle) oldStyle.remove();

        // Build all keyframes with hardcoded values
        let css = "";
        const configs: Array<{ x: number; startY: number; rise: number; driftH: number; rot: number; dur: number; delay: number; w: number; h: number; isCard: boolean }> = [];

        items.forEach((_, i) => {
          const isCard = i % 3 !== 2; // mix cards and circles
          const w = isCard ? 80 : 52;
          const h = isCard ? 112 : 52;
          const x = 20 + Math.random() * (W - w - 40);
          const rise = H + h + 20;
          const midDrift = (Math.random() - 0.5) * 80;
          const endDrift = midDrift + (Math.random() - 0.5) * 40;
          const rot = (Math.random() - 0.5) * 16;
          const dur = 8 + Math.random() * 7;
          const delay = -(Math.random() * dur);

          configs.push({ x, startY: H + h, rise, driftH: endDrift, rot, dur, delay, w, h, isCard: i < items!.length });

          css += `
@keyframes hfb-r${i} {
  0%   { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
  8%   { opacity: 0.2; }
  50%  { transform: translateY(-${(rise * 0.5).toFixed(0)}px) translateX(${midDrift.toFixed(0)}px) rotate(${(rot * 0.6).toFixed(1)}deg); }
  92%  { opacity: 0.2; }
  100% { transform: translateY(-${rise}px) translateX(${endDrift.toFixed(0)}px) rotate(${rot.toFixed(1)}deg); opacity: 0; }
}`;
        });

        const styleEl = document.createElement("style");
        styleEl.id = "hfb-item-styles";
        styleEl.textContent = css;
        document.head.appendChild(styleEl);

        items.forEach((item, i) => {
          const cfg = configs[i];
          const isCard = item.isCard;
          const w = isCard ? 80 : 52;
          const h = isCard ? 112 : 52;

          const wrapper = document.createElement("div");
          wrapper.style.position = "absolute";
          wrapper.style.left = cfg.x + "px";
          wrapper.style.top = cfg.startY + "px";
          wrapper.style.width = w + "px";
          wrapper.style.height = h + "px";
          wrapper.style.borderRadius = isCard ? "8px" : "50%";
          wrapper.style.overflow = "hidden";
          wrapper.style.opacity = "0";
          wrapper.style.pointerEvents = "none";
          wrapper.style.cursor = "pointer";
          wrapper.style.animation = `hfb-r${i} ${cfg.dur.toFixed(1)}s linear ${cfg.delay.toFixed(1)}s infinite`;
          wrapper.style.willChange = "transform";

          wrapper.addEventListener("mouseenter", () => { wrapper.style.filter = "brightness(2) saturate(1.3)"; });
          wrapper.addEventListener("mouseleave", () => { wrapper.style.filter = ""; });
          wrapper.addEventListener("click", (e) => {
            e.preventDefault();
            if (item.href.startsWith("http")) {
              window.open(item.href, "_blank", "noopener");
            } else {
              routerRef.current?.push(item.href);
            }
          });

          const img = document.createElement("img");
          img.src = item.imageUrl;
          img.alt = "";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
          img.onload = () => { wrapper.style.pointerEvents = "auto"; };
          img.onerror = () => { wrapper.style.display = "none"; };

          wrapper.appendChild(img);
          container.appendChild(wrapper);
        });

      } catch (e) {
        console.warn("HomeFloatingBackground:", e);
      }
    }

    load();

    return () => {
      mountedRef.current = false;
    };
  }, [convex]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    />
  );
}
