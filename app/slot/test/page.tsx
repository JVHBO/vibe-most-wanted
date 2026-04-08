"use client";

import Image from "next/image";
import Link from "next/link";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";

// Todas as cartas do slot (igual ao POOL em SlotMachine.tsx + especiais)
const ALL_CARDS: Array<{ baccarat: string; rarity: string; special?: boolean }> = [
  // Especial (wildcard / GIFs)
  { baccarat: "vbms_special",       rarity: "Special",   special: true },
  { baccarat: "gen4_turbo",         rarity: "Wildcard",  special: true },
  // Mythic
  { baccarat: "jesse",              rarity: "Mythic" },
  { baccarat: "anon",               rarity: "Mythic" },
  { baccarat: "linda xied",         rarity: "Mythic" },
  { baccarat: "vitalik jumpterin",  rarity: "Mythic" },
  // Legendary
  { baccarat: "antonio",            rarity: "Legendary" },
  { baccarat: "goofy romero",       rarity: "Legendary" },
  { baccarat: "tukka",              rarity: "Legendary" },
  { baccarat: "chilipepper",        rarity: "Legendary" },
  { baccarat: "miguel",             rarity: "Legendary" },
  { baccarat: "ye",                 rarity: "Legendary" },
  { baccarat: "nico",               rarity: "Legendary" },
  // Epic
  { baccarat: "sartocrates",        rarity: "Epic" },
  { baccarat: "0xdeployer",         rarity: "Epic" },
  { baccarat: "lombra jr",          rarity: "Epic" },
  { baccarat: "vibe intern",        rarity: "Epic" },
  { baccarat: "jack the sniper",    rarity: "Epic" },
  { baccarat: "beeper",             rarity: "Epic" },
  { baccarat: "horsefarts",         rarity: "Epic" },
  { baccarat: "jc denton",          rarity: "Epic" },
  { baccarat: "zurkchad",           rarity: "Epic" },
  { baccarat: "slaterg",            rarity: "Epic" },
  { baccarat: "brian armstrong",    rarity: "Epic" },
  { baccarat: "nftkid",             rarity: "Epic" },
  // Rare
  { baccarat: "smolemaru",          rarity: "Rare" },
  { baccarat: "ventra",             rarity: "Rare" },
  { baccarat: "bradymck",           rarity: "Rare" },
  { baccarat: "shills",             rarity: "Rare" },
  { baccarat: "betobutter",         rarity: "Rare" },
  { baccarat: "qrcodo",             rarity: "Rare" },
  { baccarat: "loground",           rarity: "Rare" },
  { baccarat: "melted",             rarity: "Rare" },
  // Common
  { baccarat: "rachel",             rarity: "Common" },
  { baccarat: "claude",             rarity: "Common" },
  { baccarat: "gozaru",             rarity: "Common" },
  { baccarat: "ink",                rarity: "Common" },
  { baccarat: "casa",               rarity: "Common" },
  { baccarat: "groko",              rarity: "Common" },
  { baccarat: "rizkybegitu",        rarity: "Common" },
  { baccarat: "thosmur",            rarity: "Common" },
  { baccarat: "brainpasta",         rarity: "Common" },
  { baccarat: "gaypt",              rarity: "Common" },
  { baccarat: "dan romero",         rarity: "Common" },
  { baccarat: "morlacos",           rarity: "Common" },
  { baccarat: "landmine",           rarity: "Common" },
  { baccarat: "linux",              rarity: "Common" },
  { baccarat: "joonx",              rarity: "Common" },
  { baccarat: "don filthy",         rarity: "Common" },
  { baccarat: "pooster",            rarity: "Common" },
  { baccarat: "john porn",          rarity: "Common" },
  { baccarat: "scum",               rarity: "Common" },
  { baccarat: "vlady",              rarity: "Common" },
];

const LABELS: Record<string, string> = {
  "vbms_special": "VBMS Special", "gen4_turbo": "Gen4 Turbo",
  "jesse": "Jesse", "anon": "Anon", "linda xied": "Linda Xied", "vitalik jumpterin": "Vitalik",
  "antonio": "Antonio", "goofy romero": "Goofy Romero", "tukka": "Tukka", "chilipepper": "Chilli Pepper",
  "miguel": "Miguel", "ye": "Ye", "nico": "Nico",
  "sartocrates": "Sartocrates", "0xdeployer": "0xDeployer", "lombra jr": "Lombra Jr",
  "vibe intern": "Vibe Intern", "jack the sniper": "Jack Sniper", "beeper": "Beeper",
  "horsefarts": "Horsefarts", "jc denton": "JC Denton", "zurkchad": "Zurkchad",
  "slaterg": "Slaterg", "brian armstrong": "B. Armstrong", "nftkid": "NFTKid",
  "smolemaru": "Smolemaru", "ventra": "Ventra", "bradymck": "Bradymck",
  "shills": "Shills", "betobutter": "Betobutter", "qrcodo": "Qrcodo",
  "loground": "Loground", "melted": "Melted",
  "rachel": "Rachel", "claude": "Claude", "gozaru": "Gozaru", "ink": "Ink",
  "casa": "Casa", "groko": "Groko", "rizkybegitu": "Rizkybegitu", "thosmur": "Thosmur",
  "brainpasta": "Brainpasta", "gaypt": "Gaypt", "dan romero": "Dan Romero", "morlacos": "Morlacos",
  "landmine": "Landmine", "linux": "Linux", "joonx": "Joonx", "don filthy": "Don Filthy",
  "pooster": "Pooster", "john porn": "John Porn", "scum": "Scum", "vlady": "Vlady",
};

