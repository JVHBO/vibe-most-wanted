/**
 * Settings Modal Component
 *
 * Modal for user settings including music, language, username, and Twitter connection
 */

import Link from 'next/link';
import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any) => string;
  musicEnabled: boolean;
  toggleMusic: () => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  lang: string;
  setLang: (lang: any) => void;
  soundEnabled: boolean;
  musicMode: string;
  setMusicMode: (mode: any) => void;
  userProfile: UserProfile | null;
  showChangeUsername: boolean;
  setShowChangeUsername: (show: boolean) => void;
  newUsername: string;
  setNewUsername: (username: string) => void;
  isChangingUsername: boolean;
  setIsChangingUsername: (loading: boolean) => void;
  address: string | undefined;
  setUserProfile: (profile: UserProfile | null) => void;
  setErrorMessage: (message: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  t,
  musicEnabled,
  toggleMusic,
  musicVolume,
  setMusicVolume,
  lang,
  setLang,
  soundEnabled,
  musicMode,
  setMusicMode,
  userProfile,
  showChangeUsername,
  setShowChangeUsername,
  newUsername,
  setNewUsername,
  isChangingUsername,
  setIsChangingUsername,
  address,
  setUserProfile,
  setErrorMessage,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleUsernameChange = async () => {
    if (soundEnabled) AudioManager.buttonClick();

    if (!newUsername || newUsername.length < 3) {
      alert('Username must have at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(newUsername)) {
      alert('Username can only contain letters, numbers and underscore');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to change your username to @${newUsername}?\n\n` +
      `Your profile URL will change from:\n/profile/${userProfile?.username}\nto:\n/profile/${newUsername}\n\n` +
      `This action cannot be undone easily.`
    );

    if (!confirmed) return;

    setIsChangingUsername(true);
    try {
      await ConvexProfileService.updateUsername(address!, newUsername);

      // Reload the profile
      const updatedProfile = await ConvexProfileService.getProfile(address!);
      setUserProfile(updatedProfile);

      setShowChangeUsername(false);
      setNewUsername('');

      if (soundEnabled) AudioManager.buttonSuccess();
      alert(`Username successfully changed to @${newUsername}!`);
    } catch (err: any) {
      devError('Error changing username:', err);
      if (soundEnabled) AudioManager.buttonError();
      alert(`Error: ${err.message || 'Failed to change username'}`);
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleTwitterConnect = async () => {
    if (soundEnabled) AudioManager.buttonClick();

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      devLog('🔵 Calling Twitter OAuth API...');

      // Call our API to get Twitter OAuth URL
      const response = await fetch(`/api/auth/twitter?address=${address}`);
      devLog('📡 Response status:', response.status);

      const data = await response.json();
      devLog('📦 Response data:', data);

      if (data.url) {
        devLog('✓ Got OAuth URL, opening popup...');
        devLog('🔗 URL:', data.url);

        // Open Twitter OAuth in a popup
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
          data.url,
          'Twitter OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          setErrorMessage('Popup blocked! Please allow popups for this site.');
        }
      } else {
        devError('✗ No URL in response');
        throw new Error('Failed to get OAuth URL');
      }
    } catch (error) {
      devError('✗ Twitter OAuth error:', error);
      alert('Failed to connect Twitter. Check console for details.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[250] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-4 sm:p-8 max-w-md w-full shadow-gold max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold flex items-center gap-2">
            <span>§</span> {t('settings')}
          </h2>
          <button
            onClick={onClose}
            className="text-vintage-gold hover:text-vintage-ice text-xl sm:text-2xl transition"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 sm:space-y-6">
          {/* Music Toggle */}
          <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl text-vintage-gold">♫</span>
                <div>
                  <p className="font-modern font-bold text-vintage-gold">MUSIC</p>
                  <p className="text-xs text-vintage-burnt-gold">
                    {musicEnabled ? t('musicOn') : t('musicOff')}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMusic}
                className={`relative w-16 h-8 rounded-full transition-all border-2 ${
                  musicEnabled
                    ? 'bg-vintage-gold border-vintage-gold'
                    : 'bg-vintage-black border-vintage-gold/50'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 ${
                    musicEnabled ? 'bg-vintage-black' : 'bg-vintage-gold'
                  } rounded-full transition-transform ${
                    musicEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {musicEnabled && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-vintage-burnt-gold font-modern">VOLUME</span>
                  <span className="text-sm text-vintage-gold font-bold">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume * 100}
                  onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-vintage-black rounded-lg appearance-none cursor-pointer accent-vintage-gold border border-vintage-gold/30"
                />
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl sm:text-3xl text-vintage-gold">◊</span>
              <p className="font-modern font-bold text-vintage-gold">
                {t('language').toUpperCase()}
              </p>
            </div>
            <select
              onChange={(e) => setLang(e.target.value as any)}
              value={lang}
              className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 hover:bg-vintage-gold/10 transition cursor-pointer font-modern font-semibold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-ice [&>option]:py-2"
            >
              <option value="en" className="bg-vintage-charcoal text-vintage-ice">
                English
              </option>
              <option value="pt-BR" className="bg-vintage-charcoal text-vintage-ice">
                Português
              </option>
              <option value="es" className="bg-vintage-charcoal text-vintage-ice">
                Español
              </option>
              <option value="hi" className="bg-vintage-charcoal text-vintage-ice">
                हिन्दी
              </option>
              <option value="ru" className="bg-vintage-charcoal text-vintage-ice">
                Русский
              </option>
              <option value="zh-CN" className="bg-vintage-charcoal text-vintage-ice">
                简体中文
              </option>
            </select>
            {/* 🇨🇳 Chinese Language Boost Warning */}
            {lang === 'zh-CN' && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-300 font-modern font-semibold flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <span>+5% Social Credit Boost on all coin rewards!</span>
                </p>
              </div>
            )}
          </div>

          {/* Music Mode Selector */}
          <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl sm:text-3xl text-vintage-gold">♫</span>
              <p className="font-modern font-bold text-vintage-gold">BACKGROUND MUSIC</p>
            </div>
            <select
              onChange={(e) => {
                if (soundEnabled) AudioManager.buttonClick();
                setMusicMode(e.target.value as any);
              }}
              value={musicMode}
              className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 hover:bg-vintage-gold/10 transition cursor-pointer font-modern font-semibold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-ice [&>option]:py-2"
            >
              <option value="default" className="bg-vintage-charcoal text-vintage-ice">
                🎵 Default Music
              </option>
              <option value="language" className="bg-vintage-charcoal text-vintage-ice">
                🌍 Language Music
              </option>
            </select>
            <p className="text-xs text-vintage-burnt-gold mt-2 font-modern">
              {musicMode === 'default'
                ? '🎵 Playing default background music'
                : '🌍 Playing music based on selected language'}
            </p>
          </div>

          {/* Change Username */}
          {userProfile && (
            <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl sm:text-3xl text-vintage-gold">♔</span>
                <div className="flex-1">
                  <p className="font-modern font-bold text-vintage-gold">USERNAME</p>
                  <p className="text-xs text-vintage-burnt-gold">@{userProfile.username}</p>
                </div>
                {!showChangeUsername && (
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setShowChangeUsername(true);
                      setNewUsername('');
                    }}
                    className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-modern font-semibold transition text-sm"
                  >
                    Change
                  </button>
                )}
              </div>

              {showChangeUsername && (
                <div className="mt-4 space-y-3">
                  <div className="bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-3">
                    <p className="text-vintage-gold text-sm font-modern font-semibold mb-1">
                      ◆ IMPORTANT
                    </p>
                    <p className="text-vintage-burnt-gold text-xs">
                      Changing your username will change your profile URL from
                      <br />
                      <span className="font-mono bg-vintage-black/30 px-1 rounded">
                        /profile/{userProfile.username}
                      </span>{' '}
                      to
                      <br />
                      <span className="font-mono bg-vintage-black/30 px-1 rounded">
                        /profile/{newUsername || 'new_username'}
                      </span>
                    </p>
                  </div>

                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                    placeholder="New username"
                    className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 focus:border-vintage-gold focus:outline-none font-modern font-medium"
                    maxLength={20}
                  />
                  <p className="text-xs text-vintage-burnt-gold">
                    3-20 characters, only letters, numbers and underscore
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUsernameChange}
                      disabled={isChangingUsername}
                      className="flex-1 px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark disabled:bg-vintage-black/50 text-vintage-black rounded-lg font-modern font-semibold transition"
                    >
                      {isChangingUsername ? 'Changing...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonNav();
                        setShowChangeUsername(false);
                        setNewUsername('');
                      }}
                      disabled={isChangingUsername}
                      className="flex-1 px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 disabled:bg-vintage-black/30 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Twitter/X Connection */}
          {userProfile && (
            <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl text-vintage-gold">𝕏</span>
                  <div>
                    <p className="font-modern font-bold text-vintage-gold">X / TWITTER</p>
                    <p className="text-xs text-vintage-burnt-gold">
                      {userProfile.twitter ? `@${userProfile.twitter}` : 'Not connected'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTwitterConnect}
                  className="px-4 py-2 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-lg text-sm font-modern font-semibold transition flex items-center gap-2"
                >
                  <span>𝕏</span> {userProfile.twitter ? 'Reconnect' : 'Connect'}
                </button>
              </div>

              {/* Easter egg message to Vibe Market */}
              <div className="mt-3 pt-3 border-t border-vintage-gold/30">
                <p className="text-xs text-vintage-burnt-gold italic text-center">
                  {t('vibeMarketEasterEgg')}
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold hover:shadow-gold-lg transition-all"
          >
            {t('understood')}
          </button>
        </div>
      </div>
    </div>
  );
}
