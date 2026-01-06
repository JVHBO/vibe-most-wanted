"use client";

import { useState } from 'react';
import { GamePopups } from '@/components/GamePopups';
import { useMusic } from '@/contexts/MusicContext';

// Loss screen configurations
const LOSS_CONFIGS = [
  { media: 'https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26', isVideo: false, name: 'Sad Pikachu', audio: 'lose-sound.mp3' },
  { media: '/davyjones.mp4', isVideo: true, name: 'Davy Jones', audio: 'embedded' },
  { media: '/derrotanumeronsei.mp4', isVideo: true, name: 'Derrota N6', audio: 'embedded' },
  { media: '/littlebird.mp4', isVideo: true, name: 'Little Bird', audio: 'embedded' },
];

export default function TestResultsPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [victoryImage, setVictoryImage] = useState('/victory-1.jpg');
  const [showLossPopup, setShowLossPopup] = useState(false);
  const [forcedLossMedia, setForcedLossMedia] = useState<{ media: string; isVideo: boolean } | undefined>(undefined);
  const [showTiePopup, setShowTiePopup] = useState(false);

  const mockBattleResult = { coinsEarned: 50, type: 'pvp', playerPower: 1250, opponentPower: 980, opponentName: 'TestOpponent', opponentTwitter: '@testuser' };
  const mockUserProfile = { username: 'TestPlayer', twitterProfileImageUrl: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg' };

  const t = (key: string, params?: Record<string, string | number>) => {
    const amount = params?.amount || 50;
    const power = params?.power || 1250;
    const translations: Record<string, string> = {
      victoryPrize: 'VICTORY!',
      earnedCoins: `+${amount} VBMS`,
      shareVictory: 'Share',
      castVictory: `Victory with ${power} power!`,
      defeatPrize: 'DEFEAT!',
      noCoinsEarned: 'No coins earned',
      shareDefeat: 'Share',
      castDefeat: `Lost with ${power} power`,
      tweetVictory: `Victory with ${power} power!`,
      tweetDefeat: `Lost with ${power} power`,
      tieResult: "IT'S A TIE!",
    };
    return translations[key] || key;
  };

  const showLoss = (config?: { media: string; isVideo: boolean }) => {
    setForcedLossMedia(config);
    setShowLossPopup(true);
  };

  return (
    <div className="min-h-screen bg-vintage-black text-white p-4">
      <h1 className="text-3xl font-display font-bold text-vintage-gold mb-6 text-center">Test Battle Results</h1>
      <p className="text-center text-gray-400 mb-4 text-sm">Reproduz exatamente como no jogo, com audio</p>

      <div className="max-w-3xl mx-auto mb-6">
        <button onClick={() => { setSoundEnabled(!soundEnabled); setIsMusicEnabled(!isMusicEnabled); }}
          className={`${soundEnabled ? 'bg-green-600' : 'bg-red-600'} w-full px-6 py-3 rounded-xl font-bold text-white`}>
          {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Victory - 4 screens */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-vintage-gold/30">
          <h2 className="text-2xl font-display text-green-400 mb-4">🏆 Victory (4)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => { setVictoryImage('/victory-1.jpg'); setShowWinPopup(true); }} className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">
              Victory 1<br/><span className="text-xs opacity-70">Gigachad</span><br/><span className="text-[10px] text-green-300">🔊 win-sound.mp3</span>
            </button>
            <button onClick={() => { setVictoryImage('/victory-2.jpg'); setShowWinPopup(true); }} className="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold">
              Victory 2<br/><span className="text-xs opacity-70">Hearts</span><br/><span className="text-[10px] text-pink-300">🔊 marvin-victory.mp3</span>
            </button>
            <button onClick={() => { setVictoryImage('/victory-3.jpg'); setShowWinPopup(true); }} className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold">
              Victory 3<br/><span className="text-xs opacity-70">Sensual</span><br/><span className="text-[10px] text-purple-300">🔊 victory-3.mp3</span>
            </button>
            <button onClick={() => { setVictoryImage('/bom.jpg'); setShowWinPopup(true); }} className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold">
              Victory 4<br/><span className="text-xs opacity-70">Bom</span><br/><span className="text-[10px] text-yellow-300">🔊 victory-sound.mp3</span>
            </button>
          </div>
        </div>

        {/* Loss - 4 screens */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-red-500/30">
          <h2 className="text-2xl font-display text-red-400 mb-4">💀 Loss (4)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={() => showLoss(undefined)} className="px-4 py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold">Random</button>
            {LOSS_CONFIGS.map((config, index) => (
              <button key={index} onClick={() => showLoss({ media: config.media, isVideo: config.isVideo })} className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                Loss {index + 1}<br/><span className="text-xs opacity-70">{config.name}</span><br/><span className="text-[10px] text-red-300">🔊 {config.audio}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tie */}
        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-gray-500/30">
          <h2 className="text-2xl font-display text-gray-400 mb-4">🤝 Tie</h2>
          <button onClick={() => setShowTiePopup(true)} className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold">
            Tie Screen<br/><span className="text-xs opacity-70">tie.mp4 + tie-music.mp3</span>
          </button>
        </div>

        <div className="text-center pt-4"><a href="/" className="text-vintage-gold hover:underline">Back to Home</a></div>
      </div>

      <GamePopups
        showWinPopup={showWinPopup} currentVictoryImage={victoryImage} isInFarcaster={false}
        lastBattleResult={mockBattleResult} userProfile={mockUserProfile} soundEnabled={soundEnabled}
        handleCloseVictoryScreen={() => setShowWinPopup(false)} sharesRemaining={3} onShareClick={() => {}}
        showLossPopup={showLossPopup} handleCloseDefeatScreen={() => setShowLossPopup(false)}
        forcedLossMedia={forcedLossMedia} showTiePopup={showTiePopup} setShowTiePopup={setShowTiePopup}
        tieGifLoaded={true} errorMessage={null} setErrorMessage={() => {}} successMessage={null}
        setSuccessMessage={() => {}} showDailyClaimPopup={false} setShowDailyClaimPopup={() => {}}
        loginBonusClaimed={true} isClaimingBonus={false} handleClaimLoginBonus={() => {}}
        showWelcomePackPopup={false} setShowWelcomePackPopup={() => {}} isClaimingWelcomePack={false}
        handleClaimWelcomePack={() => {}} t={t}
      />
    </div>
  );
}
