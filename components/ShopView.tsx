"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ShopNotification } from "./ShopNotification";
import { PackOpeningAnimation } from "./PackOpeningAnimation";
import { useTransferVBMS } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";

interface ShopViewProps {
  address: string | undefined;
}

export function ShopView({ address }: ShopViewProps) {
  // Fetch data
  const shopPacks = useQuery(api.cardPacks.getShopPacks);
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");

  // Mutations
  const openPack = useMutation(api.cardPacks.openPack);

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
  const { transfer, isPending: isTransferring, error: transferError } = useTransferVBMS();

  // 🔍 Debug: Log balance
  console.log('[ShopView] 💰 VBMS Balance:', vbmsBalance);

  // State
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle purchase with VBMS (blockchain)
  const handleBuyWithVBMS = async (packType: string, packPrice: number) => {
    if (!effectiveAddress) {
      setNotification({
        type: 'error',
        message: "Please connect your wallet"
      });
      return;
    }

    const totalVBMS = (packPrice * quantity).toString();

    // Check balance
    if (parseFloat(vbmsBalance) < parseFloat(totalVBMS)) {
      setNotification({
        type: 'error',
        message: `Insufficient VBMS. Need ${totalVBMS} VBMS`
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Transfer VBMS to pool
      setNotification({
        type: 'success',
        message: 'Transferring VBMS to pool... Please confirm in your wallet'
      });

      console.log('💸 Initiating transfer...');
      const transferHash = await transfer(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(totalVBMS));

      console.log('✅ Transfer confirmed:', transferHash);

      // Step 2: Call backend to verify and mint packs
      setNotification({
        type: 'success',
        message: 'Transfer confirmed! Minting packs...'
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
      setTimeout(() => setRevealedCards([]), 5000);
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || "Failed to open pack"
      });
    } finally {
      setOpeningPack(false);
    }
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>Card Shop</h2>
          <p className="text-vintage-ice/70">Please connect your wallet to access the shop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>FREE Card Shop</h1>
        <p className="text-vintage-ice/70">Buy FREE packs (non-NFT cards) to play the game!</p>
        <div className="mt-2 inline-block bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
          <p className="text-green-400 text-sm font-bold">⚠️ These are FREE cards (not NFTs) - Use them to play and earn rewards!</p>
        </div>

      {/* Custom Notification */}
      {notification && (
        <ShopNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      </div>

      {/* Balance */}
      <div className="bg-vintage-black/40 backdrop-blur-sm border border-vintage-gold/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-vintage-ice/70 text-sm mb-2">Your VBMS Balance</p>
            <p className="text-4xl font-display font-bold text-purple-400">
              {parseFloat(vbmsBalance).toFixed(2)} <span className="text-xl">VBMS</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-vintage-ice/70 text-sm">Unopened Packs</p>
            <p className="text-3xl font-display font-bold text-vintage-burnt-gold">
              {playerPacks?.reduce((sum: number, p: any) => sum + p.unopened, 0) || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Shop Grid */}
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M6 12h12" />
          </svg>Buy Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shopPacks?.map((pack: any) => (
            <div
              key={pack.type}
              className="bg-vintage-charcoal/50 border-2 border-vintage-gold/30 rounded-xl p-6 hover:border-vintage-gold transition-all hover:scale-105"
            >
              {/* Pack Image */}
              <div className="flex justify-center mb-4 relative">
                <img src="/pack-cover.png" alt="Card Pack" className="w-32 h-32 object-contain" />
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  FREE
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-2xl font-display font-bold text-vintage-gold mb-1">{pack.name}</h3>
                <p className="text-vintage-ice/70 text-sm mb-2">{pack.description}</p>
                <p className="text-lg text-vintage-burnt-gold">{pack.cards} FREE cards per pack (non-NFT)</p>
              </div>

              {/* Rarity Odds */}
              <div className="bg-vintage-black/30 rounded-lg p-3 mb-4 border border-vintage-gold/20">
                <p className="text-xs text-vintage-ice/70 mb-2">Drop Rates:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-vintage-ice/70">Common: <span className="text-vintage-ice font-bold">{pack.rarityOdds?.Common || 0}%</span></div>
                  <div className="text-blue-400">Rare: <span className="text-vintage-ice font-bold">{pack.rarityOdds?.Rare || 0}%</span></div>
                  <div className="text-purple-400">Epic: <span className="text-vintage-ice font-bold">{pack.rarityOdds?.Epic || 0}%</span></div>
                  <div className="text-vintage-gold">Legendary: <span className="text-vintage-ice font-bold">{pack.rarityOdds?.Legendary || 0}%</span></div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-purple-500/10 border-purple-500/30 border rounded-lg p-3 mb-4">
                <p className="text-center text-2xl font-display font-bold text-purple-400">
                  {pack.price} VBMS
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
                <span className="text-vintage-ice font-display font-bold text-xl">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="bg-vintage-charcoal hover:bg-purple-600/20 text-purple-400 px-4 py-2 rounded-lg font-bold border border-purple-400/30"
                >
                  +
                </button>
              </div>

              {/* Buy Button */}
              <button
                onClick={() => handleBuyWithVBMS(pack.type, pack.price)}
                disabled={loading || parseFloat(vbmsBalance) < pack.price * quantity}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-vintage-charcoal/50 text-white disabled:text-vintage-ice/30 font-display font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? "Processing..." : `Buy ${quantity}x for ${pack.price * quantity} VBMS`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Your Packs */}
      {playerPacks && playerPacks.length > 0 && (
        <div>
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6"><svg className="inline-block w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>Your Packs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {playerPacks.map((pack: any) => (
              <div
                key={pack._id}
                className="bg-vintage-charcoal/50 border-2 border-vintage-burnt-gold/50 rounded-xl p-6"
              >
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-2">{pack.packInfo.name}</h3>
                <p className="text-vintage-ice mb-4">{pack.unopened} unopened</p>
                <button
                  onClick={() => handleOpenPack(pack._id)}
                  disabled={openingPack || pack.unopened === 0}
                  className="w-full bg-vintage-burnt-gold hover:bg-vintage-gold disabled:bg-vintage-charcoal/50 text-vintage-black disabled:text-vintage-ice/30 font-display font-bold py-3 px-6 rounded-xl transition-all"
                >
                  {openingPack ? "Opening..." : "Open Pack"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pack Opening Animation */}
      {revealedCards.length > 0 && (
        <PackOpeningAnimation
          cards={revealedCards}
          onClose={() => setRevealedCards([])}
        />
      )}
    </div>
  );
}
