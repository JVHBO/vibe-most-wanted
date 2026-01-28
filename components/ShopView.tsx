"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ShopNotification } from "./ShopNotification";
import { PackOpeningAnimation } from "./PackOpeningAnimation";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { useArbValidator, ARB_CLAIM_TYPE } from "@/lib/hooks/useArbValidator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { getAssetUrl } from "@/lib/ipfs-assets";

interface ShopViewProps {
  address: string | undefined;
}

export function ShopView({ address }: ShopViewProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // Fetch data
  const shopPacks = useQuery(api.cardPacks.getShopPacks);
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const playerCards = useQuery(api.cardPacks.getPlayerCards, address ? { address } : "skip");
  const lockedCardIds = useQuery(api.cardPacks.getLockedFreeCardIds, address ? { address } : "skip");
  const dailyFreeStatus = useQuery(api.cardPacks.canClaimDailyFree, address ? { address } : "skip");
  const hasReceivedWelcomePack = useQuery(api.welcomePack.hasReceivedWelcomePack, address ? { address } : "skip");

  // Mutations
  const openPack = useMutation(api.cardPacks.openPack);
  const openAllPacks = useMutation(api.cardPacks.openAllPacks);
  const buyPackWithLuckBoost = useMutation(api.cardPacks.buyPackWithLuckBoost);
  const claimDailyFree = useMutation(api.cardPacks.claimDailyFreePack);
  const claimWelcomePack = useMutation(api.welcomePack.claimWelcomePack);

  // VBMS Blockchain hooks
  const { address: walletAddress } = useAccount();
  const effectiveAddress = address || walletAddress;

  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(effectiveAddress);
  const { transfer, isPending: isTransferring, error: transferError } = useFarcasterTransferVBMS();
  const { validateOnArb } = useArbValidator();

  // State
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [luckBoost, setLuckBoost] = useState(false); // Elite odds for 5x price
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingWelcome, setClaimingWelcome] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [openQuantities, setOpenQuantities] = useState<Record<string, number>>({});

  // Prices
  const NORMAL_PRICE = 1000;
  const BOOSTED_PRICE = 5000;
  const currentPrice = luckBoost ? BOOSTED_PRICE : NORMAL_PRICE;

  // Odds for display
  const NORMAL_ODDS = { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 };
  const ELITE_ODDS = { Common: 82, Rare: 14, Epic: 3.5, Legendary: 0.5 }; // NERFED for ROI ~0.68x
  const currentOdds = luckBoost ? ELITE_ODDS : NORMAL_ODDS;

  // Handle purchase with VBMS (blockchain)
  const handleBuyWithVBMS = async (packType: string, packPrice: number) => {
    if (!effectiveAddress) {
      setNotification({
        type: 'error',
        message: t('shopConnectWallet')
      });
      return;
    }

    const totalVBMS = (packPrice * quantity).toString();

    // Check balance
    if (parseFloat(vbmsBalance) < parseFloat(totalVBMS)) {
      setNotification({
        type: 'error',
        message: t('shopInsufficientVbms', { amount: totalVBMS })
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Transfer VBMS to pool
      setNotification({
        type: 'success',
        message: t('shopTransferring')
      });

      console.log('💸 Initiating transfer...');
      const transferHash = await transfer(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(totalVBMS));

      console.log('✅ Transfer confirmed:', transferHash);

      // Step 2: Call backend to verify and mint packs
      setNotification({
        type: 'success',
        message: t('shopTransferConfirmed')
      });

      console.log('💎 Calling backend with tx hash:', transferHash);

      const response = await fetch('/api/shop/buy-with-vbms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          packType,
          quantity,
          txHash: transferHash,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response (not JSON)');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      setNotification({
        type: 'success',
        message: `Bought ${data.packsReceived} ${packType} pack(s) for ${data.vbmsSpent} VBMS! 💎`
      });

      refetchVBMS();
      setQuantity(1);
    } catch (error: any) {
      console.error('❌ Pack purchase error:', error);
      setNotification({
        type: 'error',
        message: error.message || "Failed to buy with VBMS"
      });
    } finally {
      setLoading(false);
    }
  };


  // Handle pack opening
  const handleOpenPack = async (packId: Id<"cardPacks">) => {
    if (!address) return;

    setOpeningPack(true);
    try {
      const result = await openPack({
        address,
        packId,
      });

      setRevealedCards(result.cards);
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || "Failed to open pack"
      });
    } finally {
      setOpeningPack(false);
    }
  };

  // Handle opening ALL packs at once
  const handleOpenAllPacks = async (packId: Id<"cardPacks">) => {
    if (!address) return;

    setOpeningPack(true);
    try {
      const result = await openAllPacks({
        address,
        packId,
      });

      setRevealedCards(result.cards);
      setNotification({
        type: 'success',
        message: `Opened ${result.packsOpened} packs! Got ${result.cards.length} cards!`
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || "Failed to open packs"
      });
    } finally {
      setOpeningPack(false);
    }
  };

  // Handle daily free claim - gives a pack to open (requires 0 VBMS TX for verification)
  const handleClaimDailyFree = async () => {
    if (!address || claimingDaily || !effectiveAddress) return;

    setClaimingDaily(true);
    try {
      // Step 1: Claim the pack in backend
      await claimDailyFree({ address });

      // Step 2: Validate on Arbitrum
      await validateOnArb(0, ARB_CLAIM_TYPE.FREE_CARD);
      setNotification({
        type: 'success',
        message: `🎁 Free pack claimed! Open it below.`
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

  // Handle welcome pack claim
  const handleClaimWelcomePack = async () => {
    if (!address || claimingWelcome) return;

    setClaimingWelcome(true);
    try {
      await claimWelcomePack({ address });
      setNotification({
        type: 'success',
        message: t('shopWelcomePackClaimed')
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || "Failed to claim welcome pack"
      });
    } finally {
      setClaimingWelcome(false);
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
        <div className="flex items-center justify-between">
          {/* Back button - always go to home, not browser history */}
          <button
            onClick={() => router.push("/")}
            className="group px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-burnt-gold hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform">←</span> {t('shopHome')}
          </button>

          {/* Title - centered */}
          <h1 className="text-2xl font-display font-bold text-vintage-gold tracking-wider">{t('shopTitle')}</h1>

          {/* Balance */}
          <div className="text-right">
            <p className="text-xs text-vintage-ice/60">{t('shopBalance')}</p>
            <p className="text-sm font-display font-bold text-purple-400">{parseFloat(vbmsBalance).toLocaleString()} VBMS</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="absolute inset-0 pt-14 pb-16 overflow-hidden flex flex-col">
        <div className="relative z-10 px-4 py-2 flex-1 flex flex-col justify-center">

          {/* Welcome Gift Banner - Shows if user hasn't claimed */}
          {hasReceivedWelcomePack === false && (
            <div className="max-w-sm mx-auto mb-4">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🎁</span>
                  <div>
                    <h3 className="text-lg font-display font-bold text-green-400">{t('shopWelcomeGift')}</h3>
                    <p className="text-green-300/70 text-xs">{t('shopWelcomeGiftDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={handleClaimWelcomePack}
                  disabled={claimingWelcome}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-display font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-green-500/30"
                >
                  {claimingWelcome ? '...' : t('shopClaimWelcome')}
                </button>
              </div>
            </div>
          )}

          {/* Pack Purchase Card - Compact */}
          <div className="max-w-sm mx-auto mb-4">
            <div className={`bg-vintage-charcoal/50 border ${luckBoost ? 'border-yellow-400/50' : 'border-vintage-gold/30'} rounded-xl p-4 transition-all`}>

              {/* Pack Header with Image */}
              <div className="flex items-center gap-4 mb-3">
                <img src={getAssetUrl("/pack-cover.png")} alt="Pack" className={`w-16 h-16 object-contain ${luckBoost ? 'animate-pulse' : ''}`} />
                <div className="flex-1">
                  <h3 className="text-xl font-display font-bold text-vintage-gold">
                    {luckBoost ? t('shopLuckyPack') : t('shopBasicPack')}
                  </h3>
                  <p className="text-vintage-ice/60 text-xs">1 Nothing card per pack</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${luckBoost ? 'bg-yellow-500 text-black' : 'bg-vintage-gold/20 text-vintage-gold'}`}>
                  {luckBoost ? t('shopBoosted') : t('shopBasic')}
                </div>
              </div>

              {/* Nothing Card Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3">
                <p className="text-amber-300/80 text-xs text-center">
                  {t('shopNothingCardWarning')}
                </p>
              </div>

              {/* Drop Rates - Compact Grid */}
              <div className={`rounded-lg p-2 mb-3 border text-xs ${luckBoost ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-vintage-black/30 border-vintage-gold/20'}`}>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div>
                    <span className="text-vintage-ice/50 block">Common</span>
                    <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-vintage-ice'}`}>{currentOdds.Common}%</span>
                  </div>
                  <div>
                    <span className="text-blue-400/70 block">Rare</span>
                    <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-blue-400'}`}>{currentOdds.Rare}%</span>
                  </div>
                  <div>
                    <span className="text-purple-400/70 block">Epic</span>
                    <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-purple-400'}`}>{currentOdds.Epic}%</span>
                  </div>
                  <div>
                    <span className="text-yellow-400/70 block">Legend</span>
                    <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-yellow-400'}`}>{currentOdds.Legendary}%</span>
                  </div>
                </div>
              </div>

              {/* Luck Boost Toggle - Inline */}
              <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mb-3">
                <div>
                  <p className="text-yellow-400 font-bold text-sm">{t('shopLuckBoost')}</p>
                  <p className="text-vintage-ice/50 text-xs">{t('shopLuckBoostDesc')}</p>
                </div>
                <button
                  onClick={() => setLuckBoost(!luckBoost)}
                  className={`w-14 h-7 rounded-full transition-all relative ${luckBoost ? 'bg-yellow-500' : 'bg-vintage-charcoal border border-vintage-gold/30'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${luckBoost ? 'right-1 bg-black' : 'left-1 bg-vintage-gold/50'}`} />
                </button>
              </div>

              {/* Price + Quantity + Buy - All in one row */}
              <div className="flex items-center gap-2">
                {/* Quantity */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold font-bold hover:bg-vintage-gold/20"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-12 h-8 text-center bg-vintage-black border border-vintage-gold/30 rounded text-vintage-ice font-bold text-sm"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-8 h-8 rounded bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold font-bold hover:bg-vintage-gold/20"
                  >
                    +
                  </button>
                </div>

                {/* Buy Button */}
                <div className="flex-1">
                  {dailyFreeStatus?.canClaim && !luckBoost && quantity === 1 ? (
                    <button
                      onClick={handleClaimDailyFree}
                      disabled={claimingDaily}
                      className="w-full h-10 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-display font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      {claimingDaily ? "..." : t('shopFree')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyWithVBMS(luckBoost ? 'boosted' : 'basic', currentPrice)}
                      disabled={loading || parseFloat(vbmsBalance) < currentPrice * quantity}
                      className={`w-full h-10 ${luckBoost ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'} disabled:bg-vintage-charcoal/50 text-white disabled:text-vintage-ice/30 font-display font-bold rounded-lg transition-all disabled:cursor-not-allowed`}
                    >
                      {loading ? "..." : `${(currentPrice * quantity).toLocaleString()} VBMS`}
                    </button>
                  )}
                </div>
              </div>

              {/* Daily free timer */}
              {dailyFreeStatus && !dailyFreeStatus.canClaim && dailyFreeStatus.timeRemaining && (
                <p className="text-xs text-center text-green-400/70 mt-2">
                  Free pack in {formatTimeRemaining(dailyFreeStatus.timeRemaining)}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="max-w-sm mx-auto grid grid-cols-2 gap-3 mb-4">
            {/* Your Packs Button - Opens modal to select packs */}
            <button
              onClick={() => {
                if (playerPacks && playerPacks.length > 0) {
                  // Initialize quantities for each pack type
                  const initialQuantities: Record<string, number> = {};
                  playerPacks.forEach((pack: any) => {
                    initialQuantities[pack._id] = 1;
                  });
                  setOpenQuantities(initialQuantities);
                  setShowPacksModal(true);
                }
              }}
              disabled={!playerPacks || totalUnopenedPacks === 0 || openingPack}
              className={`py-3 px-4 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 ${
                totalUnopenedPacks > 0
                  ? 'bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/30'
                  : 'bg-vintage-charcoal/30 border border-vintage-gold/20 text-vintage-ice/30 cursor-not-allowed'
              }`}
            >
              {/* Gift/unbox icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12v10H4V12" />
                <path d="M2 7h20v5H2z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              <span>{t('shopOpenPacks')} {totalUnopenedPacks > 0 ? `(${totalUnopenedPacks})` : ''}</span>
            </button>

            {/* Burn Cards Button - Navigate to burn page */}
            <button
              onClick={() => router.push('/shop/burn')}
              disabled={!playerCards || playerCards.length === 0}
              className={`py-3 px-4 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 ${
                playerCards && playerCards.length > 0
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                  : 'bg-vintage-charcoal/30 border border-vintage-gold/20 text-vintage-ice/30 cursor-not-allowed'
              }`}
            >
              {/* Trash/delete icon */}
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

          {/* Burn Values Info - Compact - Changes with Luck Pack */}
          <div className="max-w-sm mx-auto">
            <p className="text-xs text-vintage-ice/40 text-center mb-2">Burn Values (VBMS)</p>
            <div className="grid grid-cols-4 gap-1 text-xs text-center">
              <div className={`rounded p-2 ${luckBoost ? 'bg-yellow-500/10' : 'bg-vintage-charcoal/30'}`}>
                <span className="text-vintage-ice/50 block">Common</span>
                <span className="text-green-400 font-bold">{luckBoost ? '1k' : '200'}</span>
              </div>
              <div className={`rounded p-2 ${luckBoost ? 'bg-yellow-500/10' : 'bg-vintage-charcoal/30'}`}>
                <span className="text-blue-400/70 block">Rare</span>
                <span className="text-green-400 font-bold">{luckBoost ? '5.5k' : '1.1k'}</span>
              </div>
              <div className={`rounded p-2 ${luckBoost ? 'bg-yellow-500/10' : 'bg-vintage-charcoal/30'}`}>
                <span className="text-purple-400/70 block">Epic</span>
                <span className="text-green-400 font-bold">{luckBoost ? '20k' : '4k'}</span>
              </div>
              <div className={`rounded p-2 ${luckBoost ? 'bg-yellow-500/10' : 'bg-vintage-charcoal/30'}`}>
                <span className="text-yellow-400/70 block">Legend</span>
                <span className="text-green-400 font-bold">{luckBoost ? '200k' : '40k'}</span>
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
            className="text-vintage-ice/60 hover:text-vintage-gold transition-colors text-sm flex items-center gap-1"
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">?</span>
            <span>Help</span>
          </button>

          <div className="text-center">
            <p className="text-xs text-vintage-ice/50">Pack Price</p>
            <p className={`text-sm font-bold ${luckBoost ? 'text-yellow-400' : 'text-purple-400'}`}>
              {currentPrice.toLocaleString()} VBMS
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-vintage-ice/50">Your Cards</p>
            <p className="text-sm font-bold text-vintage-gold">{playerCards?.length || 0}</p>
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
                <h4 className="font-bold text-vintage-gold mb-1">Basic Pack</h4>
                <p className="text-vintage-ice/70 text-xs">1,000 VBMS per pack. Contains 1 Nothing card with random rarity.</p>
              </div>

              <div>
                <h4 className="font-bold text-yellow-400 mb-1">Luck Boost</h4>
                <p className="text-vintage-ice/70 text-xs">5x price (5,000 VBMS) for significantly better drop rates.</p>
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
          packType={luckBoost ? 'Lucky Pack' : 'Basic Pack'}
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
                const borderClass = pack.packType === 'boosted'
                  ? 'border-yellow-500/30'
                  : pack.packType === 'premium'
                    ? 'border-purple-500/30'
                    : 'border-vintage-gold/30';

                return (
                  <div key={pack._id} className={`bg-vintage-black/30 border ${borderClass} rounded-lg p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={getAssetUrl("/pack-cover.png")} alt="Pack" className="w-10 h-10 object-contain" />
                        <div>
                          <p className={`font-bold text-sm ${pack.packType === 'boosted' ? 'text-yellow-400' : 'text-vintage-gold'}`}>
                            {packName}
                          </p>
                          <p className="text-vintage-ice/50 text-xs">{pack.unopened} available</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quantity selector */}
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

                      {/* Open button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShowPacksModal(false);
                          setOpeningPack(true);
                          try {
                            const qty = openQuantities[pack._id] || 1;
                            if (qty >= pack.unopened) {
                              // Open all
                              const result = await openAllPacks({ address: address!, packId: pack._id });
                              setRevealedCards(result.cards);
                              setNotification({
                                type: 'success',
                                message: `Opened ${result.packsOpened} packs! Got ${result.cards.length} cards!`
                              });
                            } else if (qty === 1) {
                              // Open single
                              const result = await openPack({ address: address!, packId: pack._id });
                              setRevealedCards(result.cards);
                            } else {
                              // Open multiple (one by one)
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
                        className={`px-4 h-8 rounded-lg font-display font-bold text-sm transition-all ${
                          pack.packType === 'boosted'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                            : 'bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold text-black'
                        }`}
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
                <p className="text-sm mt-1">Buy packs above!</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
