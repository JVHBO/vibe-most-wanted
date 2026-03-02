"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { ShopNotification } from "./ShopNotification";
import { PackOpeningAnimation } from "./PackOpeningAnimation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { isMiniappMode, isWarpcastClient } from "@/lib/utils/miniapp";
import { AudioManager } from "@/lib/audio-manager";


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
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
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
          <button
            onClick={() => { AudioManager.buttonNav(); router.push("/"); }}
            onMouseEnter={() => AudioManager.buttonHover()}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-bold uppercase tracking-wider transition"
            style={{ boxShadow: "2px 2px 0px #000" }}
          >
            ← BACK
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-display font-bold text-vintage-gold tracking-wider whitespace-nowrap">{t('shopTitle')}</h1>

          <div className="text-right">
            <p className="text-[10px] text-vintage-ice/50 uppercase tracking-wider">Your Cards</p>
            <p className="text-sm font-bold text-vintage-gold leading-tight">{playerCards?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="absolute inset-0 pt-14 pb-16 overflow-hidden flex flex-col">
        <div className="relative z-10 px-4 py-2 flex-1 flex flex-col justify-center">

          {/* Daily Free Pack Card */}
          <div className="max-w-sm mx-auto mb-4">
            <div className={`bg-vintage-charcoal/50 border ${isArb ? 'border-amber-400/50' : 'border-vintage-gold/30'} rounded-xl p-4 transition-all`}>

              {/* Pack Header */}
              <div className="flex items-center gap-4 mb-3">
                <img src={getAssetUrl("/pack-cover.png")} alt="Pack" className="w-16 h-16 object-contain drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
                <div className="flex-1">
                  <h3 className="text-xl font-display font-bold text-vintage-gold">
                    {t('shopDailyFreePack' as any)}
                  </h3>
                  <p className="text-vintage-ice/60 text-xs">{t('shopNothingCardPerPack' as any)}</p>
                </div>
                <div style={{ padding:"4px 12px", borderRadius:"999px", fontSize:"12px", fontWeight:700, background:"#F59E0B", color:"#000" }}>
                  {isArb ? t('shopDayArb' as any) : t('shopDayBase' as any)}
                </div>
              </div>

              {/* Nothing Card Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3">
                <p className="text-amber-300/80 text-xs text-center">
                  {t('shopNothingCardWarning')}
                </p>
              </div>

              {/* Drop Rates */}
              <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-2 mb-3 text-xs">
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
                <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 border bg-vintage-black/30 border-vintage-gold/20">
                  <div>
                    <p className="font-bold text-sm text-vintage-ice/70">
                      {t('shopArbMode' as any)}
                    </p>
                    <p className="text-vintage-ice/50 text-xs">{t('shopArbModeDesc' as any)}</p>
                  </div>
                  <div style={{ display:"flex", gap:"4px", background:"rgba(0,0,0,0.6)", padding:"4px", borderRadius:"8px" }}>
                    <button
                      onClick={() => { AudioManager.buttonClick(); handleSwitchChain('base'); }}
                      className={`px-3 py-1 font-bold text-xs uppercase cursor-pointer rounded ${effectiveChain === 'base' ? 'ct-base-active' : 'ct-base-inactive'}`}
                    >BASE</button>
                    <button
                      onClick={() => { AudioManager.buttonClick(); handleSwitchChain('arbitrum'); }}
                      className={`px-3 py-1 font-bold text-xs uppercase cursor-pointer rounded ${effectiveChain === 'arbitrum' ? 'ct-arb-active' : 'ct-arb-inactive'}`}
                    >ARB</button>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              <div>
                {dailyFreeStatus?.canClaim ? (
                  <button
                    onClick={() => { AudioManager.buttonClick(); handleClaimDailyFree(); }}
                    onMouseEnter={() => AudioManager.buttonHover()}
                    disabled={claimingDaily}
                    className={`w-full h-11 font-display font-bold rounded-lg transition-all disabled:opacity-50 text-vintage-black shadow-[0_4px_0_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_rgba(0,0,0,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] ${isArb ? 'bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500' : 'bg-gradient-to-b from-vintage-gold to-vintage-burnt-gold hover:from-yellow-400 hover:to-amber-500'}`}
                  >
                    {claimingDaily ? "..." : isArb ? t('shopClaimFreePackArb' as any) : t('shopClaimFreePack' as any)}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full h-11 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold/70 font-display font-bold rounded-lg cursor-not-allowed"
                  >
                    {dailyFreeStatus?.timeRemaining
                      ? `${t('shopNextPackIn' as any)} ${formatTimeRemaining(dailyFreeStatus.timeRemaining)}`
                      : t('shopAlreadyClaimed' as any)}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="max-w-sm mx-auto grid grid-cols-2 gap-3 mb-4">
            {/* Your Packs Button */}
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
              className="py-3 px-4 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/30"
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

            {/* Burn Cards Button */}
            <button
              onMouseEnter={() => AudioManager.buttonHover()}
              onClick={() => { AudioManager.buttonClick(); router.push('/shop/burn'); }}
              className="py-3 px-4 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
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

          {/* Burn Values Info */}
          <div className="max-w-sm mx-auto">
            <p className="text-xs text-vintage-ice/40 text-center mb-2">Burn Values (VBMS)</p>
            <div className="grid grid-cols-4 gap-1 text-xs text-center">
              <div className="rounded p-2 bg-vintage-charcoal/30">
                <span className="text-vintage-ice/50 block">Common</span>
                <span className="text-green-400 font-bold">200</span>
              </div>
              <div className="rounded p-2 bg-vintage-charcoal/30">
                <span className="text-blue-400/70 block">Rare</span>
                <span className="text-green-400 font-bold">1.1k</span>
              </div>
              <div className="rounded p-2 bg-vintage-charcoal/30">
                <span className="text-purple-400/70 block">Epic</span>
                <span className="text-green-400 font-bold">4k</span>
              </div>
              <div className="rounded p-2 bg-vintage-charcoal/30">
                <span className="text-yellow-400/70 block">Legend</span>
                <span className="text-green-400 font-bold">40k</span>
              </div>
            </div>
          </div>

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

          <div className="text-center">
            <p className="text-xs text-vintage-ice/50">Daily Packs</p>
            <p className={`text-sm font-bold ${isArb ? 'text-blue-400' : 'text-green-400'}`}>
              {packsPerDay}/day {isArb ? '(ARB)' : ''}
            </p>
          </div>

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
