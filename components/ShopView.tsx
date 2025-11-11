"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface ShopViewProps {
  address: string | undefined;
}

export function ShopView({ address }: ShopViewProps) {
  // Fetch data
  const shopPacks = useQuery(api.cardPacks.getShopPacks);
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");

  // Mutations
  const buyPack = useMutation(api.cardPacks.buyPack);
  const openPack = useMutation(api.cardPacks.openPack);

  // State
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);

  const coins = profile?.coins || 0;

  // Handle purchase
  const handleBuy = async (packType: string) => {
    if (!address) {
      alert("Please connect wallet");
      return;
    }

    setLoading(true);
    try {
      const result = await buyPack({
        address,
        packType: packType as "basic" | "premium" | "elite",
        quantity,
      });

      alert(`Success! Bought ${result.packsReceived} ${packType} pack(s) for ${result.coinsSpent} coins`);
      setQuantity(1);
    } catch (error: any) {
      alert(error.message || "Failed to buy pack");
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
      alert(error.message || "Failed to open pack");
    } finally {
      setOpeningPack(false);
    }
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">🏪 Card Shop</h2>
          <p className="text-vintage-ice/70">Please connect your wallet to access the shop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2">🏪 Card Shop</h1>
        <p className="text-vintage-ice/70">Buy packs with coins, open to get random cards!</p>
      </div>

      {/* Coins Balance */}
      <div className="bg-vintage-black/40 backdrop-blur-sm border border-vintage-gold/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-vintage-ice/70 text-sm">Your Balance</p>
            <p className="text-4xl font-display font-bold text-vintage-gold">
              {coins.toLocaleString()} <span className="text-xl">coins</span>
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
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6">💰 Buy Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shopPacks?.map((pack: any) => (
            <div
              key={pack.type}
              className="bg-vintage-charcoal/50 border-2 border-vintage-gold/30 rounded-xl p-6 hover:border-vintage-gold transition-all hover:scale-105"
            >
              {/* Pack Image */}
              <div className="flex justify-center mb-4">
                <img src="/pack-closed.png" alt="Card Pack" className="w-32 h-32 object-contain" />
              </div>

              <div className="text-center mb-4">
                <h3 className="text-2xl font-display font-bold text-vintage-gold mb-1">{pack.name}</h3>
                <p className="text-vintage-ice/70 text-sm mb-2">{pack.description}</p>
                <p className="text-lg text-vintage-burnt-gold">{pack.cards} cards per pack</p>
              </div>

              {/* Rarity Odds */}
              <div className="bg-vintage-black/30 rounded-lg p-3 mb-4 border border-vintage-gold/20">
                <p className="text-xs text-vintage-ice/70 mb-2">Drop Rates:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-vintage-ice/70">Common: <span className="text-vintage-ice font-bold">{pack.rarityOdds.Common}%</span></div>
                  <div className="text-blue-400">Rare: <span className="text-vintage-ice font-bold">{pack.rarityOdds.Rare}%</span></div>
                  <div className="text-purple-400">Epic: <span className="text-vintage-ice font-bold">{pack.rarityOdds.Epic}%</span></div>
                  <div className="text-vintage-gold">Legendary: <span className="text-vintage-ice font-bold">{pack.rarityOdds.Legendary}%</span></div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3 mb-4">
                <p className="text-center text-2xl font-display font-bold text-vintage-gold">
                  {pack.price} coins
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-vintage-charcoal hover:bg-vintage-gold/20 text-vintage-gold px-4 py-2 rounded-lg font-bold border border-vintage-gold/30"
                >
                  -
                </button>
                <span className="text-vintage-ice font-display font-bold text-xl">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="bg-vintage-charcoal hover:bg-vintage-gold/20 text-vintage-gold px-4 py-2 rounded-lg font-bold border border-vintage-gold/30"
                >
                  +
                </button>
              </div>

              {/* Buy Button */}
              <button
                onClick={() => handleBuy(pack.type)}
                disabled={loading || coins < pack.price * quantity}
                className="w-full bg-vintage-gold hover:bg-vintage-burnt-gold disabled:bg-vintage-charcoal/50 text-vintage-black disabled:text-vintage-ice/30 font-display font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed shadow-gold disabled:shadow-none"
              >
                {loading ? "Processing..." : `Buy ${quantity}x for ${pack.price * quantity} coins`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Your Packs */}
      {playerPacks && playerPacks.length > 0 && (
        <div>
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-6">📦 Your Packs</h2>
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

      {/* Revealed Cards Modal */}
      {revealedCards.length > 0 && (
        <div className="fixed inset-0 bg-vintage-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-vintage-charcoal border-4 border-vintage-gold rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-4xl font-display font-bold text-center text-vintage-gold mb-6">
              🎉 Pack Opened!
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {revealedCards.map((card: any, i: number) => (
                <div
                  key={i}
                  className={`relative bg-vintage-charcoal/80 border-4 ${
                    card.rarity === "Legendary"
                      ? "border-vintage-gold"
                      : card.rarity === "Epic"
                      ? "border-purple-400"
                      : card.rarity === "Rare"
                      ? "border-blue-400"
                      : "border-vintage-ice/30"
                  } rounded-xl p-4 text-center`}
                >
                  {/* FREE CARD Badge */}
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    FREE
                  </div>

                  {/* Card Image */}
                  <img
                    src={card.imageUrl}
                    alt={`${card.rarity} card`}
                    className="w-full h-auto rounded-lg mb-2"
                  />

                  {/* Power */}
                  <div className="text-center mb-2">
                    <p className="text-3xl font-display font-bold text-vintage-gold">{card.power}</p>
                    <p className="text-xs text-vintage-ice/70">POWER</p>
                  </div>

                  {/* Traits */}
                  <div className="text-xs text-vintage-ice space-y-1">
                    <p className="capitalize">Rarity: <span className="font-bold">{card.rarity}</span></p>
                    {card.foil && <p className="capitalize">Foil: <span className="font-bold text-purple-300">{card.foil}</span></p>}
                    <p className="capitalize">Wear: <span className="font-bold">{card.wear}</span></p>
                  </div>

                  {card.isDuplicate && (
                    <p className="text-xs text-vintage-burnt-gold mt-2">Duplicate x{card.quantity}</p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setRevealedCards([])}
              className="mt-6 w-full bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-display font-bold py-3 px-6 rounded-xl shadow-gold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
