"use client";

import { useState } from 'react';
import { GamePopups } from '@/components/GamePopups';
import { useMusic } from '@/contexts/MusicContext';

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

  return (
    <div className="min-h-screen bg-vintage-black text-white p-8">
      <h1 className="text-4xl font-display font-bold text-vintage-gold mb-8 text-center">
        Test Battle Results
      </h1>

      {/* Sound Toggle - Controls BOTH result sounds AND playlist music */}
      <div className="max-w-2xl mx-auto mb-6 space-y-3">
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

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Victory Tests */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-vintage-gold/30">
          <h2 className="text-2xl font-display text-green-400 mb-4">Victory Screens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setVictoryImage('/victory-1.jpg');
                setShowWinPopup(true);
              }}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 1
              <span className="block text-sm font-normal opacity-70">Default</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/victory-2.jpg');
                setShowWinPopup(true);
              }}
              className="px-6 py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 2
              <span className="block text-sm font-normal opacity-70">Hearts Effect</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/victory-3.jpg');
                setShowWinPopup(true);
              }}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 3
              <span className="block text-sm font-normal opacity-70">Sensual</span>
            </button>
            <button
              onClick={() => {
                setVictoryImage('/littlebird.mp4');
                setShowWinPopup(true);
              }}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              Victory 4
              <span className="block text-sm font-normal opacity-70">Little Bird</span>
            </button>
          </div>
        </div>

        {/* Loss Test */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-red-500/30">
          <h2 className="text-2xl font-display text-red-400 mb-4">Loss Screen</h2>
          <p className="text-sm text-gray-400 mb-3">Randomly selects: Sad Pikachu or Davy Jones video</p>
          <button
            onClick={() => setShowLossPopup(true)}
            className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            Show Loss Screen (Random)
          </button>
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
