"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { ShopNotification } from "./ShopNotification";
import { PackOpeningAnimation } from "./PackOpeningAnimation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { isMiniappMode, isWarpcastClient } from "@/lib/utils/miniapp";
import { AudioManager } from "@/lib/audio-manager";
import { AutoFitText } from "@/components/AutoFitText";
import { VMWPackCard, VMWActionButtons } from "@/components/LTCPacksSection";


interface ShopViewProps {
  address: string | undefined;
}

export function ShopView({ address }: ShopViewProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // Fetch data
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const playerCards = useQuery(api.cardPacks.getPlayerCards, address ? { address } : "skip");
  const dailyFreeStatus = useQuery(api.cardPacks.canClaimDailyFree, address ? { address } : "skip");
  const profileDashboard = useQuery(
    api.profiles.getProfileDashboard,
    address ? { address: address.toLowerCase() } : "skip"
  );

  // Mutations
  const openPack = useMutation(api.cardPacks.openPack);
  const openAllPacks = useMutation(api.cardPacks.openAllPacks);
  const claimDailyFree = useMutation(api.cardPacks.claimDailyFreePack);
  const setPreferredChainMutation = useMutation(api.missions.setPreferredChain);

  // ARB mode detection (same pattern as quests/roulette)
  const [arbSupported, setArbSupported] = useState(false);
  useEffect(() => {
    if (!isMiniappMode()) { setArbSupported(true); return; }
    const checkArb = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const ctx = await sdk.context;
        setArbSupported(isWarpcastClient(ctx?.client?.clientFid));
      } catch { setArbSupported(false); }
    };
    const timer = setTimeout(checkArb, 300);
    return () => clearTimeout(timer);
  }, []);

  const [localChain, setLocalChain] = useState<'base' | 'arbitrum'>('arbitrum');
  useEffect(() => {
    const c = (profileDashboard as any)?.preferredChain;
    if (c) setLocalChain(c);
  }, [(profileDashboard as any)?.preferredChain]);
  const effectiveChain = localChain;
  const isArb = effectiveChain === "arbitrum";
  const packsPerDay = isArb ? 3 : 1;

  const handleSwitchChain = async (chain: 'base' | 'arbitrum') => {
    setLocalChain(chain);
    if (!address) return;
    try { await setPreferredChainMutation({ address, chain }); }
    catch (e) { console.error('Failed to switch chain:', e); }
  };

  // State
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [openQuantities, setOpenQuantities] = useState<Record<string, number>>({});
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [vmwMint, setVmwMint] = useState<{ trigger: number; qty: number }>({ trigger: 0, qty: 1 });
  const [vmwModalOpen, setVmwModalOpen] = useState(false);
  const userScrolledRef = useRef(false);

  // Auto-scroll carousel slowly — pauses when any modal is open or user interacts
  const anyModalOpen = showPacksModal || revealedCards.length > 0 || vmwModalOpen;
  useEffect(() => {
    if (anyModalOpen) return; // freeze while modal is open
    const COOLDOWN = 6000;
    let lastUserScroll = 0;
    const interval = setInterval(() => {
      if (Date.now() - lastUserScroll < COOLDOWN) return;
      if (!carouselRef.current) return;
      const el = carouselRef.current;
      const nextSlide = activeSlide === 0 ? 1 : 0;
      el.scrollTo({ left: nextSlide * el.clientWidth, behavior: 'smooth' });
      setActiveSlide(nextSlide);
    }, COOLDOWN);

    const onUserScroll = () => { lastUserScroll = Date.now(); };
    const el = carouselRef.current;
    el?.addEventListener('touchstart', onUserScroll, { passive: true });
    el?.addEventListener('mousedown', onUserScroll);
    return () => {
      clearInterval(interval);
      el?.removeEventListener('touchstart', onUserScroll);
      el?.removeEventListener('mousedown', onUserScroll);
    };
  }, [activeSlide, anyModalOpen]);

  // Handle daily free claim
  const handleClaimDailyFree = async () => {
    if (!address || claimingDaily) return;

    setClaimingDaily(true);
    try {
      await claimDailyFree({ address, chain: effectiveChain });
      setNotification({
        type: 'success',
        message: `Free pack${packsPerDay > 1 ? 's' : ''} claimed! Open ${packsPerDay > 1 ? 'them' : 'it'} below.`
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || "Failed to claim daily free"
      });
    } finally {
      setClaimingDaily(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Not connected state
  if (!address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">SHOP</h2>
            <p className="text-vintage-ice/70">Connect wallet to access</p>
          </div>
        </div>
      </div>
    );
  }

  // Count total unopened packs
  const totalUnopenedPacks = playerPacks?.reduce((sum: number, pack: any) => sum + (pack.unopened || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black/90 to-vintage-charcoal/50" />

      {/* Notification */}
      {notification && (
        <ShopNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* TOP HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3">
        <div className="relative flex items-center justify-between">
          <Link
            href="/"
            onClick={() => AudioManager.buttonNav()}
            onMouseEnter={() => AudioManager.buttonHover()}
            className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            style={{ boxShadow: '4px 4px 0px #000' }}
          >
            {(t as (k: string) => string)('raidBossBack')}
          </Link>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-display font-bold text-vintage-gold tracking-wider overflow-hidden max-w-[50%]"><AutoFitText>{t('shopTitle') as string}</AutoFitText></h1>

          <div className="w-10" />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="absolute inset-0 pt-14 pb-14 overflow-y-auto flex flex-col">
        <div className="relative z-10 px-4 py-1 flex-1 flex flex-col justify-center">

          {/* ── Pack Carousel ── */}
          <div className="mb-2 relative" style={{ height: '340px' }}>
            {/* Arrow left */}
            {activeSlide === 1 && (
              <button onClick={() => { setActiveSlide(0); carouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center text-vintage-gold bg-black/50 rounded-full border border-vintage-gold/30 shadow-lg">
                ‹
              </button>
            )}
            {/* Arrow right */}
            {activeSlide === 0 && (
              <button onClick={() => { setActiveSlide(1); carouselRef.current?.scrollTo({ left: carouselRef.current.scrollWidth, behavior: 'smooth' }); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center text-vintage-gold bg-black/50 rounded-full border border-vintage-gold/30 shadow-lg">
                ›
              </button>
            )}

            {/* Slides */}
            <div ref={carouselRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const slide = Math.round(el.scrollLeft / el.clientWidth);
                setActiveSlide(slide);
              }}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none h-full"
              style={{ scrollbarWidth: 'none' }}>

              {/* Slide 1: Free Pack */}
              <div className="snap-start flex-none w-full px-6 h-full">
                <div className="max-w-sm mx-auto h-full">
                  <div className={`bg-vintage-charcoal/50 border ${isArb ? 'border-amber-400/50' : 'border-vintage-gold/30'} rounded-xl p-3 transition-all shadow-xl h-full flex flex-col`}>

              {/* Pack Header */}
              <div className="flex items-center gap-3 mb-2">
                <img src={getAssetUrl("/pack-cover.png")} alt="Pack" className="w-12 h-12 object-contain drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
                <div className="flex-1">
                  <h3 className="text-base font-display font-bold text-vintage-gold">
                    Nothing Packs (non LTC)
                  </h3>
                  <p className="text-vintage-ice/60 text-xs">{t('shopNothingCardPerPack' as any)}</p>
                </div>
                <div style={{ padding:"4px 12px", borderRadius:"999px", fontSize:"12px", fontWeight:700, background:"#D4A843", color:"#000" }}>
                  {packsPerDay}/day
                </div>
              </div>

              {/* Nothing Card Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 mb-2 shadow-lg">
                <p className="text-amber-300/80 text-xs text-center">
                  {t('shopNothingCardWarning')}
                </p>
              </div>

              {/* Drop Rates */}
              <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-1.5 mb-2 text-xs shadow-lg">
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div>
                    <span className="text-vintage-ice/50 block">Common</span>
                    <span className="text-vintage-ice font-bold">93%</span>
                  </div>
                  <div>
                    <span className="text-blue-400/70 block">Rare</span>
                    <span className="text-blue-400 font-bold">6%</span>
                  </div>
                  <div>
                    <span className="text-purple-400/70 block">Epic</span>
                    <span className="text-purple-400 font-bold">0.8%</span>
                  </div>
                  <div>
                    <span className="text-yellow-400/70 block">Legend</span>
                    <span className="text-yellow-400 font-bold">0.2%</span>
                  </div>
                </div>
              </div>

              {/* ARB Mode Toggle */}
              {arbSupported && (
                <div className="flex items-center justify-between rounded-lg px-3 py-1.5 mb-2 border bg-vintage-black/30 border-vintage-gold/20 shadow-lg">
                  <div>
                    <p className="font-bold text-sm text-vintage-ice/70">
                      {t('shopArbMode' as any)}
                    </p>
                    <p className="text-vintage-ice/50 text-xs">{t('shopArbModeDesc' as any)}</p>
                  </div>
                  <div style={{ display:"flex", gap:"4px", background:"rgba(0,0,0,0.6)", padding:"4px", borderRadius:"8px" }}>
                    <button
                      onClick={() => { AudioManager.buttonClick(); handleSwitchChain('base'); }}
                      className={`px-3 py-1 font-bold text-xs uppercase cursor-pointer rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] ${effectiveChain === 'base' ? 'ct-base-active' : 'ct-base-inactive'}`}
                    >BASE</button>
                    <button
                      onClick={() => { AudioManager.buttonClick(); handleSwitchChain('arbitrum'); }}
                      className={`px-3 py-1 font-bold text-xs uppercase cursor-pointer rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] ${effectiveChain === 'arbitrum' ? 'ct-arb-active' : 'ct-arb-inactive'}`}
                    >ARB</button>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              <div className="mt-auto">
                {dailyFreeStatus?.canClaim ? (
                  <button
                    onClick={() => { AudioManager.buttonClick(); handleClaimDailyFree(); }}
                    onMouseEnter={() => AudioManager.buttonHover()}
                    disabled={claimingDaily}
                    className="shop-claim-btn w-full h-9 font-display font-bold rounded transition-all disabled:opacity-50 text-vintage-black active:translate-y-[4px] bg-vintage-gold bg-gradient-to-b from-vintage-gold to-vintage-burnt-gold hover:from-yellow-400 hover:to-amber-500"
                                      >
                    {claimingDaily ? "..." : isArb ? t('shopClaimFreePackArb' as any) : t('shopClaimFreePack' as any)}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full h-9 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold/70 font-display font-bold rounded cursor-not-allowed"
                  >
                    {dailyFreeStatus?.timeRemaining
                      ? `${t('shopNextPackIn' as any)} ${formatTimeRemaining(dailyFreeStatus.timeRemaining)}`
                      : t('shopAlreadyClaimed' as any)}
                  </button>
                )}
              </div>
            </div>
          </div>

              </div>

              {/* Slide 2: VMW LTC Pack */}
              <div className="snap-start flex-none w-full px-6 h-full">
                <div className="max-w-sm mx-auto h-full">
                  <VMWPackCard address={address} onMintSuccess={(qty) => setVmwMint(m => ({ trigger: m.trigger + 1, qty }))} />
                </div>
              </div>

            </div>{/* /slides */}
          </div>{/* /carousel */}

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 -mt-1 mb-2">
            <div className={`h-1.5 rounded-full transition-all ${activeSlide === 0 ? 'w-4 bg-vintage-gold' : 'w-1.5 bg-white/30'}`} />
            <div className={`h-1.5 rounded-full transition-all ${activeSlide === 1 ? 'w-4 bg-vintage-gold' : 'w-1.5 bg-white/30'}`} />
          </div>

          {/* Action Buttons */}
          {activeSlide === 0 ? (
            <>
              <div className="max-w-sm mx-auto grid grid-cols-2 gap-3 mb-4">
                <button
                  onMouseEnter={() => AudioManager.buttonHover()}
                  onClick={() => {
                    AudioManager.buttonClick();
                    if (playerPacks && playerPacks.length > 0) {
                      const initialQuantities: Record<string, number> = {};
                      playerPacks.forEach((pack: any) => {
                        initialQuantities[pack._id] = 1;
                      });
                      setOpenQuantities(initialQuantities);
                      setShowPacksModal(true);
                    }
                  }}
                  disabled={openingPack}
                  className="shop-open-btn py-3 px-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-[#FFD400] hover:bg-[#ECC200] text-black active:translate-x-[3px] active:translate-y-[3px]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12v10H4V12" />
                    <path d="M2 7h20v5H2z" />
                    <path d="M12 22V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                  <span>{t('shopOpenPacks')} {totalUnopenedPacks > 0 ? `(${totalUnopenedPacks})` : ''}</span>
                </button>
                <button
                  onMouseEnter={() => AudioManager.buttonHover()}
                  onClick={() => { AudioManager.buttonClick(); router.push('/shop/burn'); }}
                  className="shop-burn-btn py-3 px-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-[#CC2222] hover:bg-[#AA1111] text-white active:translate-x-[3px] active:translate-y-[3px]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span>{t('shopBurnCards')} {playerCards && playerCards.length > 0 ? `(${playerCards.length})` : ''}</span>
                </button>
              </div>
              <div className="max-w-sm mx-auto">
                <p className="text-xs text-vintage-ice/40 text-center mb-2">Burn Values (VBMS)</p>
                <div className="grid grid-cols-4 gap-1 text-xs text-center">
                  <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
                    <span className="text-vintage-ice/50 block">Common</span>
                    <span className="text-green-400 font-bold">200</span>
                  </div>
                  <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
                    <span className="text-blue-400/70 block">Rare</span>
                    <span className="text-green-400 font-bold">1.1k</span>
                  </div>
                  <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
                    <span className="text-purple-400/70 block">Epic</span>
                    <span className="text-green-400 font-bold">4k</span>
                  </div>
                  <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
                    <span className="text-yellow-400/70 block">Legend</span>
                    <span className="text-green-400 font-bold">40k</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <VMWActionButtons address={address} autoOpenTrigger={vmwMint.trigger} mintQty={vmwMint.qty} onModalStateChange={setVmwModalOpen} />
          )}

        </div>
      </div>


      {/* BOTTOM BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-vintage-charcoal/90 border-t border-vintage-gold/20">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-vintage-ice/60 hover:text-vintage-gold transition-colors text-sm"
          >
            Help
          </button>

          <div className="text-right">
            <p className="text-xs text-vintage-ice/50">Your Packs</p>
            <p className="text-sm font-bold text-vintage-gold">{totalUnopenedPacks}</p>
          </div>
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
                <h4 className="font-bold text-green-400 mb-1">Daily Free Pack</h4>
                <p className="text-vintage-ice/70 text-xs">Claim 1 free pack every 24 hours. Switch to Arbitrum mode to get 3 packs per day.</p>
              </div>

              <div>
                <h4 className="font-bold text-blue-400 mb-1">Arbitrum Mode</h4>
                <p className="text-vintage-ice/70 text-xs">Connect on Arbitrum to triple your daily free packs (3/day instead of 1/day).</p>
              </div>

              <div>
                <h4 className="font-bold text-red-400 mb-1">Burn Cards</h4>
                <p className="text-vintage-ice/70 text-xs">Convert unwanted cards back to VBMS. Rare+ cards return more than pack cost!</p>
              </div>

              <div className="bg-vintage-black/30 rounded p-3 text-xs">
                <p className="text-vintage-ice/60 mb-2">Power Values:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>Common: <b className="text-vintage-ice">5</b></span>
                  <span>Rare: <b className="text-blue-400">20</b></span>
                  <span>Epic: <b className="text-purple-400">80</b></span>
                  <span>Legend: <b className="text-yellow-400">240</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pack Opening Animation */}
      {revealedCards.length > 0 && (
        <PackOpeningAnimation
          cards={revealedCards}
          packType="Daily Pack"
          onClose={() => setRevealedCards([])}
        />
      )}

      {/* Packs Selection Modal */}
      {showPacksModal && playerPacks && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPacksModal(false)}>
          <div className="bg-vintage-charcoal border border-vintage-gold/50 rounded-xl p-4 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-display font-bold text-vintage-gold">Your Packs</h3>
              <button onClick={() => setShowPacksModal(false)} className="text-vintage-ice/70 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-3">
              {playerPacks.map((pack: any) => {
                const packName = pack.packInfo?.name || pack.packType;
                const currentQty = openQuantities[pack._id] || 1;

                return (
                  <div key={pack._id} className="bg-vintage-black/30 border border-vintage-gold/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={getAssetUrl("/pack-cover.png")} alt="Pack" className="w-10 h-10 object-contain" />
                        <div>
                          <p className="font-bold text-sm text-vintage-gold">{packName}</p>
                          <p className="text-vintage-ice/50 text-xs">{pack.unopened} available</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenQuantities(prev => ({
                              ...prev,
                              [pack._id]: Math.max(1, (prev[pack._id] || 1) - 1)
                            }));
                          }}
                          className="w-8 h-8 rounded bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold font-bold hover:bg-vintage-gold/20"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={pack.unopened}
                          value={currentQty}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(pack.unopened, parseInt(e.target.value) || 1));
                            setOpenQuantities(prev => ({ ...prev, [pack._id]: val }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 h-8 text-center bg-vintage-black border border-vintage-gold/30 rounded text-vintage-ice font-bold text-sm"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenQuantities(prev => ({
                              ...prev,
                              [pack._id]: Math.min(pack.unopened, (prev[pack._id] || 1) + 1)
                            }));
                          }}
                          className="w-8 h-8 rounded bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold font-bold hover:bg-vintage-gold/20"
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenQuantities(prev => ({ ...prev, [pack._id]: pack.unopened }));
                          }}
                          className="px-2 h-8 rounded bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold text-xs font-bold hover:bg-vintage-gold/20"
                        >
                          MAX
                        </button>
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShowPacksModal(false);
                          setOpeningPack(true);
                          try {
                            const qty = openQuantities[pack._id] || 1;
                            if (qty >= pack.unopened) {
                              const result = await openAllPacks({ address: address!, packId: pack._id });
                              setRevealedCards(result.cards);
                              setNotification({
                                type: 'success',
                                message: `Opened ${result.packsOpened} packs! Got ${result.cards.length} cards!`
                              });
                            } else if (qty === 1) {
                              const result = await openPack({ address: address!, packId: pack._id });
                              setRevealedCards(result.cards);
                            } else {
                              const allCards: any[] = [];
                              for (let i = 0; i < qty; i++) {
                                const result = await openPack({ address: address!, packId: pack._id });
                                allCards.push(...result.cards);
                              }
                              setRevealedCards(allCards);
                              setNotification({
                                type: 'success',
                                message: `Opened ${qty} packs! Got ${allCards.length} cards!`
                              });
                            }
                          } catch (error: any) {
                            setNotification({
                              type: 'error',
                              message: error.message || 'Failed to open packs'
                            });
                          } finally {
                            setOpeningPack(false);
                          }
                        }}
                        disabled={openingPack}
                        className="px-4 h-8 rounded-lg font-display font-bold text-sm bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold text-black transition-all"
                      >
                        {openingPack ? '...' : 'OPEN'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {playerPacks.length === 0 && (
              <div className="text-center py-8 text-vintage-ice/40">
                <p>No packs to open</p>
                <p className="text-sm mt-1">Claim your daily free pack!</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
