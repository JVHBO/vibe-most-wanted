"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ShopNotification } from "./ShopNotification";
import { PackOpeningAnimation } from "./PackOpeningAnimation";
import { BurnCardsModal } from "./BurnCardsModal";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShopViewProps {
  address: string | undefined;
}

export function ShopView({ address }: ShopViewProps) {
  const { t } = useLanguage();

  // Fetch data
  const shopPacks = useQuery(api.cardPacks.getShopPacks);
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const playerCards = useQuery(api.cardPacks.getPlayerCards, address ? { address } : "skip");
  const lockedCardIds = useQuery(api.cardPacks.getLockedFreeCardIds, address ? { address } : "skip");
  const dailyFreeStatus = useQuery(api.cardPacks.canClaimDailyFree, address ? { address } : "skip");
  // 🚀 BANDWIDTH FIX: Removed unused profile query (was fetching but never used)

  // Mutations
  const openPack = useMutation(api.cardPacks.openPack);
  const openAllPacks = useMutation(api.cardPacks.openAllPacks);
  const buyPackWithLuckBoost = useMutation(api.cardPacks.buyPackWithLuckBoost);
  const claimDailyFree = useMutation(api.cardPacks.claimDailyFreePack);

  // VBMS Blockchain hooks (using Farcaster-compatible hook for miniapp)
  const { address: walletAddress } = useAccount();
  // Use address prop (works in miniapp) OR walletAddress (works in web) - prop takes priority
  const effectiveAddress = address || walletAddress;

  // 🔍 Debug: Log address values
  console.log('[ShopView] 🔍 Address values:', {
    addressProp: address,
    walletAddress,
    effectiveAddress,
  });

  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(effectiveAddress);
  const { transfer, isPending: isTransferring, error: transferError } = useFarcasterTransferVBMS();

  // 🔍 Debug: Log balance
  console.log('[ShopView] 💰 VBMS Balance:', vbmsBalance);

  // State
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [luckBoost, setLuckBoost] = useState(false); // Elite odds for 5x price
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);

  // Prices
  const NORMAL_PRICE = 1000;
  const BOOSTED_PRICE = 5000;
  const currentPrice = luckBoost ? BOOSTED_PRICE : NORMAL_PRICE;

  // Odds for display
  const NORMAL_ODDS = { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 };
  const ELITE_ODDS = { Common: 60, Rare: 30, Epic: 8, Legendary: 2 };
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

  // Handle daily free claim
  const handleClaimDailyFree = async () => {
    if (!address || claimingDaily) return;

    setClaimingDaily(true);
    try {
      const result = await claimDailyFree({ address });
      // Show the card in pack opening animation
      setRevealedCards([result.card]);
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

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>{t('shopTitle')}</h2>
          <p className="text-vintage-ice/70">Please connect your wallet to access the shop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2">{t('shopSubtitle')}</h1>
        <p className="text-vintage-ice/70">{t('shopDescription')}</p>
      {/* Custom Notification */}
      {notification && (
        <ShopNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-display font-bold text-vintage-gold">❓ How It Works</h3>
              <button onClick={() => setShowHelpModal(false)} className="text-vintage-ice/70 hover:text-white text-2xl">&times;</button>
            </div>

            {/* Pack Info */}
            <div className="mb-4">
              <h4 className="text-lg font-bold text-purple-400 mb-2">📦 Basic Pack</h4>
              <p className="text-vintage-ice/70 text-sm mb-2">Each pack costs <span className="text-purple-400 font-bold">1,000 VBMS</span> and contains <span className="text-vintage-gold font-bold">1 Nothing card</span>.</p>
              <div className="bg-vintage-black/30 rounded p-2 text-xs mb-2">
                <p className="text-vintage-ice/60">Drop Rates:</p>
                <p>Common: <span className="text-vintage-ice">93%</span> | Rare: <span className="text-blue-400">6%</span> | Epic: <span className="text-purple-400">0.8%</span> | Legendary: <span className="text-yellow-400">0.2%</span></p>
              </div>
              <div className="bg-vintage-black/30 rounded p-2 text-xs">
                <p className="text-vintage-ice/60">Card Power (base):</p>
                <p>Common: <span className="text-vintage-ice font-bold">5</span> | Rare: <span className="text-blue-400 font-bold">20</span> | Epic: <span className="text-purple-400 font-bold">80</span> | Legendary: <span className="text-yellow-400 font-bold">240</span></p>
              </div>
              <div className="bg-vintage-black/30 rounded p-2 text-xs mt-2">
                <p className="text-vintage-ice/60">Foil Chance (power multiplier):</p>
                <p>None: <span className="text-vintage-ice">92%</span> | Standard: <span className="text-cyan-400">7%</span> <span className="text-cyan-400/70">(2.5x)</span> | Prize: <span className="text-yellow-300">1%</span> <span className="text-yellow-300/70">(15x)</span></p>
              </div>
              <div className="bg-vintage-black/30 rounded p-2 text-xs mt-2">
                <p className="text-vintage-ice/60">Wear Chance (power multiplier):</p>
                <p>Pristine: <span className="text-green-400">2%</span> <span className="text-green-400/70">(1.8x)</span> | Mint: <span className="text-emerald-400">10%</span> <span className="text-emerald-400/70">(1.4x)</span></p>
                <p>Lightly: <span className="text-vintage-ice">33%</span> | Moderate: <span className="text-vintage-ice/70">35%</span> | Heavy: <span className="text-vintage-ice/50">20%</span></p>
              </div>
            </div>

            {/* Luck Boost Info */}
            <div className="mb-4">
              <h4 className="text-lg font-bold text-yellow-400 mb-2">⭐ Luck Boost</h4>
              <p className="text-vintage-ice/70 text-sm mb-2">Pay <span className="text-yellow-400 font-bold">5x more (5,000 VBMS)</span> for ELITE odds!</p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs">
                <p className="text-yellow-400/80">Boosted Rates:</p>
                <p>Common: <span className="text-green-400">60%</span> | Rare: <span className="text-green-400">30%</span> | Epic: <span className="text-green-400">8%</span> | Legendary: <span className="text-green-400">2%</span></p>
              </div>
            </div>

            {/* Burn Info */}
            <div className="mb-4">
              <h4 className="text-lg font-bold text-red-400 mb-2">🔥 Card Burn</h4>
              <p className="text-vintage-ice/70 text-sm mb-2">Burn unwanted cards in your <span className="text-vintage-gold">Deck</span> to get VBMS back!</p>
              <div className="bg-red-950/30 border border-red-800/50 rounded p-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Common: <span className="text-green-400 font-bold">200 VBMS</span> <span className="text-vintage-ice/50">(20%)</span></div>
                  <div className="text-blue-400">Rare: <span className="text-green-400 font-bold">1,100 VBMS</span> <span className="text-vintage-ice/50">(110%)</span></div>
                  <div className="text-purple-400">Epic: <span className="text-green-400 font-bold">4,000 VBMS</span> <span className="text-vintage-ice/50">(4x)</span></div>
                  <div className="text-yellow-400">Legendary: <span className="text-green-400 font-bold">40,000 VBMS</span> <span className="text-vintage-ice/50">(40x)</span></div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
              <p className="text-green-400 text-sm font-bold mb-1">💡 Pro Tips:</p>
              <ul className="text-vintage-ice/70 text-xs space-y-1">
                <li>• Rare cards are already worth MORE than the pack price!</li>
                <li>• Epic and Legendary cards give you massive profit!</li>
                <li>• Use Luck Boost to increase your chances of rare drops</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Shop Grid - Single Pack with Luck Boost Option */}
      <div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <h2 className="text-3xl font-display font-bold text-vintage-gold"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M6 12h12" />
            </svg>{t('shopBuyPacks')}</h2>
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-8 h-8 rounded-full bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/30 transition-all flex items-center justify-center font-bold text-lg"
            title="Help"
          >
            ?
          </button>
        </div>

        {/* Single Pack Card with Luck Boost Toggle */}
        <div className="max-w-md mx-auto">
          <div className={`bg-vintage-charcoal/50 border-2 ${luckBoost ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-vintage-gold/30'} rounded-xl p-6 transition-all`}>
            {/* Pack Image */}
            <div className="flex justify-center mb-4 relative">
              <img src="/pack-cover.png" alt="Card Pack" className={`w-32 h-32 object-contain ${luckBoost ? 'animate-pulse' : ''}`} />
              <div className={`absolute -top-2 -right-2 ${luckBoost ? 'bg-yellow-500' : 'bg-green-500'} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}>
                {luckBoost ? '⭐ BOOSTED' : 'Nothing'}
              </div>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-2xl font-display font-bold text-vintage-gold mb-1">
                {luckBoost ? '⭐ Lucky Pack' : 'Basic Pack'}
              </h3>
              <p className="text-vintage-ice/70 text-sm mb-2">
                {luckBoost ? 'Elite odds - Better chances!' : '1 card per pack'}
              </p>
              <p className="text-lg text-vintage-burnt-gold">1 Nothing card per pack (non-NFT)</p>
            </div>

            {/* Luck Boost Toggle */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 font-bold text-sm">⭐ Luck Boost</p>
                  <p className="text-vintage-ice/60 text-xs">Elite odds for 5x price</p>
                </div>
                <button
                  onClick={() => setLuckBoost(!luckBoost)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    luckBoost
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-vintage-charcoal text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
                  }`}
                >
                  {luckBoost ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Rarity Odds - Dynamic based on boost */}
            <div className={`rounded-lg p-3 mb-4 border ${luckBoost ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-vintage-black/30 border-vintage-gold/20'}`}>
              <p className="text-xs text-vintage-ice/70 mb-2">Drop Rates {luckBoost ? '(BOOSTED!)' : ''}:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-vintage-ice/70">Common: <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-vintage-ice'}`}>{currentOdds.Common}%</span></div>
                <div className="text-blue-400">Rare: <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-vintage-ice'}`}>{currentOdds.Rare}%</span></div>
                <div className="text-purple-400">Epic: <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-vintage-ice'}`}>{currentOdds.Epic}%</span></div>
                <div className="text-vintage-gold">Legendary: <span className={`font-bold ${luckBoost ? 'text-green-400' : 'text-vintage-ice'}`}>{currentOdds.Legendary}%</span></div>
              </div>
            </div>

            {/* Price - Dynamic */}
            <div className={`border rounded-lg p-3 mb-4 ${luckBoost ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
              <p className={`text-center text-2xl font-display font-bold ${luckBoost ? 'text-yellow-400' : 'text-purple-400'}`}>
                {currentPrice} VBMS {luckBoost && <span className="text-sm">(5x)</span>}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="bg-vintage-charcoal hover:bg-purple-600/20 text-purple-400 px-4 py-2 rounded-lg font-bold border border-purple-400/30"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(100, val)));
                }}
                className="w-20 text-center bg-vintage-black border border-purple-400/30 rounded-lg text-vintage-ice font-display font-bold text-xl py-2"
              />
              <button
                onClick={() => setQuantity(Math.min(100, quantity + 1))}
                className="bg-vintage-charcoal hover:bg-purple-600/20 text-purple-400 px-4 py-2 rounded-lg font-bold border border-purple-400/30"
              >
                +
              </button>
            </div>

            {/* Buy Button - Shows FREE when daily free available */}
            {dailyFreeStatus?.canClaim && !luckBoost && quantity === 1 ? (
              <button
                onClick={handleClaimDailyFree}
                disabled={claimingDaily}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-display font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-500/30 disabled:opacity-50"
              >
                {claimingDaily ? "Claiming..." : "FREE (1x Daily)"}
              </button>
            ) : (
              <button
                onClick={() => handleBuyWithVBMS(luckBoost ? 'boosted' : 'basic', currentPrice)}
                disabled={loading || parseFloat(vbmsBalance) < currentPrice * quantity}
                className={`w-full ${luckBoost ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'} disabled:bg-vintage-charcoal/50 text-white disabled:text-vintage-ice/30 font-display font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {loading ? "Processing..." : `Buy ${quantity}x for ${currentPrice * quantity} VBMS`}
              </button>
            )}
            
            {/* Balance Info - Subtle */}
            <div className="text-xs text-vintage-ice/60 mt-2 text-center">
              Balance: <span className="text-purple-400 font-medium">{parseFloat(vbmsBalance).toLocaleString()} VBMS</span>
              {dailyFreeStatus && !dailyFreeStatus.canClaim && dailyFreeStatus.timeRemaining && (
                <span className="ml-2 text-green-400/70">
                  • Free in {formatTimeRemaining(dailyFreeStatus.timeRemaining)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Burn Cards Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowBurnModal(true)}
            disabled={!playerCards || playerCards.length === 0}
            className={`w-full py-4 px-6 rounded-xl font-display font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              playerCards && playerCards.length > 0
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-[1.02]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-2xl">🔥</span>
            <span>{t('burnTitle')}</span>
            {playerCards && playerCards.length > 0 && (
              <span className="bg-black/30 px-3 py-1 rounded-full text-sm">
                {playerCards.length} cards
              </span>
            )}
          </button>
          <div className="grid grid-cols-4 gap-2 text-xs mt-3 text-center">
            <div className="text-gray-400 bg-black/20 p-2 rounded">Common: <span className="text-green-400 font-bold">200</span></div>
            <div className="text-blue-400 bg-black/20 p-2 rounded">Rare: <span className="text-green-400 font-bold">1.1k</span></div>
            <div className="text-purple-400 bg-black/20 p-2 rounded">Epic: <span className="text-green-400 font-bold">4k</span></div>
            <div className="text-yellow-400 bg-black/20 p-2 rounded">Leg: <span className="text-green-400 font-bold">40k</span></div>
          </div>
        </div>
      </div>

      {/* Your Packs */}
      {playerPacks && playerPacks.length > 0 && (
        <div>
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>{t('shopYourPacks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {playerPacks.map((pack: any) => (
              <div
                key={pack._id}
                className="bg-vintage-charcoal/50 border-2 border-vintage-burnt-gold/50 rounded-xl p-6"
              >
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-2">{pack.packInfo.name}</h3>
                <p className="text-vintage-ice mb-4">{pack.unopened} unopened</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenPack(pack._id)}
                    disabled={openingPack || pack.unopened === 0}
                    className="flex-1 bg-vintage-burnt-gold hover:bg-vintage-gold disabled:bg-vintage-charcoal/50 text-vintage-black disabled:text-vintage-ice/30 font-display font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    {openingPack ? "..." : "Open 1"}
                  </button>
                  {pack.unopened > 1 && (
                    <button
                      onClick={() => handleOpenAllPacks(pack._id)}
                      disabled={openingPack}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:bg-vintage-charcoal/50 text-white disabled:text-vintage-ice/30 font-display font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      {openingPack ? "..." : `Open All (${pack.unopened})`}
                    </button>
                  )}
                </div>
              </div>
            ))}
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

      {/* Burn Cards Modal */}
      {address && playerCards && (
        <BurnCardsModal
          isOpen={showBurnModal}
          onClose={() => setShowBurnModal(false)}
          cards={playerCards}
          address={address}
          lockedCardIds={lockedCardIds || []}
          onSuccess={(result) => {
            setNotification({
              type: 'success',
              message: `🔥 Burned ${result.cardsBurned} cards for ${result.totalVBMS.toLocaleString()} TESTVBMS!`
            });
          }}
        />
      )}
    </div>
  );
}
