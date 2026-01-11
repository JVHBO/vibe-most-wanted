/**
 * Game Popups Component
 *
 * Handles all game result and notification popups:
 * - Victory popup (with gay vibes hearts effect)
 * - Loss popup
 * - Tie popup
 * - Error popup
 * - Success popup
 * - Daily claim popup
 *
 * Automatically pauses background music when showing result popups
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import { FarcasterIcon } from '@/components/PokerIcons';
import { useMusic } from '@/contexts/MusicContext';
import { shareToFarcaster } from '@/lib/share-utils';
import { getAssetUrl } from '@/lib/ipfs-assets';
import haptics from '@/lib/haptics';

// Pre-generated random positions for victory-3 animation (REDUCED for mobile performance)
const VICTORY3_TONGUE_POSITIONS = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 12.5) % 100}%`,
  animationDelay: `${(i * 0.3) % 2}s`,
  animationDuration: `${2.5 + (i % 2)}s`,
  rotation: `${(i * 45) % 360}deg`,
}));

const VICTORY3_PEACH_POSITIONS = Array.from({ length: 4 }, (_, i) => ({
  left: `${(i * 25) % 100}%`,
  top: `${(i * 25) % 100}%`,
  animationDelay: `${(i * 0.4) % 2}s`,
  animationDuration: `${1.5 + (i % 2) * 0.5}s`,
}));

const VICTORY3_DROP_POSITIONS = Array.from({ length: 4 }, (_, i) => ({
  left: `${(i * 25) % 100}%`,
  top: `${(i * 25) % 100}%`,
  animationDelay: `${(i * 0.5) % 2}s`,
  animationDuration: `${2 + (i % 2)}s`,
}));

// Loss screen configurations - randomly selected
const LOSS_CONFIGS = [
  { media: 'https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26', isVideo: false }, // Sad Pikachu
  { media: '/davyjones.mp4', isVideo: true }, // Davy Jones
  { media: '/derrotanumeronsei.mp4', isVideo: true }, // Derrota N6
  { media: '/littlebird.mp4', isVideo: true }, // Little bird defeat
];

interface BattleResult {
  coinsEarned?: number;
  type?: string;
  playerPower?: number;
  opponentPower?: number;
  opponentName?: string;
  opponentTwitter?: string;
  playerPfpUrl?: string;
  opponentPfpUrl?: string;
}

interface UserProfile {
  username?: string;
  twitterProfileImageUrl?: string;
}

interface GamePopupsProps {
  // Victory popup
  showWinPopup: boolean;
  currentVictoryImage: string;
  isInFarcaster: boolean;
  lastBattleResult: BattleResult | null;
  userProfile: UserProfile | null | undefined;
  soundEnabled: boolean;
  handleCloseVictoryScreen: () => void;

  // Share incentives
  sharesRemaining?: number;
  onShareClick?: (platform: 'twitter' | 'farcaster') => void;

  // Loss popup
  showLossPopup: boolean;
  handleCloseDefeatScreen: () => void;
  forcedLossMedia?: { media: string; isVideo: boolean }; // For testing specific loss screens

  // Tie popup
  showTiePopup: boolean;
  setShowTiePopup: (show: boolean) => void;
  tieGifLoaded: boolean;

  // Error popup
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;

  // Success popup
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;

  // Daily claim popup
  showDailyClaimPopup: boolean;
  setShowDailyClaimPopup: (show: boolean) => void;
  loginBonusClaimed: boolean;
  isClaimingBonus: boolean;
  handleClaimLoginBonus: () => void;
  onDailyClaimNow?: () => void; // Trigger reward choice modal for blockchain TX

  // Welcome pack popup
  showWelcomePackPopup: boolean;
  setShowWelcomePackPopup: (show: boolean) => void;
  isClaimingWelcomePack: boolean;
  handleClaimWelcomePack: () => void;

  // Translation
  t: any;
}

export function GamePopups({
  showWinPopup,
  currentVictoryImage,
  isInFarcaster,
  lastBattleResult,
  userProfile,
  soundEnabled,
  handleCloseVictoryScreen,
  sharesRemaining,
  onShareClick,
  showLossPopup,
  handleCloseDefeatScreen,
  forcedLossMedia,
  showTiePopup,
  setShowTiePopup,
  tieGifLoaded,
  errorMessage,
  setErrorMessage,
  successMessage,
  setSuccessMessage,
  showDailyClaimPopup,
  setShowDailyClaimPopup,
  loginBonusClaimed,
  isClaimingBonus,
  handleClaimLoginBonus,
  onDailyClaimNow,
  showWelcomePackPopup,
  setShowWelcomePackPopup,
  isClaimingWelcomePack,
  handleClaimWelcomePack,
  t,
}: GamePopupsProps) {
  // Music control - pause when showing result popups
  const { pause, play, isPaused } = useMusic();
  const wasPausedBeforePopup = useRef(false);

  // Track which loss media to show (randomly selected on popup open)
  const [currentLossMedia, setCurrentLossMedia] = useState(LOSS_CONFIGS[0]);

  // Select loss media when popup opens (forced or random)
  useEffect(() => {
    if (showLossPopup) {
      if (forcedLossMedia) {
        setCurrentLossMedia(forcedLossMedia);
      } else {
        const randomIndex = Math.floor(Math.random() * LOSS_CONFIGS.length);
        setCurrentLossMedia(LOSS_CONFIGS[randomIndex]);
      }
    }
  }, [showLossPopup, forcedLossMedia]);

  // Pause/Resume background music when result popups are shown
  // Track if popup was already open to prevent multiple pause/play calls
  const popupWasOpenRef = useRef(false);

  useEffect(() => {
    const isAnyPopupOpen = showWinPopup || showLossPopup || showTiePopup;

    // Only pause when popup first opens (transition from closed to open)
    if (isAnyPopupOpen && !popupWasOpenRef.current) {
      // Haptic feedback based on popup type
      if (showWinPopup) haptics.victory();
      else if (showLossPopup) haptics.defeat();
      else if (showTiePopup) haptics.action();
      popupWasOpenRef.current = true;
      wasPausedBeforePopup.current = isPaused;
      if (!isPaused) {
        pause();
      }
    }
    // Only resume when popup closes (transition from open to closed)
    else if (!isAnyPopupOpen && popupWasOpenRef.current) {
      popupWasOpenRef.current = false;
      if (!wasPausedBeforePopup.current) {
        play();
      }
    }
  }, [showWinPopup, showLossPopup, showTiePopup, pause, play, isPaused]);

  return (
    <>
      {/* Preload tie.mp4 and davyjones.mp4 for faster display */}
      <link rel="preload" href={getAssetUrl("/tie.mp4")} as="video" type="video/mp4" />

      {/* Victory Popup */}
      {showWinPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={handleCloseVictoryScreen}>
          {/* Victory audio for victory-1 (win-sound) */}
          {currentVictoryImage === '/victory-1.jpg' && !isInFarcaster && soundEnabled && (
            <audio autoPlay>
              <source src="/win-sound.mp3" type="audio/mpeg" />
            </audio>
          )}

          {/* Victory audio for victory-2 (marvin-victory) */}
          {currentVictoryImage === '/victory-2.jpg' && !isInFarcaster && soundEnabled && (
            <audio autoPlay>
              <source src="/marvin-victory.mp3" type="audio/mpeg" />
            </audio>
          )}

          {/* Victory audio for bom.jpg (victory-sound) */}
          {currentVictoryImage === '/bom.jpg' && !isInFarcaster && soundEnabled && (
            <audio autoPlay>
              <source src="/victory-sound.mp3" type="audio/mpeg" />
            </audio>
          )}

          {/* 🌈 GAY VIBES - Floating hearts effect for victory-2 (reduced from 20 to 8 for performance) */}
          {currentVictoryImage === '/victory-2.jpg' && !isInFarcaster && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Shared SVG definitions for better performance */}
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id="heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ff6ec7', stopOpacity: 0.9 }} />
                    <stop offset="50%" style={{ stopColor: '#ff1493', stopOpacity: 0.9 }} />
                    <stop offset="100%" style={{ stopColor: '#ff69b4', stopOpacity: 0.9 }} />
                  </linearGradient>
                </defs>
              </svg>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-float-heart text-3xl"
                  style={{
                    left: `${12.5 * i}%`,
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: `${3 + (i % 3)}s`,
                  }}
                >
                  💖
                </div>
              ))}
            </div>
          )}

          {/* 👅 VICTORY 3 - Sensual tongues floating effect (optimized with pre-generated positions) */}
          {currentVictoryImage === '/victory-3.jpg' && !isInFarcaster && (
            <>
              {/* Audio for victory-3 (disabled in miniapp for performance) - respects soundEnabled */}
              {soundEnabled && (
                <audio autoPlay loop>
                  <source src="/victory-3.mp3" type="audio/mpeg" />
                </audio>
              )}

              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Tongues floating and licking - using pre-generated positions */}
                {VICTORY3_TONGUE_POSITIONS.map((pos, i) => (
                  <div
                    key={`tongue-${i}`}
                    className="absolute animate-float-heart text-5xl"
                    style={{
                      left: pos.left,
                      animationDelay: pos.animationDelay,
                      animationDuration: pos.animationDuration,
                      filter: 'drop-shadow(0 0 8px rgba(255, 20, 147, 0.6))',
                      transform: `rotate(${pos.rotation})`,
                    }}
                  >
                    👅
                  </div>
                ))}

                {/* Peaches and eggplants - using pre-generated positions */}
                {VICTORY3_PEACH_POSITIONS.map((pos, i) => (
                  <div
                    key={`peach-${i}`}
                    className="absolute animate-pulse text-4xl"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      animationDelay: pos.animationDelay,
                      animationDuration: pos.animationDuration,
                      filter: 'drop-shadow(0 0 6px rgba(255, 105, 180, 0.5))',
                    }}
                  >
                    {i % 2 === 0 ? '🍑' : '🍆'}
                  </div>
                ))}

                {/* Water drops/sweat - using pre-generated positions */}
                {VICTORY3_DROP_POSITIONS.map((pos, i) => (
                  <div
                    key={`drop-${i}`}
                    className="absolute animate-ping text-3xl"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      animationDelay: pos.animationDelay,
                      animationDuration: pos.animationDuration,
                    }}
                  >
                    💦
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="relative flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <img
                src={currentVictoryImage}
                alt="Victory!"
                className={`rounded-xl shadow-2xl border-2 object-contain ${
                  currentVictoryImage === '/victory-2.jpg'
                    ? 'max-w-[85vw] max-h-[50vh] shadow-pink-500/50 border-pink-400 animate-pulse-glow'
                    : currentVictoryImage === '/victory-3.jpg'
                    ? 'max-w-[85vw] max-h-[45vh] shadow-gold-500/50 border-gold-400 animate-pulse-glow'
                    : 'max-w-[85vw] max-h-[50vh] shadow-yellow-500/50 border-yellow-400'
                }`}
              />
            <div className="text-center px-2">
              <p className="text-lg md:text-xl font-bold text-yellow-400 animate-pulse">
                {lastBattleResult?.type === 'mecha' && lastBattleResult?.coinsEarned !== undefined
                  ? `Won ${lastBattleResult.coinsEarned.toLocaleString()} VBMS!`
                  : lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0
                    ? t('earnedCoins').replace('{amount}', lastBattleResult.coinsEarned.toString())
                    : t('victoryPrize')}
              </p>
              {/* PvP Inbox Reminder */}
              {lastBattleResult?.type === 'pvp' && lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0 && (
                <p className="text-sm text-green-400 font-semibold mt-1 animate-bounce">
                  📬 Check inbox to claim coins!
                </p>
              )}
            </div>

            {/* Share Incentive Banner */}
            {sharesRemaining !== undefined && sharesRemaining > 0 && (
              <div className="bg-green-500/20 border border-green-400 rounded-lg px-2 py-1 text-center">
                <p className="text-green-400 font-bold text-xs animate-pulse">
                  💰 Share +10 coins! ({sharesRemaining}/3)
                </p>
              </div>
            )}
            {sharesRemaining === 0 && (
              <div className="bg-gray-500/20 border border-gray-400 rounded-lg px-2 py-1 text-center">
                <p className="text-gray-400 font-semibold text-xs">
                  Share limit reached (3/3)
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <a
                href={(() => {
                  if (!lastBattleResult || !userProfile) return '#';
                  const profileUrl = `${window.location.origin}/profile/${userProfile.username}`;

                  let tweetText = t('tweetVictory', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.opponentTwitter && lastBattleResult.type !== 'pve') {
                    const twitterHandle = lastBattleResult.opponentTwitter.replace('@', '');
                    tweetText += `\n\nDefeated @${twitterHandle}!`;
                  }

                  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonSuccess();
                  if (onShareClick) onShareClick('twitter');
                }}
                className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm shadow-gold transition-all hover:scale-105 flex items-center gap-1"
              >
                <span>𝕏</span> {t('shareVictory')}
              </a>
              <button
                onClick={() => {
                  if (!lastBattleResult) return;
                  if (soundEnabled) AudioManager.buttonSuccess();
                  if (onShareClick) onShareClick('farcaster');

                  const playerName = encodeURIComponent(userProfile?.username || 'Player');
                  const opponentName = encodeURIComponent(lastBattleResult.opponentName || 'Opponent');
                  const battleType = lastBattleResult.type || 'pve';
                  const matchId = `win|${lastBattleResult.playerPower}|${lastBattleResult.opponentPower}|${opponentName}|${playerName}|${battleType}`;
                  const shareUrl = `${window.location.origin}/share/${matchId}?v=${Date.now()}`;

                  let castText = t('castVictory', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.type === 'attack') {
                    castText += `

Attacked ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `

Defended against ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `

Defeated ${lastBattleResult.opponentName}!`;
                  }
                  castText += `

${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}

@jvhbo`;

                  shareToFarcaster(castText, shareUrl);
                }}
                className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm shadow-gold transition-all hover:scale-105 flex items-center gap-1"
              >
                <FarcasterIcon size={16} /> Cast
              </button>
            </div>
            <button
              onClick={handleCloseVictoryScreen}
              className="absolute top-2 right-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-gold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loss Popup */}
      {showLossPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={handleCloseDefeatScreen}>
          {/* Loss audio - only for image, video has embedded audio */}
          {!currentLossMedia.isVideo && !isInFarcaster && soundEnabled && (
            <audio autoPlay>
              <source src="/lose-sound.mp3" type="audio/mpeg" />
            </audio>
          )}
          <div className="relative flex flex-col items-center gap-2">
            {/* Loss screen - Video or Image */}
            {currentLossMedia.isVideo ? (
              <video
                src={currentLossMedia.media.startsWith("http") ? currentLossMedia.media : getAssetUrl(currentLossMedia.media)}
                autoPlay
                loop
                muted={!soundEnabled}
                playsInline
                className="max-w-[85vw] max-h-[50vh] object-contain rounded-xl shadow-2xl shadow-red-500/50 border-2 border-red-500"
              />
            ) : (
              <img
                src={currentLossMedia.media.startsWith("http") ? currentLossMedia.media : getAssetUrl(currentLossMedia.media)}
                alt="You Lost"
                className="max-w-[85vw] max-h-[50vh] object-contain rounded-xl shadow-2xl shadow-red-500/50 border-2 border-red-500"
              />
            )}
            <p className="text-lg md:text-xl font-bold text-red-400 animate-pulse px-2 text-center">
              {lastBattleResult?.type === 'pve' || lastBattleResult?.type === 'attack'
                ? t('noCoinsEarned')
                : lastBattleResult?.type === 'mecha' && lastBattleResult?.coinsEarned !== undefined
                  ? `Lost ${Math.abs(lastBattleResult.coinsEarned).toLocaleString()} VBMS`
                  : lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0
                    ? t('earnedCoins').replace('{amount}', lastBattleResult.coinsEarned.toString())
                    : t('defeatPrize')}
            </p>
            <div className="flex gap-2">
              <a
                href={(() => {
                  if (!lastBattleResult || !userProfile) return '#';
                  const profileUrl = `${window.location.origin}/profile/${userProfile.username}`;

                  let tweetText = t('tweetDefeat', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.opponentTwitter && lastBattleResult.type !== 'pve') {
                    const twitterHandle = lastBattleResult.opponentTwitter.replace('@', '');
                    tweetText += `\n\nLost to @${twitterHandle} - I want a rematch!`;
                  }

                  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-4 py-2 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-lg font-display font-bold text-sm shadow-lg transition-all hover:scale-105 flex items-center gap-1"
              >
                <span>𝕏</span> {t('shareDefeat')}
              </a>
              <button
                onClick={() => {
                  if (!lastBattleResult) return;
                  if (soundEnabled) AudioManager.buttonSuccess();

                  const playerName = encodeURIComponent(userProfile?.username || 'Player');
                  const opponentName = encodeURIComponent(lastBattleResult.opponentName || 'Opponent');
                  const battleType = lastBattleResult.type || 'pve';
                  const matchId = `loss|${lastBattleResult.playerPower}|${lastBattleResult.opponentPower}|${opponentName}|${playerName}|${battleType}`;
                  const shareUrl = `${window.location.origin}/share/${matchId}?v=${Date.now()}`;

                  let castText = t('castDefeat', { power: lastBattleResult.playerPower });
                  if (lastBattleResult.type === 'attack') {
                    castText += `

Lost attacking ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `

Defense failed against ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `

Lost to ${lastBattleResult.opponentName}`;
                  }
                  castText += `

${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}

@jvhbo`;

                  shareToFarcaster(castText, shareUrl);
                }}
                className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm shadow-gold transition-all hover:scale-105 flex items-center gap-1"
              >
                <FarcasterIcon size={16} /> Cast
              </button>
            </div>
            <button
              onClick={handleCloseDefeatScreen}
              className="absolute top-2 right-2 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tie Popup */}
      {showTiePopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={() => setShowTiePopup(false)}>
          <div className="relative flex flex-col items-center gap-2">
            <video
              src={getAssetUrl("/tie.mp4")}
              autoPlay
              loop
              muted
              playsInline
              className="max-w-[85vw] max-h-[50vh] object-contain rounded-xl shadow-2xl shadow-gray-500/50 border-2 border-gray-400"
            />
            <p className="text-lg md:text-xl font-bold text-gray-400 animate-pulse px-2 text-center">
              {t('tieResult')}
            </p>
            {/* Only play audio after GIF is preloaded - respects soundEnabled */}
            {tieGifLoaded && soundEnabled && (
              <audio autoPlay loop>
                <source src="/tie-music.mp3" type="audio/mpeg" />
              </audio>
            )}
            <button
              onClick={() => setShowTiePopup(false)}
              className="absolute top-2 right-2 bg-gray-400 hover:bg-gray-500 text-vintage-black rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Popup - Custom alert replacement (hidden in Farcaster) */}
      {errorMessage && !isInFarcaster && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4" onClick={() => setErrorMessage(null)}>
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-red-500 max-w-md w-full p-6 shadow-2xl shadow-red-500/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">⚠️</div>
              <h2 className="text-2xl font-display font-bold text-red-400">Error</h2>
            </div>
            <p className="text-vintage-ice whitespace-pre-line mb-6 font-modern">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all hover:scale-105"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Toast - Achievement rewards (hidden in Farcaster) */}
      {successMessage && !isInFarcaster && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4" onClick={() => setSuccessMessage(null)}>
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full p-6 shadow-2xl shadow-vintage-gold/50 animate-[fadeIn_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-display font-bold text-vintage-gold">Success!</h2>
            </div>
            <p className="text-vintage-ice whitespace-pre-line mb-6 font-modern text-lg">
              {successMessage}
            </p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-vintage-gold/30"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Daily Claim Popup - Shows on login (hidden in Farcaster) */}
      {showDailyClaimPopup && !isInFarcaster && !loginBonusClaimed && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4" onClick={() => setShowDailyClaimPopup(false)}>
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-green-500 max-w-md w-full p-6 shadow-2xl shadow-green-500/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🎁</span>
              <h2 className="text-2xl font-display font-bold text-green-400">Daily Bonus Available</h2>
            </div>
            <p className="text-vintage-ice mb-6 font-modern text-lg">
              Claim your daily bonus: <span className="text-vintage-gold font-bold">+25 VBMS</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (onDailyClaimNow) {
                    onDailyClaimNow();
                  }
                  setShowDailyClaimPopup(false);
                }}
                disabled={isClaimingBonus}
                className="flex-1 px-6 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-vintage-gold/30"
              >
                {isClaimingBonus ? 'Claiming...' : 'Claim Now 💎'}
              </button>
              <button
                onClick={() => setShowDailyClaimPopup(false)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all hover:scale-105"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Pack Popup - Shows ONCE on first login */}
      {showWelcomePackPopup && !isInFarcaster && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4" onClick={() => setShowWelcomePackPopup(false)}>
          <div className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full p-6 shadow-2xl shadow-vintage-gold/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🎁</span>
              <h2 className="text-2xl font-display font-bold text-vintage-gold">Welcome Gift!</h2>
            </div>
            <p className="text-vintage-ice mb-6 font-modern text-lg">
              Welcome to $VBMS! As a gift, you receive <span className="text-vintage-gold font-bold">1 FREE Basic Pack</span> to start your collection!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleClaimWelcomePack();
                  setShowWelcomePackPopup(false);
                }}
                disabled={isClaimingWelcomePack}
                className="flex-1 px-6 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-vintage-gold/30"
              >
                {isClaimingWelcomePack ? 'Claiming...' : 'Claim Gift!'}
              </button>
              <button
                onClick={() => setShowWelcomePackPopup(false)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all hover:scale-105"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