const RARITY_STYLES: Record<string, { border: string; bg: string; label: string; labelBg: string; glow: string }> = {
  Special:  { border: "#FFD700", bg: "#1a1400", label: "SPECIAL",  labelBg: "#92400e", glow: "0 0 14px #FFD70088" },
  Wildcard: { border: "#00ffcc", bg: "#00100d", label: "WILDCARD", labelBg: "#065f46", glow: "0 0 14px #00ffcc88" },
  Mythic:   { border: "#a855f7", bg: "#160028", label: "MYTHIC",   labelBg: "#6d28d9", glow: "0 0 10px #a855f788" },
  Legendary:{ border: "#f59e0b", bg: "#1a0e00", label: "LEGEND",   labelBg: "#b45309", glow: "0 0 10px #f59e0b88" },
  Epic:     { border: "#ec4899", bg: "#1a0015", label: "EPIC",     labelBg: "#9d174d", glow: "0 0 8px #ec489988" },
  Rare:     { border: "#3b82f6", bg: "#051530", label: "RARE",     labelBg: "#1d4ed8", glow: "0 0 6px #3b82f688" },
  Common:   { border: "#6b7280", bg: "#0f1117", label: "COMMON",   labelBg: "#374151", glow: "none" },
};

const SPECIAL_IMGS: Record<string, string> = {
  "vbms_special": "/slot-gifs/casino-slot-animation.gif",
  "gen4_turbo":   "/slot-gifs/gen4-turbo-idle-breathing.gif",
};

const GROUPS = ["Special", "Wildcard", "Mythic", "Legendary", "Epic", "Rare", "Common"] as const;

export default function SlotTestPage() {
  const grouped = GROUPS.reduce<Record<string, typeof ALL_CARDS>>((acc, g) => {
    acc[g] = ALL_CARDS.filter(c => c.rarity === g);
    return acc;
  }, {} as Record<string, typeof ALL_CARDS>);

  return (
    <div className="min-h-screen bg-[#0a0500] text-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/slot"
            className="px-3 py-1.5 bg-[#3d1c02] border-2 border-[#c87941] text-[#FFD700] font-black text-xs uppercase tracking-widest"
          >
            ← Slot
          </Link>
          <div>
            <h1 className="font-black text-xl uppercase" style={{ color: "#FFD700", textShadow: "2px 2px 0 #000" }}>
              Slot Card Gallery
            </h1>
            <p className="text-[11px] text-gray-500">{ALL_CARDS.length} cartas no pool</p>
          </div>
        </div>

        {/* Groups */}
        {GROUPS.map(group => {
          const cards = grouped[group];
          if (!cards.length) return null;
          const s = RARITY_STYLES[group];
          return (
            <div key={group} className="mb-8">
              {/* Group header */}
              <div
                className="flex items-center gap-2 mb-3 px-3 py-1.5 border-l-4"
                style={{ borderColor: s.border, background: `${s.bg}cc` }}
              >
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: s.border }}>
                  {s.label}
                </span>
                <span className="text-xs text-gray-500">({cards.length} cartas)</span>
              </div>

              {/* Cards grid */}
              <div className="flex flex-wrap gap-3">
                {cards.map(card => {
                  const img = SPECIAL_IMGS[card.baccarat] || getVbmsBaccaratImageUrl(card.baccarat);
                  const label = LABELS[card.baccarat] ?? card.baccarat;
                  return (
                    <div
                      key={card.baccarat}
                      className="flex flex-col overflow-hidden rounded"
                      style={{
                        width: 90,
                        border: `2px solid ${s.border}`,
                        boxShadow: s.glow,
                        background: s.bg,
                      }}
                    >
                      {/* Image */}
                      <div className="relative" style={{ height: 100 }}>
                        {img ? (
                          <Image
                            src={img}
                            alt={label}
                            fill
                            sizes="90px"
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="flex items-center justify-center h-full text-[9px] font-black text-gray-400 px-1 text-center"
                          >
                            {label.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Label */}
                      <div
                        className="px-1 py-0.5 text-center"
                        style={{ background: s.labelBg }}
                      >
                        <span
                          className="font-black text-white leading-none"
                          style={{ fontSize: label.length > 10 ? "7px" : "8px", display: "block" }}
                        >
                          {label.toUpperCase()}
                        </span>
                        <span className="text-[7px] font-bold leading-none" style={{ color: s.border }}>
                          {card.baccarat}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
