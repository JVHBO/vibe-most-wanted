"use client";

import React, { useState } from "react";
import AchievementsView from "../../components/AchievementsView";
import { RewardChoiceModal } from "../../components/RewardChoiceModal";
import { CoinsInboxModal } from "../../components/CoinsInboxModal";

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
  const [currentView, setCurrentView] = useState<'home' | 'missions' | 'achievements' | 'leaderboard' | 'modals'>('home');

  // Modal states
  const [showRewardChoice, setShowRewardChoice] = useState(false);
  const [showCoinsInbox, setShowCoinsInbox] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(150);

  // Customization states for testing
  const [inboxAmount, setInboxAmount] = useState(450);
  const [currentBalance, setCurrentBalance] = useState(1250);
  const [lifetimeEarned, setLifetimeEarned] = useState(5800);

  // Mock inbox data (now dynamic)
  const mockInboxData = {
    coinsInbox: inboxAmount,
    coins: currentBalance,
    lifetimeEarned: lifetimeEarned,
  };

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
            <button
              onClick={() => setCurrentView('modals')}
              className={`flex-1 px-6 py-3 rounded-lg font-modern font-semibold transition-all ${
                currentView === 'modals'
                  ? 'bg-vintage-gold text-vintage-black shadow-gold'
                  : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
              }`}
            >
              🎨 UI/Modals
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

          {currentView === 'modals' && (
            <div className="space-y-6">
              {/* Modal Testing Section */}
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-8">
                <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2 text-center">
                  🎨 UI & Modal Testing
                </h1>
                <p className="text-vintage-burnt-gold text-center mb-8">
                  Test and adjust UI components, modals, and styling
                </p>

                {/* Reward Choice Modal Test */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-vintage-black/50 p-6 rounded-xl border border-vintage-gold/20">
                    <h3 className="text-xl font-bold text-vintage-gold mb-4">💰 Reward Choice Modal</h3>
                    <p className="text-vintage-burnt-gold text-sm mb-4">
                      Modal que aparece após vitórias. Teste com diferentes valores de moedas.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-vintage-gold text-sm flex items-center justify-between">
                          <span>Moedas: {rewardAmount}</span>
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="1000"
                          step="10"
                          value={rewardAmount}
                          onChange={(e) => setRewardAmount(Number(e.target.value))}
                          className="w-full h-2 bg-vintage-deep-black rounded-lg appearance-none cursor-pointer accent-vintage-gold"
                        />
                        <div className="flex gap-2">
                          {[50, 150, 500, 1000].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setRewardAmount(amount)}
                              className="flex-1 bg-vintage-deep-black/50 text-vintage-gold text-xs py-1 rounded border border-vintage-gold/20 hover:border-vintage-gold/50 transition"
                            >
                              {amount}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRewardChoice(true)}
                        className="w-full bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black font-bold py-3 rounded-lg hover:scale-105 transition"
                      >
                        Abrir Modal (PvE)
                      </button>
                      <button
                        onClick={() => {
                          setShowRewardChoice(true);
                        }}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 rounded-lg hover:scale-105 transition"
                      >
                        Abrir Modal (PvP)
                      </button>
                    </div>
                  </div>

                  <div className="bg-vintage-black/50 p-6 rounded-xl border border-vintage-gold/20">
                    <h3 className="text-xl font-bold text-vintage-gold mb-4">📥 Coins Inbox Modal</h3>
                    <p className="text-vintage-burnt-gold text-sm mb-4">
                      Modal do inbox de moedas. Teste com diferentes valores.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-vintage-gold text-xs">Inbox: {inboxAmount}</label>
                        <input
                          type="range"
                          min="0"
                          max="10000"
                          step="50"
                          value={inboxAmount}
                          onChange={(e) => setInboxAmount(Number(e.target.value))}
                          className="w-full h-2 bg-vintage-deep-black rounded-lg appearance-none cursor-pointer accent-vintage-gold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-vintage-gold text-xs">Saldo Atual: {currentBalance}</label>
                        <input
                          type="range"
                          min="0"
                          max="50000"
                          step="100"
                          value={currentBalance}
                          onChange={(e) => setCurrentBalance(Number(e.target.value))}
                          className="w-full h-2 bg-vintage-deep-black rounded-lg appearance-none cursor-pointer accent-vintage-gold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-vintage-gold text-xs">Total Ganho: {lifetimeEarned}</label>
                        <input
                          type="range"
                          min="0"
                          max="100000"
                          step="500"
                          value={lifetimeEarned}
                          onChange={(e) => setLifetimeEarned(Number(e.target.value))}
                          className="w-full h-2 bg-vintage-deep-black rounded-lg appearance-none cursor-pointer accent-vintage-gold"
                        />
                      </div>
                      <button
                        onClick={() => setShowCoinsInbox(true)}
                        className="w-full bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black font-bold py-3 rounded-lg hover:scale-105 transition"
                      >
                        Abrir Inbox Modal
                      </button>
                    </div>
                  </div>
                </div>

                {/* Icon Standardization Section */}
                <div className="bg-vintage-black/50 p-6 rounded-xl border border-vintage-gold/20 mb-8">
                  <h3 className="text-xl font-bold text-vintage-gold mb-4">🎭 Padronização de Ícones</h3>
                  <p className="text-vintage-burnt-gold text-sm mb-4">
                    Ícones padrão usados no jogo. Manter consistência é importante!
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">🪙</div>
                      <p className="text-vintage-gold text-sm font-bold">Coins/Money</p>
                      <p className="text-vintage-gold/50 text-xs">Moedas</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">🎲</div>
                      <p className="text-vintage-gold text-sm font-bold">Battle/Fight</p>
                      <p className="text-vintage-gold/50 text-xs">Batalhas</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">👑</div>
                      <p className="text-vintage-gold text-sm font-bold">Achievement</p>
                      <p className="text-vintage-gold/50 text-xs">Conquistas</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">🎰</div>
                      <p className="text-vintage-gold text-sm font-bold">Mission/Quest</p>
                      <p className="text-vintage-gold/50 text-xs">Missões</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">📈</div>
                      <p className="text-vintage-gold text-sm font-bold">Stats/Ranking</p>
                      <p className="text-vintage-gold/50 text-xs">Estatísticas</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">⚙️</div>
                      <p className="text-vintage-gold text-sm font-bold">Settings</p>
                      <p className="text-vintage-gold/50 text-xs">Configurações</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">📖</div>
                      <p className="text-vintage-gold text-sm font-bold">Help/Tutorial</p>
                      <p className="text-vintage-gold/50 text-xs">Ajuda</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">🔔</div>
                      <p className="text-vintage-gold text-sm font-bold">Notifications</p>
                      <p className="text-vintage-gold/50 text-xs">Notificações</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">💌</div>
                      <p className="text-vintage-gold text-sm font-bold">Inbox</p>
                      <p className="text-vintage-gold/50 text-xs">Caixa de entrada</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">⭐</div>
                      <p className="text-vintage-gold text-sm font-bold">Victory</p>
                      <p className="text-vintage-gold/50 text-xs">Vitória</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">💀</div>
                      <p className="text-vintage-gold text-sm font-bold">Defeat</p>
                      <p className="text-vintage-gold/50 text-xs">Derrota</p>
                    </div>
                    <div className="bg-vintage-deep-black p-4 rounded-lg text-center hover:bg-vintage-deep-black/70 transition cursor-pointer">
                      <div className="text-4xl mb-2">🃏</div>
                      <p className="text-vintage-gold text-sm font-bold">Cards/NFT</p>
                      <p className="text-vintage-gold/50 text-xs">Cartas</p>
                    </div>
                  </div>
                </div>

                {/* Color Palette Section */}
                <div className="bg-vintage-black/50 p-6 rounded-xl border border-vintage-gold/20">
                  <h3 className="text-xl font-bold text-vintage-gold mb-4">🎨 Paleta de Cores</h3>
                  <p className="text-vintage-burnt-gold text-sm mb-4">
                    Cores do tema vintage/cassino usado no jogo.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="bg-vintage-gold h-16 rounded-lg border-2 border-vintage-gold"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-gold</p>
                      <p className="text-vintage-gold/50 text-xs">#D4AF37</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-orange h-16 rounded-lg border-2 border-vintage-orange"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-orange</p>
                      <p className="text-vintage-gold/50 text-xs">#FF8C42</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-burnt-gold h-16 rounded-lg border-2 border-vintage-burnt-gold"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-burnt-gold</p>
                      <p className="text-vintage-gold/50 text-xs">#B8860B</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-deep-black h-16 rounded-lg border-2 border-vintage-gold/30"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-deep-black</p>
                      <p className="text-vintage-gold/50 text-xs">#0F0F0F</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-charcoal h-16 rounded-lg border-2 border-vintage-gold/30"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-charcoal</p>
                      <p className="text-vintage-gold/50 text-xs">#1C1C1C</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-rich-black h-16 rounded-lg border-2 border-vintage-gold/30"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-rich-black</p>
                      <p className="text-vintage-gold/50 text-xs">#010101</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-vintage-ice h-16 rounded-lg border-2 border-vintage-ice"></div>
                      <p className="text-vintage-gold text-sm font-bold">vintage-ice</p>
                      <p className="text-vintage-gold/50 text-xs">#F5F5F5</p>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-red-500 h-16 rounded-lg border-2 border-red-500"></div>
                      <p className="text-vintage-gold text-sm font-bold">Accent Red</p>
                      <p className="text-vintage-gold/50 text-xs">Errors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRewardChoice && (
        <RewardChoiceModal
          amount={rewardAmount}
          source="pve"
          onClose={() => setShowRewardChoice(false)}
          onChoiceMade={(choice) => {
            console.log("Choice made:", choice);
          }}
        />
      )}

      {showCoinsInbox && (
        <CoinsInboxModal
          inboxStatus={mockInboxData}
          onClose={() => setShowCoinsInbox(false)}
        />
      )}
    </div>
  );
}
