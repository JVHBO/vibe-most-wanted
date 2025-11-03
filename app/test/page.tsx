"use client";

import React, { useState } from "react";
import AchievementsView from "../../components/AchievementsView";

/**
 * 🧪 TEST PAGE - No Wallet Required
 *
 * This page allows you to test all UI features without connecting a wallet.
 * Perfect for development and design verification.
 */

// Mock NFT data for testing
const mockNFTs = [
  { tokenId: "1", rarity: "Common", wear: "Pristine", foil: "Standard", power: 100 },
  { tokenId: "2", rarity: "Rare", wear: "Mint", foil: "Standard", power: 200 },
  { tokenId: "3", rarity: "Epic", wear: "Pristine", foil: "Prize", power: 500 },
  { tokenId: "4", rarity: "Legendary", wear: "Pristine", foil: "Standard", power: 1000 },
  { tokenId: "5", rarity: "Mythic", wear: "Pristine", foil: "Prize", power: 2000 },
  { tokenId: "6", rarity: "Common", wear: "Well-Worn", foil: "Standard", power: 50 },
  { tokenId: "7", rarity: "Rare", wear: "Pristine", foil: "Standard", power: 300 },
  { tokenId: "8", rarity: "Epic", wear: "Mint", foil: "Standard", power: 400 },
];

const mockAddress = "0x1234567890123456789012345678901234567890";

export default function TestPage() {
  const [currentView, setCurrentView] = useState<'home' | 'missions' | 'achievements' | 'leaderboard'>('home');

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice">
      {/* Test Mode Banner */}
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b-2 border-orange-500/50 p-3 text-center">
        <p className="text-orange-300 font-modern text-sm">
          🧪 <strong>TEST MODE</strong> - No wallet connection required
        </p>
      </div>

      {/* Navigation */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-vintage-charcoal backdrop-blur-lg rounded-xl border-2 border-vintage-gold/50 p-2 flex gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex-1 px-6 py-3 rounded-lg font-modern font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-vintage-gold text-vintage-black shadow-gold'
                  : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
              }`}
            >
              ♠ Home
            </button>
            <button
              onClick={() => setCurrentView('missions')}
              className={`flex-1 px-6 py-3 rounded-lg font-modern font-semibold transition-all ${
                currentView === 'missions'
                  ? 'bg-vintage-gold text-vintage-black shadow-gold'
                  : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
              }`}
            >
              ◈ Missions
            </button>
            <button
              onClick={() => setCurrentView('achievements')}
              className={`flex-1 px-6 py-3 rounded-lg font-modern font-semibold transition-all ${
                currentView === 'achievements'
                  ? 'bg-vintage-gold text-vintage-black shadow-gold'
                  : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
              }`}
            >
              ★ Achievements
            </button>
            <button
              onClick={() => setCurrentView('leaderboard')}
              className={`flex-1 px-6 py-3 rounded-lg font-modern font-semibold transition-all ${
                currentView === 'leaderboard'
                  ? 'bg-vintage-gold text-vintage-black shadow-gold'
                  : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
              }`}
            >
              ⭐ Leaderboard
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {currentView === 'home' && (
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-8 text-center">
              <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
                🧪 Test Page
              </h1>
              <p className="text-vintage-burnt-gold mb-6">
                Navigate through the tabs above to test all features without connecting a wallet.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-vintage-black/50 p-4 rounded-xl border border-vintage-gold/20">
                  <p className="text-vintage-gold font-bold mb-1">Mock Address</p>
                  <p className="text-vintage-burnt-gold text-xs font-mono">
                    {mockAddress.slice(0, 6)}...{mockAddress.slice(-4)}
                  </p>
                </div>
                <div className="bg-vintage-black/50 p-4 rounded-xl border border-vintage-gold/20">
                  <p className="text-vintage-gold font-bold mb-1">Mock NFTs</p>
                  <p className="text-vintage-burnt-gold text-2xl font-bold">{mockNFTs.length}</p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'missions' && (
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-8 text-center">
              <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
                ◈ Missions
              </h1>
              <p className="text-vintage-burnt-gold">
                Missions view would appear here (Daily Quest Card, Weekly Missions, etc)
              </p>
            </div>
          )}

          {currentView === 'achievements' && (
            <AchievementsView playerAddress={mockAddress} nfts={mockNFTs} />
          )}

          {currentView === 'leaderboard' && (
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-8 text-center">
              <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
                ⭐ Leaderboard
              </h1>
              <p className="text-vintage-burnt-gold">
                Leaderboard view would appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
