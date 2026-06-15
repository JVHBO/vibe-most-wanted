"use client";

import Link from "next/link";

export default function CasinoPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden overscroll-none" style={{ background: "#0e0e0e", color: "#fff" }}>
      <div className="shrink-0" style={{ background: "#1a1a1a", borderBottom: "1px solid rgba(255,215,0,0.15)" }}>
        <div className="px-4 pb-3" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <Link href="/" className="text-sm font-medium" style={{ color: "rgba(255,215,0,0.6)" }}>
              &larr; Home
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#FFD700", fontFamily: "var(--font-cinzel)" }}>
                VMW Casino
              </h1>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,215,0,0.4)" }}>
                Play · Earn · Win
              </p>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl px-4 py-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <BaccaratCard />
        </div>
      </div>
    </div>
  );
}

function BaccaratCard() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "2px solid rgba(255,215,0,0.35)", background: "#1a1a1a" }}>
      <div className="relative px-6 py-8 text-center" style={{ background: "linear-gradient(160deg, #0d3d2d 0%, #0a2e20 100%)", borderBottom: "1px solid rgba(255,215,0,0.2)" }}>
        <div className="relative">
          <div className="mb-4 flex justify-center gap-3">
            <img src="/images/baccarat/ace%20spades%2C%20jesse.png" alt="" className="h-14 w-10 rounded object-cover" />
            <img src="/images/baccarat/king%20hearts%2C%20miguel.png" alt="" className="h-14 w-10 rounded object-cover" style={{ transform: "rotate(-6deg)" }} />
            <img src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png" alt="" className="h-14 w-10 rounded object-cover" />
          </div>
          <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: "#FFD700", fontFamily: "var(--font-cinzel)" }}>
            Baccarat
          </h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,215,0,0.55)" }}>
            VBMS table game
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ borderBottom: "1px solid rgba(255,215,0,0.12)" }}>
        {[
          { label: "Bet", value: "Player" },
          { label: "Bet", value: "Banker" },
          { label: "Bet", value: "Tie" },
        ].map(({ label, value }, index) => (
          <div key={value} className="py-4 text-center" style={{ borderRight: index < 2 ? "1px solid rgba(255,215,0,0.1)" : "none" }}>
            <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,215,0,0.4)" }}>{label}</p>
            <p className="text-sm font-bold" style={{ color: "#FFD700" }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 py-5 text-center">
        <Link href="/baccarat" className="inline-block rounded-xl px-8 py-3 text-base font-bold uppercase tracking-wider active:scale-95" style={{ background: "#FFD700", color: "#0e0e0e" }}>
          Play Baccarat &rarr;
        </Link>
      </div>
    </div>
  );
}
