"use client";

import { useEffect, useRef, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";
import Link from "next/link";

const CARD_W = 100;
const CARD_H = 140;
const SPEED = 1.2; // px per frame at 60fps

const RARITY_BORDER: Record<string, string> = {
  Mythic: "3px solid #a855f7",
  Legendary: "3px solid #FFD700",
  Epic: "3px solid #ec4899",
};

const RARITY_SHADOW: Record<string, string> = {
  Mythic: "0 0 12px rgba(168,85,247,0.6)",
  Legendary: "0 0 12px rgba(255,215,0,0.5)",
  Epic: "0 0 12px rgba(236,72,153,0.5)",
};

interface CardData {
  _id: string;
  fid: number;
  cardImageUrl: string;
  rarity: string;
}

interface PhysicsCard extends CardData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  el: HTMLDivElement | null;
}

const CACHE_KEY = "vibefid_bg_cards";
const CACHE_DATE_KEY = "vibefid_bg_cards_date";

export function FloatingCardsBackground() {
  const convex = useConvex();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<PhysicsCard[]>([]);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const runPhysics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    const maxX = W - CARD_W;
    const maxY = H - CARD_H;

    for (const card of cardsRef.current) {
      card.x += card.vx;
      card.y += card.vy;

      if (card.x <= 0) { card.x = 0; card.vx = Math.abs(card.vx); }
      if (card.x >= maxX) { card.x = maxX; card.vx = -Math.abs(card.vx); }
      if (card.y <= 0) { card.y = 0; card.vy = Math.abs(card.vy); }
      if (card.y >= maxY) { card.y = maxY; card.vy = -Math.abs(card.vy); }

      if (card.el) {
        card.el.style.transform = `translate(${card.x}px, ${card.y}px)`;
      }
    }

    if (mountedRef.current) {
      rafRef.current = requestAnimationFrame(runPhysics);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function loadCards() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const cachedDate = sessionStorage.getItem(CACHE_DATE_KEY);
        let cards: CardData[] | null = null;

        if (cachedDate === today) {
          const raw = sessionStorage.getItem(CACHE_KEY);
          if (raw) cards = JSON.parse(raw) as CardData[];
        }

        if (!cards) {
          const result = await convex.query(
            (api as any).farcasterCards.getHighRarityCards,
            { limit: 7 }
          ) as CardData[];
          cards = result;
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cards));
          sessionStorage.setItem(CACHE_DATE_KEY, today);
        }

        if (!mountedRef.current || !cards || cards.length === 0) return;

        const container = containerRef.current;
        if (!container) return;

        const W = container.clientWidth;
        const H = container.clientHeight;

        cardsRef.current = cards.map((card, i) => {
          // Spread initial positions evenly, avoid stacking
          const cols = Math.ceil(Math.sqrt(cards!.length));
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cellW = (W - CARD_W) / cols;
          const cellH = (H - CARD_H) / Math.ceil(cards!.length / cols);
          const x = col * cellW + Math.random() * (cellW * 0.5);
          const y = row * cellH + Math.random() * (cellH * 0.5);

          // Random angle, constant speed
          const angle = Math.random() * Math.PI * 2;
          const vx = Math.cos(angle) * SPEED;
          const vy = Math.sin(angle) * SPEED;

          return { ...card, x, y, vx, vy, el: null };
        });

        // Force re-render by creating elements manually into container
        // (we use DOM directly for perf, no React state churn)
        container.innerHTML = "";

        for (let i = 0; i < cardsRef.current.length; i++) {
          const c = cardsRef.current[i];

          const wrapper = document.createElement("div");
          wrapper.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: ${CARD_W}px;
            height: ${CARD_H}px;
            transform: translate(${c.x}px, ${c.y}px);
            will-change: transform;
            cursor: pointer;
            overflow: hidden;
            border-radius: 8px;
            border: ${RARITY_BORDER[c.rarity] || "2px solid #555"};
            box-shadow: ${RARITY_SHADOW[c.rarity] || "none"};
            transition: filter 0.2s;
            pointer-events: auto;
          `;

          const link = document.createElement("a");
          link.href = `/fid/${c.fid}`;
          link.style.cssText = "display:block;width:100%;height:100%;";
          link.addEventListener("mouseenter", () => {
            wrapper.style.filter = "brightness(0.75)";
          });
          link.addEventListener("mouseleave", () => {
            wrapper.style.filter = "brightness(0.35)";
          });

          const img = document.createElement("img");
          img.src = c.cardImageUrl;
          img.alt = "";
          img.loading = "lazy";
          img.style.cssText = `
            width: 100%; height: 100%;
            object-fit: cover;
            display: block;
            filter: brightness(0.35);
            transition: filter 0.2s;
          `;
          img.addEventListener("mouseenter", () => {
            img.style.filter = "brightness(0.75)";
          });
          img.addEventListener("mouseleave", () => {
            img.style.filter = "brightness(0.35)";
          });
          img.onerror = () => { wrapper.style.display = "none"; };

          link.appendChild(img);
          wrapper.appendChild(link);
          container.appendChild(wrapper);
          cardsRef.current[i].el = wrapper;
        }

        rafRef.current = requestAnimationFrame(runPhysics);
      } catch (e) {
        console.warn("FloatingCardsBackground error:", e);
      }
    }

    loadCards();

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [convex, runPhysics]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    />
  );
}

export default FloatingCardsBackground;
