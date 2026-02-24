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

const CACHE_KEY = "vmw_hfb_v4";
const CACHE_DATE_KEY = "vmw_hfb_date_v4";

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
          ) as Array<{ _id: string; warpcastUrl: string }>;

          items = cards.filter(c => c.cardImageUrl).map(c => ({
            id: c._id,
            imageUrl: c.cardImageUrl,
            href: `/fid/${c.fid}`,
            isCard: true,
          }));

          for (const cast of casts.slice(0, 6)) {
            try {
              const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(cast.warpcastUrl)}`);
              if (!res.ok) continue;
              const data = await res.json();
              const embedImg = data.cast?.embeds?.[0]?.metadata?.image?.url
                || data.cast?.embeds?.find((e: any) => /\.(jpg|jpeg|png|gif|webp)/i.test(e.url || ""))?.url;
              if (embedImg) items!.push({ id: cast._id + "_e", imageUrl: embedImg, href: cast.warpcastUrl, isCard: false });
              if (data.cast?.author?.pfp_url) items!.push({ id: cast._id + "_p", imageUrl: data.cast.author.pfp_url, href: cast.warpcastUrl, isCard: false });
            } catch {}
          }

          localStorage.setItem(CACHE_KEY, JSON.stringify(items));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current || !items?.length) return;
        const container = containerRef.current;
        if (!container) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        container.innerHTML = "";

        // Per-item state for rAF
        const particles: Array<{
          el: HTMLDivElement;
          x: number;
          w: number;
          h: number;
          rise: number;
          drift: number;
          dur: number;
          phase: number; // 0-1, starting offset
        }> = [];

        items.forEach((item) => {
          const isCard = item.isCard;
          const w = isCard ? 80 : 52;
          const h = isCard ? 112 : 52;
          const x = 20 + Math.random() * (W - w - 40);
          const drift = (Math.random() - 0.5) * 100;
          const dur = (8 + Math.random() * 7) * 1000; // ms
          const phase = Math.random(); // start at random point in cycle

          const el = document.createElement("div");
          el.style.cssText = `
            position:absolute;
            left:${x}px;
            top:0px;
            width:${w}px;
            height:${h}px;
            border-radius:${isCard ? "8px" : "50%"};
            overflow:hidden;
            opacity:0;
            will-change:transform,opacity;
            cursor:pointer;
            pointer-events:none;
          `;

          el.addEventListener("mouseenter", () => { el.style.filter = "brightness(2) saturate(1.3)"; });
          el.addEventListener("mouseleave", () => { el.style.filter = ""; });
          el.addEventListener("click", (e) => {
            e.preventDefault();
            if (item.href.startsWith("http")) window.open(item.href, "_blank", "noopener");
            else routerRef.current?.push(item.href);
          });

          const img = document.createElement("img");
          img.src = item.imageUrl;
          img.alt = "";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
          img.onload = () => { el.style.pointerEvents = "auto"; };
          img.onerror = () => { el.style.display = "none"; };

          el.appendChild(img);
          container.appendChild(el);

          particles.push({ el, x, w, h, rise: H + h + 20, drift, dur, phase });
        });

        let startTime: number | null = null;

        function frame(now: number) {
          if (!mountedRef.current) return;
          if (!startTime) startTime = now;

          for (const p of particles) {
            const t = ((now - startTime) / p.dur + p.phase) % 1; // 0 → 1 cycle

            // Y: from bottom (H+h) rising to top (-h)
            const y = H + p.h - t * (p.rise);

            // Horizontal drift: sinusoidal
            const dx = Math.sin(t * Math.PI * 2) * p.drift * 0.5 + t * p.drift * 0.5;

            // Opacity: fade in first 8%, full in middle, fade out last 8%
            const opacity = t < 0.08 ? t / 0.08 * 0.22
                          : t > 0.92 ? (1 - t) / 0.08 * 0.22
                          : 0.22;

            p.el.style.transform = `translateY(${y}px) translateX(${dx.toFixed(1)}px)`;
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
