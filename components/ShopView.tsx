"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { AudioManager } from "@/lib/audio-manager";
import { AutoFitText } from "@/components/AutoFitText";
import { VMWPackCard, VMWActionButtons } from "@/components/LTCPacksSection";
import { ShopNotification } from "./ShopNotification";


interface ShopViewProps {
  address: string | undefined;
  initialSlide?: number;
}

export function ShopView({ address }: ShopViewProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [vmwMint, setVmwMint] = useState<{ trigger: number; qty: number }>({ trigger: 0, qty: 1 });
  const [vmwModalOpen, setVmwModalOpen] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Not connected state
  if (!address) {
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">SHOP</h2>
          <p className="text-vintage-ice/70">Connect wallet to access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1F1F1F] via-[#1A1A1A] to-[#111]" />

      {/* Notification */}
      {notification && (
        <ShopNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* TOP HUD */}
      <div className="absolute top-0 left-0 right-0 z-10" style={{ background: 'rgba(26,26,26,0.97)', borderBottom: '2px solid rgba(255,215,0,0.25)', backdropFilter: 'blur(12px)', height: 52 }}>
        <div className="relative flex items-center justify-between h-full px-3">
          <Link
            href="/"
            onClick={() => AudioManager.buttonNav()}
            onMouseEnter={() => AudioManager.buttonHover()}
            className="text-white text-[11px] font-black uppercase tracking-widest transition-all z-10 flex-shrink-0"
            style={{ background: '#CC2222', borderRadius: 6, padding: '5px 12px' }}
          >
            {(t as (k: string) => string)('raidBossBack')}
          </Link>

          <h1 className="absolute left-1/2 -translate-x-1/2 font-modern font-black text-[#FFD700] uppercase tracking-widest pointer-events-none" style={{ fontSize: 16 }}>{t('shopTitle') as string}</h1>

          <div className="w-10" />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="shop-container absolute inset-0 pt-14 pb-14 overflow-y-auto flex flex-col">
        <div className="relative z-10 px-4 py-1 flex-1 flex flex-col justify-center">

          {/* ── VMW LTC Pack ── */}
          <div className="mb-2 relative" style={{ height: '340px' }}>
            <div className="snap-start flex-none w-full px-6 h-full">
              <div className="max-w-sm mx-auto h-full">
                <VMWPackCard address={address} onMintSuccess={(qty) => setVmwMint(m => ({ trigger: m.trigger + 1, qty }))} />
              </div>
            </div>
          </div>

          {/* VMW Action Buttons */}
          <VMWActionButtons address={address} autoOpenTrigger={vmwMint.trigger} mintQty={vmwMint.qty} onModalStateChange={setVmwModalOpen} />

          {/* Burn Nothing Packs Button */}
          <div className="flex justify-center mt-4">
            <button
              onMouseEnter={() => AudioManager.buttonHover()}
              onClick={() => { AudioManager.buttonClick(); router.push('/shop/burn?filter=nothing'); }}
              className="shop-burn-btn py-2 px-4 border-[1.5px] border-black font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-[#1E1E1E] hover:bg-[#CC2222] text-[#FACC15] hover:text-white"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Burn Nothing Packs</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-[#1E1E1E] border-t border-black">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-3 py-1 border-[1.5px] border-black font-bold text-xs uppercase tracking-widest transition-all bg-[#1E1E1E] hover:bg-[#CC2222] text-[#FACC15] hover:text-white"
          >
            Help
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
          <div className="bg-vintage-charcoal border border-vintage-gold/50 rounded-xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-display font-bold text-vintage-gold">How It Works</h3>
              <button onClick={() => setShowHelpModal(false)} className="text-vintage-ice/70 hover:text-white text-xl">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-green-400 mb-1">VMW LTC Pack</h4>
                <p className="text-vintage-ice/70 text-xs">Purchase Vibe Most Wanted LTC packs with VBMS tokens.</p>
              </div>

              <div>
                <h4 className="font-bold text-red-400 mb-1">Burn Nothing Packs</h4>
                <p className="text-vintage-ice/70 text-xs">Convert unwanted Nothing cards (from free packs) back to VBMS tokens.</p>
              </div>

              <div className="bg-vintage-black/30 rounded p-3 text-xs">
                <p className="text-vintage-ice/60 mb-2">Burn Values:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>Common: <b className="text-vintage-ice">200</b></span>
                  <span>Rare: <b className="text-blue-400">1.1k</b></span>
                  <span>Epic: <b className="text-purple-400">4k</b></span>
                  <span>Legend: <b className="text-yellow-400">40k</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
