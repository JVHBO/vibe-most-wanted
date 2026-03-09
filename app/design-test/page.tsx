"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

// ============================================================
// DESIGN TEST PAGE - Copia EXATA da home real (miniapp + web)
// Acesso: /design-test (auto-aplica neobrutalism)
// ============================================================

function useForceTheme() {
  useEffect(() => {
    document.body.classList.add("neobrutalism");
    return () => document.body.classList.remove("neobrutalism");
  }, []);
}

// ============ MOCK MODALS ============

function MockSettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-3 max-w-md w-full shadow-gold max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-display font-bold text-vintage-gold flex items-center gap-2"><span>§</span> Settings</h2>
          <button onClick={onClose} className="text-vintage-gold hover:text-vintage-ice text-xl transition">×</button>
        </div>
        <div className="space-y-2">
          {["Music", "Sound Effects", "Notifications"].map((item) => (
            <div key={item} className="bg-vintage-black/50 p-2 rounded-xl border border-vintage-gold/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-vintage-gold">♫</span>
                  <p className="font-modern font-bold text-vintage-gold">{item}</p>
                </div>
                <button className="w-12 h-6 bg-vintage-gold rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-vintage-black rounded-full" />
                </button>
              </div>
            </div>
          ))}
          <div className="bg-vintage-black/50 p-2 rounded-xl border border-vintage-gold/50">
            <p className="font-modern font-bold text-vintage-gold mb-2">Language</p>
            <div className="grid grid-cols-3 gap-1">
              {["EN", "PT", "ES", "FR", "DE", "JP"].map((lang) => (
                <button key={lang} className={`px-2 py-1 rounded-lg text-xs font-bold ${lang === "EN" ? "bg-vintage-gold text-vintage-black" : "bg-vintage-black text-vintage-gold border border-vintage-gold/30"}`}>{lang}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-sm">Disconnect</button>
            <button className="flex-1 bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCardSelectionModal({ onClose }: { onClose: () => void }) {
  const MOCK_CARDS = [
    { name: "Zoboo", rarity: "Mythic" }, { name: "Proxy", rarity: "Legendary" }, { name: "Nico", rarity: "Epic" },
    { name: "Chilli", rarity: "Rare" }, { name: "Vibe", rarity: "Common" }, { name: "Jack", rarity: "Legendary" },
    { name: "Filthy", rarity: "Epic" }, { name: "Beto", rarity: "Rare" }, { name: "Lombra", rarity: "Mythic" },
  ];
  const RARITY_BORDERS: Record<string, string> = { Mythic: "border-pink-400", Legendary: "border-yellow-400", Epic: "border-purple-400", Rare: "border-blue-400", Common: "border-vintage-ice/50" };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-3 max-w-md w-full shadow-gold max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-display font-bold text-vintage-gold">Select Cards (5)</h2>
          <button onClick={onClose} className="text-vintage-gold hover:text-vintage-ice text-xl transition">×</button>
        </div>
        <div className="flex gap-1 mb-3">
          {["All", "Mythic", "Legendary", "Epic", "Rare"].map((f, i) => (
            <button key={f} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${i === 0 ? "bg-vintage-gold text-vintage-black" : "bg-vintage-black text-vintage-gold border border-vintage-gold/30"}`}>{f}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {MOCK_CARDS.map((card, idx) => (
            <div key={idx} className={`rounded-lg border-2 ${RARITY_BORDERS[card.rarity] || "border-vintage-ice/50"} bg-vintage-black/50 p-2 flex flex-col items-center gap-1 cursor-pointer hover:bg-vintage-gold/10 transition ${idx < 3 ? "ring-2 ring-vintage-gold" : ""}`}>
              <div className="w-full aspect-[3/4] bg-vintage-charcoal rounded-md flex items-center justify-center">
                <span className="text-2xl text-vintage-gold font-bold">{card.name[0]}</span>
              </div>
              <span className="text-[9px] text-vintage-gold font-bold truncate w-full text-center">{card.name}</span>
              <span className="text-[8px] text-vintage-burnt-gold">{card.rarity}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm">Confirm Selection (3/5)</button>
      </div>
    </div>
  );
}

function MockBattleResultModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-4 max-w-sm w-full shadow-gold text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-2xl font-display font-bold text-vintage-gold mb-1">VICTORY!</h2>
        <p className="text-vintage-burnt-gold text-sm mb-4">You defeated the opponent</p>
        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/30 p-3 mb-4">
          <div className="flex justify-between items-center mb-2"><span className="text-vintage-gold text-sm">Power</span><span className="text-green-400 font-bold">1,250 vs 890</span></div>
          <div className="flex justify-between items-center mb-2"><span className="text-vintage-gold text-sm">Reward</span><span className="text-yellow-400 font-bold">+500 VBMS</span></div>
          <div className="flex justify-between items-center"><span className="text-vintage-gold text-sm">Aura</span><span className="text-purple-400 font-bold">+25</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-vintage-black text-vintage-gold border border-vintage-gold/30 font-bold py-2 rounded-lg text-sm">Home</button>
          <button className="flex-1 bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm">Battle Again</button>
        </div>
      </div>
    </div>
  );
}

function MockClaimModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2" onClick={onClose}>
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-3 max-w-md w-full shadow-gold max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-display font-bold text-vintage-gold flex items-center gap-2">
            <Image src="/images/icons/inbox.svg" alt="Claim" width={20} height={20} className="w-5 h-5" />
            Claim Rewards
          </h2>
          <button onClick={onClose} className="text-vintage-gold hover:text-vintage-ice text-xl transition">×</button>
        </div>
        <div className="space-y-2">
          {[
            { label: "Daily Login", amount: "+100 VBMS", icon: "🎁", ready: true },
            { label: "Battle Wins (3/3)", amount: "+250 VBMS", icon: "⚔️", ready: true },
            { label: "Raid Contribution", amount: "+75 VBMS", icon: "💀", ready: false },
            { label: "Cast Reward", amount: "+50 VBMS", icon: "📢", ready: true },
          ].map((reward) => (
            <div key={reward.label} className={`bg-vintage-black/50 p-3 rounded-xl border ${reward.ready ? "border-green-500/50" : "border-vintage-gold/20"} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{reward.icon}</span>
                <div>
                  <p className="font-modern font-bold text-vintage-gold text-sm">{reward.label}</p>
                  <p className="text-green-400 text-xs font-bold">{reward.amount}</p>
                </div>
              </div>
              {reward.ready ? (
                <button className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Claim</button>
              ) : (
                <span className="text-vintage-burnt-gold text-xs">2h left</span>
              )}
            </div>
          ))}
          <button className="w-full bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm mt-2">Claim All (3)</button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE - COPIA EXATA DA HOME ============

export default function DesignTestPage() {
  useForceTheme();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'game' | 'inbox'>('game');

  // Simula isInFarcaster = true (miniapp)
  const isInFarcaster = true;

  return (
    <div className="relative z-10 w-full">

      {/* ========== HEADER SECTION (VibeFID + Settings + Help) ========== */}
      {/* Copia exata de page.tsx linhas 4287-4354 com isInFarcaster=true */}
      <header className="tour-header flex flex-col items-center gap-1 mb-0 py-1.5 w-full max-w-[304px] mx-auto bg-vintage-charcoal/80 border border-vintage-gold/30 rounded-lg mt-[60px]">
        {/* VibeFID Button */}
        <div className="flex items-center justify-center gap-2">
          <button className="tour-vibefid-btn relative px-8 py-2 border border-vintage-gold/30 bg-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 hover:bg-vintage-gold/80 tracking-wider flex flex-col items-center justify-center gap-0.5 text-xs cursor-pointer">
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-bold">VibeFID</span>
            </div>
            <span className="text-[10px] opacity-75 font-normal leading-tight">and VibeMail</span>
          </button>
        </div>

        {/* Settings + Help */}
        <div className="flex items-center gap-3 justify-center w-full">
          <button className="tour-settings-btn bg-vintage-charcoal/80 border border-vintage-gold/30 text-vintage-gold px-3 py-1.5 rounded-lg hover:bg-vintage-gold/10 transition font-bold text-sm">
            <Image src="/images/icons/settings.svg" alt="Settings" width={20} height={20} className="w-5 h-5" />
          </button>
          <Link href="/docs" className="bg-vintage-charcoal/80 border border-vintage-gold/30 text-vintage-gold px-3 py-1.5 rounded-lg hover:bg-vintage-gold/10 transition font-bold text-sm inline-flex items-center justify-center">
            <Image src="/images/icons/help.svg" alt="Help" width={20} height={20} className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* ========== PROFILE BAR (fixed top) ========== */}
      {/* Copia exata de page.tsx linhas 4465-4545 com isInFarcaster=true */}
      <div className="fixed top-0 left-0 right-0 z-[100] m-0 mb-3">
        <div className="bg-vintage-charcoal/80 backdrop-blur-lg p-1 rounded-none border-b-2 border-vintage-gold/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left: Profile */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg transition cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-xs font-bold text-vintage-black">
                  Z
                </div>
                <span className="text-sm font-semibold text-vintage-gold">@zoboo</span>
              </div>
            </div>

            {/* Right: VBMS Balance */}
            <div className="flex items-center gap-2">
              <div className="tour-dex-btn bg-vintage-black hover:bg-vintage-gold/10 border border-vintage-gold/30 px-2 py-1.5 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer">
                <div className="flex items-baseline justify-center gap-0">
                  <span className="text-vintage-gold text-base font-bold leading-none">$</span>
                  <span className="text-vintage-gold font-display font-bold text-base leading-none ml-0.5">42,069</span>
                  <span className="text-vintage-gold text-base font-bold leading-none ml-1">+</span>
                </div>
                <div className="w-full h-1 bg-vintage-deep-black rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-vintage-gold to-green-400 transition-all" style={{ width: '35%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== NAVIGATION TABS (fixed bottom) ========== */}
      {/* Copia exata de page.tsx linhas 4547-4667 com isInFarcaster=true */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom">
        <div className="tour-nav-bar bg-vintage-charcoal/95 backdrop-blur-lg rounded-none border-t-2 border-vintage-gold/30 p-1 flex gap-1">
          {/* Home */}
          <button
            onClick={() => setCurrentView('game')}
            className={`flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-modern font-semibold transition-all text-[10px] leading-tight ${
              currentView === 'game' ? 'bg-vintage-gold text-vintage-black' : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
            }`}
          >
            <span className="text-[10px] font-bold whitespace-nowrap">Home</span>
            <span className="text-xl leading-none">♠</span>
          </button>

          {/* Claim */}
          <button
            onClick={() => setCurrentView('inbox')}
            className={`relative flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-modern font-semibold transition-all text-[10px] leading-tight ${
              currentView === 'inbox' ? 'bg-vintage-gold text-vintage-black' : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
            }`}
          >
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
            <span className="text-[10px] font-bold whitespace-nowrap">Claim</span>
            <Image src="/images/icons/inbox.svg" alt="Claim" width={20} height={20} className="w-5 h-5" />
          </button>

          {/* Leaderboard */}
          <button className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-modern font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30">
            <span className="text-[9px] font-bold whitespace-nowrap">Leaderboard</span>
            <span className="text-xl leading-none">♔</span>
          </button>

          {/* Shop */}
          <Link href="/shop" className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-modern font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30">
            <span className="text-[10px] font-bold whitespace-nowrap">Shop</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>

          {/* Quests */}
          <Link href="/quests" className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-modern font-semibold transition-all text-[10px] leading-tight relative bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30">
            <span className="text-[10px] font-bold whitespace-nowrap">Quests</span>
            <span className="text-xl leading-none">◈</span>
          </Link>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div className="pb-[60px]">

        {/* Price Ticker + All Collections */}
        {/* Copia exata de page.tsx linhas 4672-4678 */}
        <div className="flex flex-col items-center py-1 w-full max-w-[304px] mx-auto mt-2">
          <div className="text-vintage-burnt-gold text-xs font-modern">Loading prices...</div>
          <button className="mt-1 text-vintage-burnt-gold text-xs font-modern hover:text-vintage-gold transition">
            All Collections →
          </button>
        </div>

        {/* ========== GAME VIEW ========== */}
        {currentView === 'game' && (
          <>
            {/* GAME GRID - FIXED CENTER */}
            {/* Copia exata de page.tsx linhas 4693-4731 */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs px-2 z-10">
              <div className="tour-game-grid">
                <div className="grid grid-cols-2 gap-1.5 px-1">
                  {[
                    { icon: "🤖", color: "text-cyan-400", label: "Battle Auto", sub: "5 cards" },
                    { icon: "🦾", color: "text-green-400", label: "Mecha Arena", sub: "Bet VBMS" },
                    { icon: "💀", color: "text-red-400", label: "Raid Boss", sub: "5+1 Cards" },
                    { icon: "🎰", color: "text-emerald-400", label: "Baccarat", sub: "Bet VBMS" },
                    { icon: "🃏", color: "text-orange-400", label: "Vibe Clash", sub: "TCG Mode", isNew: true },
                  ].map((mode, i) => (
                    <button key={i} className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg bg-vintage-charcoal/80 border border-vintage-gold/20 hover:bg-vintage-charcoal transition-all hover:scale-[1.02] active:scale-[0.97] ${i === 4 ? '' : ''}`}>
                      {mode.isNew && (
                        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse z-10">NEW</span>
                      )}
                      <div className={`${mode.color} text-2xl scale-90`}>{mode.icon}</div>
                      <div className="flex flex-col items-center">
                        <span className="text-vintage-gold font-display font-bold text-[10px] leading-tight">{mode.label}</span>
                        <span className="text-vintage-burnt-gold text-[8px] font-modern leading-tight">{mode.sub}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARDS - BELOW CENTER */}
            {/* Copia exata de page.tsx linhas 4704-4717 */}
            <div className="fixed top-[66%] left-1/2 -translate-x-1/2 w-full max-w-xs px-2 z-10">
              <div className="tour-cards-section">
                <div className="bg-vintage-charcoal/80 backdrop-blur-sm rounded-xl border border-vintage-gold/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 flex-1">
                      {[
                        { rarity: "border-pink-400" },
                        { rarity: "border-yellow-400" },
                        { rarity: "border-purple-400" },
                        { rarity: "border-blue-400" },
                        { rarity: "border-vintage-ice/50" },
                      ].map((card, idx) => (
                        <div key={idx} className={`w-10 h-14 rounded-md overflow-hidden border-2 ${card.rarity} shadow-md bg-vintage-charcoal`} style={{ zIndex: 5 - idx }}>
                          <div className="w-full h-full bg-vintage-charcoal" />
                        </div>
                      ))}
                    </div>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vintage-gold/10 border border-vintage-gold/30 hover:bg-vintage-gold/20 hover:border-vintage-gold/50 transition-all">
                      <span className="text-vintage-gold text-xs font-modern whitespace-nowrap">12 Cards</span>
                      <svg className="w-4 h-4 text-vintage-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* WANTED CAST */}
            {/* Copia exata de page.tsx linhas 4718-4721 */}
            <div className="tour-wanted-cast fixed top-[78%] left-1/2 -translate-x-1/2 w-full max-w-xs px-2 z-10">
              <div className="bg-vintage-charcoal/80 backdrop-blur-sm rounded-xl border border-vintage-gold/30 px-4 py-3 hover:border-vintage-gold/50 hover:bg-vintage-charcoal transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-vintage-gold">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h3l5 4V4l-5 4zm9.5 4c0 1.71-.96 3.26-2.5 4V8c1.54.74 2.5 2.29 2.5 4z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-vintage-gold font-display font-bold text-sm">Wanted Cast</span>
                      <p className="text-vintage-burnt-gold text-[10px] font-modern">Earn coins by interacting</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-vintage-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* SPIN BUTTON */}
            {/* Copia exata de page.tsx linhas 4722-4731 */}
            <button className="fixed top-[88%] right-4 z-20 bg-gradient-to-r from-vintage-gold to-yellow-500 text-black font-bold py-2 px-4 rounded-full shadow-gold animate-pulse hover:scale-105 transition-transform">
              SPIN
            </button>
          </>
        )}

        {/* ========== CLAIM VIEW ========== */}
        {currentView === 'inbox' && (
          <div className="max-w-[304px] mx-auto px-2 mt-4 space-y-3">
            <h2 className="text-lg font-display font-bold text-vintage-gold text-center">Claim Rewards</h2>
            {[
              { label: "Daily Login", amount: "+100 VBMS", icon: "🎁", ready: true },
              { label: "Battle Wins (3/3)", amount: "+250 VBMS", icon: "⚔️", ready: true },
              { label: "Raid Contribution", amount: "+75 VBMS", icon: "💀", ready: false },
              { label: "Cast Reward", amount: "+50 VBMS", icon: "📢", ready: true },
            ].map((reward) => (
              <div key={reward.label} className={`bg-vintage-black/50 p-3 rounded-xl border ${reward.ready ? "border-green-500/50" : "border-vintage-gold/20"} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{reward.icon}</span>
                  <div>
                    <p className="font-modern font-bold text-vintage-gold text-sm">{reward.label}</p>
                    <p className="text-green-400 text-xs font-bold">{reward.amount}</p>
                  </div>
                </div>
                {reward.ready ? (
                  <button className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Claim</button>
                ) : (
                  <span className="text-vintage-burnt-gold text-xs">2h left</span>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ========== MODAL TRIGGERS (scroll down) ========== */}
      <div className="max-w-[304px] mx-auto px-2 mt-[92vh] pb-20 space-y-3">
        <p className="text-vintage-gold font-display font-bold text-sm text-center">TEST MODALS</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "settings", label: "Settings", icon: "⚙️" },
            { id: "cards", label: "Card Selection", icon: "🃏" },
            { id: "battle", label: "Battle Result", icon: "⚔️" },
            { id: "claim", label: "Claim Rewards", icon: "🎁" },
          ].map((modal) => (
            <button key={modal.id} onClick={() => setActiveModal(modal.id)} className="bg-vintage-charcoal/80 border border-vintage-gold/20 rounded-lg py-3 px-2 text-center hover:bg-vintage-charcoal transition-all">
              <span className="text-2xl block mb-1">{modal.icon}</span>
              <span className="text-vintage-gold font-bold text-xs">{modal.label}</span>
            </button>
          ))}
        </div>

        {/* Color palette */}
        <div className="space-y-2 pt-4">
          <p className="text-vintage-gold font-display font-bold text-sm text-center">COLOR PALETTE</p>
          <div className="grid grid-cols-4 gap-1">
            {[
              { color: "#1E1E1E", label: "BG" }, { color: "#2C2C2C", label: "Card" },
              { color: "#2A2A2A", label: "Nav" }, { color: "#3D3425", label: "Btn" },
              { color: "#D4A843", label: "Gold" }, { color: "#7C5CBF", label: "Purple" },
              { color: "#E8E0D4", label: "Text" }, { color: "#A09080", label: "Muted" },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-md border-2 border-white/20" style={{ backgroundColor: c.color }} />
                <span className="text-[8px] text-vintage-burnt-gold">{c.label}</span>
                <span className="text-[7px] text-vintage-gold/40">{c.color}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-4">
          <p className="text-vintage-gold font-display font-bold text-sm text-center">BUTTONS</p>
          <div className="flex flex-col gap-2">
            <button className="w-full bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm">Primary (Gold)</button>
            <button className="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-sm">Danger (Red)</button>
            <button className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-sm">Success (Green)</button>
            <button className="w-full bg-vintage-black text-vintage-gold border border-vintage-gold/30 font-bold py-2 rounded-lg text-sm">Secondary (Dark)</button>
            <button className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg text-sm">VibeFID (Purple)</button>
            <button disabled className="w-full bg-vintage-gold text-vintage-black font-bold py-2 rounded-lg text-sm">Disabled</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "settings" && <MockSettingsModal onClose={() => setActiveModal(null)} />}
      {activeModal === "cards" && <MockCardSelectionModal onClose={() => setActiveModal(null)} />}
      {activeModal === "battle" && <MockBattleResultModal onClose={() => setActiveModal(null)} />}
      {activeModal === "claim" && <MockClaimModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
