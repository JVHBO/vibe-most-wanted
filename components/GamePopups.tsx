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
 */

import { AudioManager } from '@/lib/audio-manager';
import { FarcasterIcon } from '@/components/PokerIcons';

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
  return (
    <>
      {/* Preload tie.gif for faster display */}
      <img src="/tie.gif" alt="" className="hidden" aria-hidden="true" />

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

          {/* 👅 VICTORY 3 - Sensual tongues floating effect */}
          {currentVictoryImage === '/victory-3.jpg' && !isInFarcaster && (
            <>
              {/* Audio for victory-3 (disabled in miniapp for performance) - respects soundEnabled */}
              {soundEnabled && (
                <audio autoPlay loop>
                  <source src="/victory-3.mp3" type="audio/mpeg" />
                </audio>
              )}

              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Tongues floating and licking */}
                {[...Array(25)].map((_, i) => (
                  <div
                    key={`tongue-${i}`}
                    className="absolute animate-float-heart text-5xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                      filter: 'drop-shadow(0 0 8px rgba(255, 20, 147, 0.6))',
                      transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                  >
                    👅
                  </div>
                ))}

                {/* Peaches and eggplants for extra sensuality */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`peach-${i}`}
                    className="absolute animate-pulse text-4xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1.5 + Math.random() * 1.5}s`,
                      filter: 'drop-shadow(0 0 6px rgba(255, 105, 180, 0.5))',
                    }}
                  >
                    {i % 2 === 0 ? '🍑' : '🍆'}
                  </div>
                ))}

                {/* Water drops/sweat */}
                {[...Array(15)].map((_, i) => (
                  <div
                    key={`drop-${i}`}
                    className="absolute animate-ping text-3xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  >
                    💦
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {/* Victory 4 - Video (littlebird) */}
            {currentVictoryImage === '/littlebird.mp4' ? (
              <video
                src={currentVictoryImage}
                autoPlay
                loop
                muted={!soundEnabled}
                playsInline
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-blue-500/50 border-4 border-blue-400"
              />
            ) : (
              <img
                src={currentVictoryImage}
                alt="Victory!"
                className={`rounded-2xl shadow-2xl border-4 ${
                  currentVictoryImage === '/victory-2.jpg'
                    ? 'max-w-[90vw] max-h-[80vh] shadow-pink-500/50 border-pink-400 animate-pulse-glow'
                    : currentVictoryImage === '/victory-3.jpg'
                    ? 'max-w-[90vw] max-h-[55vh] object-contain shadow-gold-500/50 border-gold-400 animate-pulse-glow'
                    : 'max-w-[90vw] max-h-[80vh] shadow-yellow-500/50 border-yellow-400'
                }`}
              />
            )}
            <div className="text-center px-4">
              <p className="text-2xl md:text-3xl font-bold text-yellow-400 animate-pulse">
                {lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0
                  ? t('earnedCoins').replace('{amount}', lastBattleResult.coinsEarned.toString())
                  : t('victoryPrize')}
              </p>
              {/* PvP Inbox Reminder */}
              {lastBattleResult?.type === 'pvp' && lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0 && (
                <p className="text-lg text-green-400 font-semibold mt-2 animate-bounce">
                  📬 Check your inbox to claim TESTVBMS!
                </p>
              )}
            </div>

            {/* Share Incentive Banner */}
            {sharesRemaining !== undefined && sharesRemaining > 0 && (
              <div className="bg-green-500/20 border border-green-400 rounded-lg px-4 py-2 text-center">
                <p className="text-green-400 font-bold text-sm animate-pulse">
                  💰 Share & earn +10 coins! ({sharesRemaining}/3 today)
                </p>
              </div>
            )}
            {sharesRemaining === 0 && (
              <div className="bg-gray-500/20 border border-gray-400 rounded-lg px-4 py-2 text-center">
                <p className="text-gray-400 font-semibold text-sm">
                  Daily share limit reached (3/3)
                </p>
              </div>
            )}

            <div className="flex gap-3">
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
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>𝕏</span> {t('shareVictory')}
              </a>
              <a
                href={(() => {
                  if (!lastBattleResult) return '#';

                  // Generate matchId for share URL (format: result|playerPower|opponentPower|opponentName|playerName|type)
                  // PFPs will be fetched from Convex by the OG image generator using usernames
                  const playerName = encodeURIComponent(userProfile?.username || 'Player');
                  const opponentName = encodeURIComponent(lastBattleResult.opponentName || 'Opponent');
                  const battleType = lastBattleResult.type || 'pve';

                  const matchId = `win|${lastBattleResult.playerPower}|${lastBattleResult.opponentPower}|${opponentName}|${playerName}|${battleType}`;
                  const shareUrl = `${window.location.origin}/share/${matchId}?v=${Date.now()}`;

                  let castText = t('castVictory', { power: lastBattleResult.playerPower });

                  if (lastBattleResult.type === 'attack') {
                    castText += `\n\nAttacked ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `\n\nDefended against ${lastBattleResult.opponentName}!`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `\n\nDefeated ${lastBattleResult.opponentName}!`;
                  }

                  castText += `\n\n${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}\n\n@jvhbo`;

                  return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonSuccess();
                  if (onShareClick) onShareClick('farcaster');
                }}
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <FarcasterIcon size={18} /> Cast
              </a>
            </div>
            <button
              onClick={handleCloseVictoryScreen}
              className="absolute top-4 right-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-gold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loss Popup */}
      {showLossPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={handleCloseDefeatScreen}>
          {/* Loss audio */}
          {!isInFarcaster && soundEnabled && (
            <audio autoPlay>
              <source src="/lose-sound.mp3" type="audio/mpeg" />
            </audio>
          )}
          <div className="relative flex flex-col items-center gap-4">
            <img
              src="https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26"
              alt="You Lost"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-red-500/50 border-4 border-red-500"
            />
            <p className="text-2xl md:text-3xl font-bold text-red-400 animate-pulse px-4 text-center">
              {lastBattleResult?.type === 'pve' || lastBattleResult?.type === 'attack'
                ? t('noCoinsEarned')
                : lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0
                  ? t('earnedCoins').replace('{amount}', lastBattleResult.coinsEarned.toString())
                  : t('defeatPrize')}
            </p>
            <div className="flex gap-3">
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
                className="px-6 py-3 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-xl font-display font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>𝕏</span> {t('shareDefeat')}
              </a>
              <a
                href={(() => {
                  if (!lastBattleResult) return '#';

                  // Generate matchId for share URL (format: result|playerPower|opponentPower|opponentName|playerName|type)
                  // PFPs will be fetched from Convex by the OG image generator using usernames
                  const playerName = encodeURIComponent(userProfile?.username || 'Player');
                  const opponentName = encodeURIComponent(lastBattleResult.opponentName || 'Opponent');
                  const battleType = lastBattleResult.type || 'pve';

                  const matchId = `loss|${lastBattleResult.playerPower}|${lastBattleResult.opponentPower}|${opponentName}|${playerName}|${battleType}`;
                  const shareUrl = `${window.location.origin}/share/${matchId}?v=${Date.now()}`;

                  let castText = t('castDefeat', { power: lastBattleResult.playerPower });

                  if (lastBattleResult.type === 'attack') {
                    castText += `\n\nLost attacking ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'defense') {
                    castText += `\n\nDefense failed against ${lastBattleResult.opponentName}`;
                  } else if (lastBattleResult.type === 'pvp') {
                    castText += `\n\nLost to ${lastBattleResult.opponentName}`;
                  }

                  castText += `\n\n${lastBattleResult.playerPower} vs ${lastBattleResult.opponentPower}\n\n@jvhbo`;

                  return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (soundEnabled) AudioManager.buttonSuccess(); }}
                className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold shadow-gold transition-all hover:scale-105 flex items-center gap-2"
              >
                <FarcasterIcon size={18} /> Cast
              </a>
            </div>
            <button
              onClick={handleCloseDefeatScreen}
              className="absolute top-4 right-4 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tie Popup */}
      {showTiePopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={() => setShowTiePopup(false)}>
          <div className="relative flex flex-col items-center gap-4">
            <img
              src="/tie.gif"
              alt="Tie!"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl shadow-gray-500/50 border-4 border-gray-400"
            />
            <p className="text-2xl md:text-3xl font-bold text-gray-400 animate-pulse px-4 text-center">
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
              className="absolute top-4 right-4 bg-gray-400 hover:bg-gray-500 text-vintage-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
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
              Welcome to Vibe Most Wanted! As a gift, you receive <span className="text-vintage-gold font-bold">1 FREE Basic Pack</span> to start your collection!
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
