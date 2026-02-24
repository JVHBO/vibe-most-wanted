"use client";

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

// 5 gentle drift paths — no bounce, no rise-from-bottom
const FLOAT_CSS = `
@keyframes hfb-float1 {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  25%      { transform: translate(40px,-28px) rotate(4deg); }
  50%      { transform: translate(-22px,36px) rotate(-3deg); }
  75%      { transform: translate(32px,14px) rotate(2deg); }
}
@keyframes hfb-float2 {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  30%      { transform: translate(-36px,32px) rotate(-4deg); }
  60%      { transform: translate(26px,-38px) rotate(3.5deg); }
  80%      { transform: translate(-16px,18px) rotate(-2deg); }
}
@keyframes hfb-float3 {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  20%      { transform: translate(30px,26px) rotate(3deg); }
  50%      { transform: translate(-34px,-22px) rotate(-3.5deg); }
  80%      { transform: translate(18px,-12px) rotate(2deg); }
}
@keyframes hfb-float4 {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  33%      { transform: translate(-28px,-34px) rotate(-3deg); }
  66%      { transform: translate(38px,22px) rotate(4deg); }
}
@keyframes hfb-float5 {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  40%      { transform: translate(20px,38px) rotate(2deg); }
  70%      { transform: translate(-30px,-16px) rotate(-4deg); }
}
`;

const ANIMS = ["hfb-float1","hfb-float2","hfb-float3","hfb-float4","hfb-float5"];

interface CardItem {
  id: string;
  imageUrl: string;
  href: string;
  isCard: boolean; // card (rect) vs avatar (circle)
}

const CACHE_KEY = "vmw_hfb_items_v2";
const CACHE_DATE_KEY = "vmw_hfb_date_v2";

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

    // Inject CSS once
    if (!document.getElementById("hfb-styles")) {
      const style = document.createElement("style");
      style.id = "hfb-styles";
      style.textContent = FLOAT_CSS;
      document.head.appendChild(style);
    }

    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        let items: CardItem[] | null = null;

        if (localStorage.getItem(CACHE_DATE_KEY) === today) {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) items = JSON.parse(raw);
        }

        if (!items) {
          // Fetch VibeFID high-rarity cards
          const cards = await convex.query(
            (api as any).farcasterCards.getHighRarityCards,
            { limit: 16 }
          ) as Array<{ _id: string; fid: number; cardImageUrl: string; rarity: string }>;

          // Fetch active casts
          const casts = await convex.query(
            (api as any).featuredCasts.getActiveCasts,
            {}
          ) as Array<{ _id: string; warpcastUrl: string; castHash: string }>;

          items = [
            ...cards.filter(c => c.cardImageUrl).map(c => ({
              id: c._id,
              imageUrl: c.cardImageUrl,
              href: `/fid/${c.fid}`,
              isCard: true,
            })),
          ];

          // Fetch cast embed images + author pfp for all casts
          const castItems: CardItem[] = [];
          for (const cast of casts.slice(0, 8)) {
            try {
              const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(cast.warpcastUrl)}`);
              if (res.ok) {
                const data = await res.json();
                const embedImg = data.cast?.embeds?.[0]?.metadata?.image?.url
                  || data.cast?.embeds?.find((e: any) => /\.(jpg|jpeg|png|gif|webp)/i.test(e.url || ''))?.url;
                if (embedImg) {
                  castItems.push({
                    id: cast._id + '_embed',
                    imageUrl: embedImg,
                    href: cast.warpcastUrl,
                    isCard: false,
                  });
                }
                if (data.cast?.author?.pfp_url) {
                  castItems.push({
                    id: cast._id + '_pfp',
                    imageUrl: data.cast.author.pfp_url,
                    href: cast.warpcastUrl,
                    isCard: false,
                  });
                }
              }
            } catch {}
          }

          items = [...items, ...castItems];
          localStorage.setItem(CACHE_KEY, JSON.stringify(items));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current || !items?.length) return;

        const container = containerRef.current;
        if (!container) return;

        const W = container.clientWidth;
        const H = container.clientHeight;
        container.innerHTML = "";

        items.forEach((item, i) => {
          const isCard = item.isCard;
          const w = isCard ? 80 : 52;
          const h = isCard ? 112 : 52;

          // Spread items across the full area, avoiding center cluster
          const x = 40 + Math.random() * (W - w - 80);
          const y = 40 + Math.random() * (H - h - 80);

          const anim = ANIMS[i % ANIMS.length];
          const dur = 6 + Math.random() * 6; // 6-12s
          const delay = -(Math.random() * dur);  // random start point in cycle

          const wrapper = document.createElement("div");
          wrapper.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${w}px;
            height: ${h}px;
            animation: ${anim} ${dur.toFixed(1)}s ease-in-out ${delay.toFixed(1)}s infinite;
            will-change: transform;
            cursor: pointer;
            border-radius: ${isCard ? "8px" : "50%"};
            overflow: hidden;
            opacity: 0;
            transition: opacity 0.6s;
            pointer-events: none;
          `;

          wrapper.addEventListener("mouseenter", () => { wrapper.style.opacity = "0.65"; });
          wrapper.addEventListener("mouseleave", () => { wrapper.style.opacity = "0.18"; });

          wrapper.addEventListener("click", (e) => {
            e.preventDefault();
            const href = item.href;
            if (href.startsWith("http")) {
              window.open(href, "_blank", "noopener");
            } else {
              routerRef.current?.push(href);
            }
          });

          const img = document.createElement("img");
          img.src = item.imageUrl;
          img.alt = "";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
          img.onload = () => {
            wrapper.style.opacity = "0.18";
            wrapper.style.pointerEvents = "auto";
          };
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
