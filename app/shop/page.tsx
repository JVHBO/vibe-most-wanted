"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function ShopPage() {
  const { address } = useAccount();

  // Fetch data
  const shopPacks = useQuery(api.cardPacks.getShopPacks);
  const playerPacks = useQuery(api.cardPacks.getPlayerPacks, address ? { address } : "skip");
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");

  // Mutations
  const buyPack = useMutation(api.cardPacks.buyPack);
  const openPack = useMutation(api.cardPacks.openPack);

  // State
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
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
      setTimeout(() => setRevealedCards([]), 5000); // Clear after 5s
    } catch (error: any) {
      alert(error.message || "Failed to open pack");
    } finally {
      setOpeningPack(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎴 Card Shop</h1>
          <p className="text-gray-400 mb-8">Please connect your wallet to access the shop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            🎴 Card Shop
          </h1>
          <p className="text-gray-400">Buy packs with coins, open to get random cards!</p>
        </div>

        {/* Coins Balance */}
        <div className="bg-black/40 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Your Balance</p>
              <p className="text-4xl font-bold text-yellow-400">
                {coins.toLocaleString()} <span className="text-xl">coins</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Unopened Packs</p>
              <p className="text-3xl font-bold text-blue-400">
                {playerPacks?.reduce((sum: number, p) => sum + p.unopened, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Shop Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">💰 Buy Packs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shopPacks?.map((pack) => (
              <div
                key={pack.type}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/30 rounded-xl p-6 hover:border-purple-500 transition-all hover:scale-105"
              >
                {/* Pack Image */}
                <div className="flex justify-center mb-4">
                  <img src="/pack-closed.png" alt="Card Pack" className="w-32 h-32 object-contain" />
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-white mb-1">{pack.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{pack.description}</p>
                  <p className="text-lg text-purple-300">{pack.cards} cards per pack</p>
                </div>

                {/* Rarity Odds */}
                <div className="bg-black/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-2">Drop Rates:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-400">Common: <span className="text-white">{pack.rarityOdds.common}%</span></div>
                    <div className="text-blue-400">Rare: <span className="text-white">{pack.rarityOdds.rare}%</span></div>
                    <div className="text-purple-400">Epic: <span className="text-white">{pack.rarityOdds.epic}%</span></div>
                    <div className="text-yellow-400">Legendary: <span className="text-white">{pack.rarityOdds.legendary}%</span></div>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-center text-2xl font-bold text-yellow-400">
                    {pack.price} coins
                  </p>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    -
                  </button>
                  <span className="text-white font-bold text-xl">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => handleBuy(pack.type)}
                  disabled={loading || coins < pack.price * quantity}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
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
            <h2 className="text-3xl font-bold text-white mb-6">📦 Your Packs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {playerPacks.map((pack) => (
                <div
                  key={pack._id}
                  className="bg-gradient-to-br from-blue-900 to-purple-900 border-2 border-blue-500/50 rounded-xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{pack.packInfo.name}</h3>
                  <p className="text-gray-300 mb-4">{pack.unopened} unopened</p>
                  <button
                    onClick={() => handleOpenPack(pack._id)}
                    disabled={openingPack || pack.unopened === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 border-4 border-yellow-500 rounded-2xl p-8 max-w-4xl w-full">
              <h2 className="text-4xl font-bold text-center text-yellow-400 mb-6">
                🎉 Pack Opened!
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {revealedCards.map((card, i) => (
                  <div
                    key={i}
                    className={`relative bg-gradient-to-br ${
                      card.rarity === "legendary"
                        ? "from-yellow-600 to-orange-600"
                        : card.rarity === "epic"
                        ? "from-purple-600 to-pink-600"
                        : card.rarity === "rare"
                        ? "from-blue-600 to-cyan-600"
                        : "from-gray-600 to-gray-700"
                    } border-4 ${
                      card.rarity === "legendary"
                        ? "border-yellow-400"
                        : card.rarity === "epic"
                        ? "border-purple-400"
                        : card.rarity === "rare"
                        ? "border-blue-400"
                        : "border-gray-400"
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

                    {/* Power (big display) */}
                    <div className="text-center mb-2">
                      <p className="text-3xl font-bold text-yellow-400">{card.power}</p>
                      <p className="text-xs text-gray-400">POWER</p>
                    </div>

                    {/* Traits */}
                    <div className="text-xs text-white/80 space-y-1">
                      <p className="capitalize">Rarity: <span className="font-bold">{card.rarity}</span></p>
                      {card.foil && <p className="capitalize">Foil: <span className="font-bold text-purple-300">{card.foil}</span></p>}
                      <p className="capitalize">Wear: <span className="font-bold">{card.wear}</span></p>
                    </div>

                    {card.isDuplicate && (
                      <p className="text-xs text-yellow-300 mt-2">Duplicate x{card.quantity}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRevealedCards([])}
                className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
