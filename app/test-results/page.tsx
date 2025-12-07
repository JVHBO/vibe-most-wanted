"use client";

import { useState } from 'react';
import { GamePopups } from '@/components/GamePopups';
import { useMusic } from '@/contexts/MusicContext';

// Loss screen configurations for testing
const LOSS_CONFIGS = [
  { media: 'https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26', isVideo: false, name: 'Sad Pikachu' },
  { media: '/davyjones.mp4', isVideo: true, name: 'Davy Jones' },
  { media: '/derrotanumeronsei.mp4', isVideo: true, name: 'Derrota N6' },
];

export default function TestResultsPage() {
  // Sound state - controls result screen audio
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Music state - controls background music/playlist
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();

  // Victory state
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [victoryImage, setVictoryImage] = useState('/victory-1.jpg');

  // Loss state
  const [showLossPopup, setShowLossPopup] = useState(false);
  const [forcedLossMedia, setForcedLossMedia] = useState<{ media: string; isVideo: boolean } | undefined>(undefined);

  // Tie state
  const [showTiePopup, setShowTiePopup] = useState(false);

  // Mock battle result
  const mockBattleResult = {
    coinsEarned: 50,
    type: 'pvp',
    playerPower: 1250,
    opponentPower: 980,
    opponentName: 'TestOpponent',
    opponentTwitter: '@testuser',
  };

  const mockUserProfile = {
    username: 'TestPlayer',
    twitterProfileImageUrl: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
  };

  // Translation mock
  const t = (key: string, params?: any) => {
    const translations: Record<string, string> = {
      victoryPrize: 'VICTORY!',
      earnedCoins: `+${params?.amount || 50} VBMS`,
      shareVictory: 'Share',
      castVictory: `Victory with ${params?.power || 1250} power!`,
      defeatPrize: 'DEFEAT!',
      noCoinsEarned: 'No coins earned',
      shareDefeat: 'Share',
      castDefeat: `Lost with ${params?.power || 1250} power`,
      tweetVictory: `Victory with ${params?.power || 1250} power!`,
      tweetDefeat: `Lost with ${params?.power || 1250} power`,
      tieResult: "IT'S A TIE!",
    };
    return translations[key] || key;
  };

  // Helper to show specific loss screen
  const showLoss = (config?: { media: string; isVideo: boolean }) => {
    setForcedLossMedia(config);
    setShowLossPopup(true);
  };

  return (
    <div className="min-h-screen bg-vintage-black text-white p-8">
      <h1 className="text-4xl font-display font-bold text-vintage-gold mb-8 text-center">
        Test Battle Results
      </h1>

      {/* Sound Toggle - Controls BOTH result sounds AND playlist music */}
      <div className="max-w-3xl mx-auto mb-6 space-y-3">
        <button
          onClick={() => {
            const newState = !soundEnabled;
            setSoundEnabled(newState);
            setIsMusicEnabled(newState);
          }}
          className={`w-full px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            soundEnabled && isMusicEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {soundEnabled && isMusicEnabled ? '🔊 All Sound ON' : '🔇 All Sound OFF'}
        </button>

        {/* Separate controls for granular control */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              soundEnabled
                ? 'bg-green-600/70 hover:bg-green-700 text-white'
                : 'bg-red-600/70 hover:bg-red-700 text-white'
            }`}
          >
            {soundEnabled ? '🎵 Result Sounds ON' : '🔇 Result Sounds OFF'}
          </button>
          <button
            onClick={() => setIsMusicEnabled(!isMusicEnabled)}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              isMusicEnabled
                ? 'bg-green-600/70 hover:bg-green-700 text-white'
                : 'bg-red-600/70 hover:bg-red-700 text-white'
            }`}
          >
            {isMusicEnabled ? '🎶 Playlist ON' : '🔇 Playlist OFF'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Victory Tests */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-vintage-gold/30">
          <h2 className="text-2xl font-display text-green-400 mb-4">Victory Screens (5)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => {
                setVictoryImage('/victory-1.jpg');
                setShowWinPopup(true);
              }}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 1
              <span className="block text-xs font-normal opacity-70">Gigachad</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/victory-2.jpg');
                setShowWinPopup(true);
              }}
              className="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 2
              <span className="block text-xs font-normal opacity-70">Hearts</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/victory-3.jpg');
                setShowWinPopup(true);
              }}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 3
              <span className="block text-xs font-normal opacity-70">Sensual</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/littlebird.mp4');
                setShowWinPopup(true);
              }}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 4
              <span className="block text-xs font-normal opacity-70">Little Bird</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/bom.jpg');
                setShowWinPopup(true);
              }}
              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 5
              <span className="block text-xs font-normal opacity-70">Bom</span>
            </button>
          </div>
        </div>

        {/* Loss Tests */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-red-500/30">
          <h2 className="text-2xl font-display text-red-400 mb-4">Loss Screens (3)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => showLoss(undefined)}
              className="px-4 py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Random
              <span className="block text-xs font-normal opacity-70">Any</span>
            </button>
            {LOSS_CONFIGS.map((config, index) => (
              <button
                key={index}
                onClick={() => showLoss({ media: config.media, isVideo: config.isVideo })}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all hover:scale-105"
              >
                Loss {index + 1}
                <span className="block text-xs font-normal opacity-70">{config.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tie Test */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-gray-500/30">
          <h2 className="text-2xl font-display text-gray-400 mb-4">Tie Screen</h2>
          <button
            onClick={() => setShowTiePopup(true)}
            className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            Show Tie Screen
          </button>
        </div>

        {/* Back to Home */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="text-vintage-gold hover:text-vintage-burnt-gold underline"
          >
            Back to Home
          </a>
        </div>
      </div>

      {/* Game Popups Component */}
      <GamePopups
        showWinPopup={showWinPopup}
        currentVictoryImage={victoryImage}
        isInFarcaster={false}
        lastBattleResult={mockBattleResult}
        userProfile={mockUserProfile}
        soundEnabled={soundEnabled}
        handleCloseVictoryScreen={() => setShowWinPopup(false)}
        sharesRemaining={3}
        onShareClick={() => {}}
        showLossPopup={showLossPopup}
        handleCloseDefeatScreen={() => setShowLossPopup(false)}
        forcedLossMedia={forcedLossMedia}
        showTiePopup={showTiePopup}
        setShowTiePopup={setShowTiePopup}
        tieGifLoaded={true}
        errorMessage={null}
        setErrorMessage={() => {}}
        successMessage={null}
        setSuccessMessage={() => {}}
        showDailyClaimPopup={false}
        setShowDailyClaimPopup={() => {}}
        loginBonusClaimed={true}
        isClaimingBonus={false}
        handleClaimLoginBonus={() => {}}
        showWelcomePackPopup={false}
        setShowWelcomePackPopup={() => {}}
        isClaimingWelcomePack={false}
        handleClaimWelcomePack={() => {}}
        t={t}
      />
    </div>
  );
}
