/**
 * Settings Modal Component
 *
 * Modal for user settings including music, language, username, and Twitter connection
 */

import Link from 'next/link';
import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { createPortal } from "react-dom";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { writeContract } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';
import { encodeFunctionData } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
  // Custom Music props
  customMusicUrl: string;
  setCustomMusicUrl: (url: string) => void;
  isCustomMusicLoading: boolean;
  customMusicError: string | null;
  // Playlist props
  playlist: string[];
  setPlaylist: (urls: string[]) => void;
  addToPlaylist: (url: string) => void;
  removeFromPlaylist: (index: number) => void;
  currentPlaylistIndex: number;
  skipToNext: () => void;
  skipToPrevious: () => void;
  currentTrackName: string | null;
  currentTrackThumbnail: string | null;
  // Playback control
  isPaused: boolean;
  pause: () => void;
  play: () => void;
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
  customMusicUrl,
  setCustomMusicUrl,
  isCustomMusicLoading,
  customMusicError,
  playlist,
  setPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  currentPlaylistIndex,
  skipToNext,
  skipToPrevious,
  currentTrackName,
  currentTrackThumbnail,
  isPaused,
  pause,
  play,
}: SettingsModalProps) {
  const { address: walletAddress } = useAccount();
  const [isRevoking, setIsRevoking] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(customMusicUrl || '');
  const [playlistUrlInput, setPlaylistUrlInput] = useState('');
  const updateCustomMusic = useMutation(api.profiles.updateCustomMusic);
  const updateMusicPlaylist = useMutation(api.profiles.updateMusicPlaylist);

  // Detect if running in miniapp via desktop browser (has audio restrictions)
  const isInMiniappBrowser = typeof window !== 'undefined' &&
    window.self !== window.top && // In iframe
    !/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent); // Desktop browser

  if (!isOpen) return null;

  // Helper to detect if URL is YouTube
  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Handle custom music URL save
  const handleSaveCustomMusic = async () => {
    if (soundEnabled) AudioManager.buttonClick();

    if (!customUrlInput.trim()) {
      // Clear custom music
      setCustomMusicUrl('');
      setMusicMode('default');
      if (address) {
        try {
          await updateCustomMusic({ address, customMusicUrl: null });
        } catch (e) {
          console.error('Failed to clear custom music:', e);
        }
      }
      return;
    }

    // Validate URL
    try {
      new URL(customUrlInput);
    } catch {
      alert('Invalid URL format');
      return;
    }

    // Set the custom music
    setCustomMusicUrl(customUrlInput);
    setMusicMode('custom');

    // Save to profile
    if (address) {
      try {
        await updateCustomMusic({ address, customMusicUrl: customUrlInput });
        if (soundEnabled) AudioManager.buttonSuccess();
      } catch (e) {
        console.error('Failed to save custom music:', e);
        if (soundEnabled) AudioManager.buttonError();
      }
    }
  };

  const handleRevokeApproval = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to revoke VBMS approval for PokerBattle contract?\n\n' +
      'You will need to approve again to create or join battles.'
    );

    if (!confirmed) return;

    setIsRevoking(true);
    try {
      // Detect iOS for alternative transaction method
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS: Use Farcaster SDK eth_sendTransaction
        console.log('[SettingsModal] Using Farcaster SDK for iOS');
        const provider = await sdk.wallet.getEthereumProvider();
        if (!provider) {
          throw new Error('No provider available');
        }
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.VBMSPokerBattle as `0x${string}`, BigInt(0)],
        });

        await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress as `0x${string}`,
            to: CONTRACTS.VBMSToken as `0x${string}`,
            data,
          }],
        });
      } else {
        // Non-iOS: Use standard writeContract
        await writeContract(config, {
          address: CONTRACTS.VBMSToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.VBMSPokerBattle as `0x${string}`, BigInt(0)],
        });
      }

      if (soundEnabled) AudioManager.buttonSuccess();
      alert('VBMS approval revoked successfully!');
    } catch (error: any) {
      console.error('Error revoking approval:', error);
      if (soundEnabled) AudioManager.buttonError();
      alert('Failed to revoke approval: ' + (error.message || 'Unknown error'));
    } finally {
      setIsRevoking(false);
    }
  };

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

  // SSR check
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-2 sm:p-4"
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

            {/* Warning for miniapp in desktop browser */}
            {isInMiniappBrowser && (
              <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <p className="text-sm text-yellow-300 font-modern flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    Custom music may not work in this mode due to browser restrictions.
                    Use the mobile app or access the site directly for full audio support.
                  </span>
                </p>
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
                const mode = e.target.value;
                setMusicMode(mode as any);
              }}
              value={musicMode}
              className="w-full bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 hover:bg-vintage-gold/10 transition cursor-pointer font-modern font-semibold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-ice [&>option]:py-2"
            >
              <option value="default" className="bg-vintage-charcoal text-vintage-ice">
                Default Music
              </option>
              <option value="language" className="bg-vintage-charcoal text-vintage-ice">
                Language Music
              </option>
              <option value="custom" className="bg-vintage-charcoal text-vintage-ice">
                Custom URL (Single)
              </option>
              <option value="playlist" className="bg-vintage-charcoal text-vintage-ice">
                🎵 Playlist (Multiple URLs)
              </option>
            </select>
            <p className="text-xs text-vintage-burnt-gold mt-2 font-modern">
              {musicMode === 'default'
                ? 'Playing default background music'
                : musicMode === 'language'
                ? 'Playing music based on selected language'
                : musicMode === 'playlist'
                ? `Playlist: ${currentTrackName || `Track ${currentPlaylistIndex + 1}`} (${currentPlaylistIndex + 1}/${playlist.length})`
                : 'Playing your custom music'}
            </p>

            {/* Custom URL Input - shown when custom mode selected */}
            {musicMode === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
                  <p className="text-vintage-gold text-xs font-modern font-semibold mb-1">
                    SUPPORTED FORMATS
                  </p>
                  <p className="text-vintage-burnt-gold text-xs">
                    YouTube URL (audio only) or direct audio URL (.mp3, .wav, .ogg)
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or audio URL"
                    className="flex-1 bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 focus:border-vintage-gold focus:outline-none font-modern text-sm placeholder:text-vintage-burnt-gold/50"
                  />
                  <button
                    onClick={handleSaveCustomMusic}
                    disabled={isCustomMusicLoading}
                    className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark disabled:bg-vintage-gold/50 text-vintage-black rounded-lg font-modern font-semibold transition"
                  >
                    {isCustomMusicLoading ? '...' : 'Set'}
                  </button>
                </div>

                {/* Loading indicator */}
                {isCustomMusicLoading && (
                  <div className="flex items-center gap-2 text-vintage-burnt-gold text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-vintage-gold border-t-transparent rounded-full" />
                    <span>Loading music...</span>
                  </div>
                )}

                {/* Error message */}
                {customMusicError && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                    <p className="text-sm text-red-300 font-modern">
                      {customMusicError}
                    </p>
                  </div>
                )}

                {/* Current URL info */}
                {customMusicUrl && !customMusicError && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                    <p className="text-sm text-green-300 font-modern flex items-center gap-2">
                      <span className="text-lg">{isYouTubeUrl(customMusicUrl) ? '▶' : '♫'}</span>
                      <span className="truncate">
                        {isYouTubeUrl(customMusicUrl) ? 'YouTube audio playing' : 'Audio playing'}
                      </span>
                    </p>
                  </div>
                )}

                {/* Clear button */}
                {customMusicUrl && (
                  <button
                    onClick={() => {
                      setCustomUrlInput('');
                      setCustomMusicUrl('');
                      setMusicMode('default');
                      if (address) {
                        updateCustomMusic({ address, customMusicUrl: null }).catch(console.error);
                      }
                      if (soundEnabled) AudioManager.buttonNav();
                    }}
                    className="w-full px-4 py-2 bg-vintage-black hover:bg-red-900/30 text-vintage-gold border border-vintage-gold/30 hover:border-red-500/50 rounded-lg font-modern text-sm transition"
                  >
                    Clear Custom Music
                  </button>
                )}
              </div>
            )}

            {/* Playlist UI - shown when playlist mode selected */}
            {musicMode === 'playlist' && (
              <div className="mt-4 space-y-3">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 text-xs font-modern font-semibold mb-1">
                    🎵 PLAYLIST MODE
                  </p>
                  <p className="text-vintage-burnt-gold text-xs">
                    Add multiple URLs. 1 track = loops. Multiple tracks = plays in sequence. Saved to your account.
                  </p>
                </div>

                {/* Add URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={playlistUrlInput}
                    onChange={(e) => setPlaylistUrlInput(e.target.value)}
                    placeholder="Paste audio URL or YouTube link"
                    className="flex-1 bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 focus:border-purple-500 focus:outline-none font-modern text-sm placeholder:text-vintage-burnt-gold/50"
                  />
                  <button
                    onClick={async () => {
                      if (!playlistUrlInput.trim()) return;
                      try {
                        new URL(playlistUrlInput);
                      } catch {
                        alert('Invalid URL');
                        return;
                      }
                      addToPlaylist(playlistUrlInput);
                      setPlaylistUrlInput('');
                      if (soundEnabled) AudioManager.buttonSuccess();
                      // Save to profile
                      if (address) {
                        try {
                          await updateMusicPlaylist({
                            address,
                            playlist: [...playlist, playlistUrlInput],
                            lastPlayedIndex: currentPlaylistIndex,
                          });
                        } catch (e) {
                          console.error('Failed to save playlist:', e);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-modern font-semibold transition"
                  >
                    Add
                  </button>
                </div>

                {/* Now Playing Card */}
                {playlist.length > 0 && currentTrackName && (
                  <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      {currentTrackThumbnail ? (
                        <img
                          src={currentTrackThumbnail}
                          alt="Now playing"
                          className="w-16 h-12 object-cover rounded-lg shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-purple-800/50 rounded-lg flex items-center justify-center text-2xl">
                          🎵
                        </div>
                      )}
                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-purple-300 text-xs uppercase tracking-wide">Now Playing</p>
                        <p className="text-vintage-gold font-bold text-sm truncate">{currentTrackName}</p>
                        <p className="text-vintage-ice/60 text-xs">Track {currentPlaylistIndex + 1} of {playlist.length}</p>
                      </div>
                      {/* Play/Pause */}
                      <button
                        onClick={() => {
                          if (isPaused) play();
                          else pause();
                          if (soundEnabled) AudioManager.buttonNav();
                        }}
                        className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-white text-lg shadow-lg transition-all"
                      >
                        {isPaused ? '▶' : '⏸'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Playlist tracks */}
                {playlist.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-vintage-gold text-sm font-bold">{playlist.length} track{playlist.length !== 1 ? 's' : ''}</span>
                      <div className="flex gap-2">
                        {playlist.length > 1 && (
                          <button
                            onClick={() => {
                              skipToPrevious();
                              if (soundEnabled) AudioManager.buttonNav();
                            }}
                            className="px-3 py-1 bg-vintage-black hover:bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30 rounded text-sm"
                          >
                            ◀ Prev
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (isPaused) {
                              play();
                            } else {
                              pause();
                            }
                            if (soundEnabled) AudioManager.buttonNav();
                          }}
                          className="px-3 py-1 bg-vintage-black hover:bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30 rounded text-sm"
                        >
                          {isPaused ? '▶ Play' : '⏸ Pause'}
                        </button>
                        {playlist.length > 1 && (
                          <button
                            onClick={() => {
                              skipToNext();
                              if (soundEnabled) AudioManager.buttonNav();
                            }}
                            className="px-3 py-1 bg-vintage-black hover:bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30 rounded text-sm"
                          >
                            Next ▶
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {playlist.map((url, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            idx === currentPlaylistIndex
                              ? 'bg-purple-600/30 border border-purple-500/50'
                              : 'bg-vintage-black/50 border border-transparent'
                          }`}
                        >
                          <span className="text-purple-400 text-xs font-bold w-6">
                            {idx === currentPlaylistIndex ? '▶' : `${idx + 1}.`}
                          </span>
                          <span className="flex-1 text-vintage-ice text-xs truncate">
                            {url.includes('youtube') || url.includes('youtu.be')
                              ? '🎬 YouTube'
                              : '🎵 Audio'}: {url.split('/').pop()?.substring(0, 30) || url.substring(0, 30)}
                          </span>
                          <button
                            onClick={async () => {
                              removeFromPlaylist(idx);
                              if (soundEnabled) AudioManager.buttonNav();
                              // Save to profile
                              if (address) {
                                try {
                                  const newPlaylist = playlist.filter((_, i) => i !== idx);
                                  await updateMusicPlaylist({
                                    address,
                                    playlist: newPlaylist,
                                    lastPlayedIndex: Math.min(currentPlaylistIndex, Math.max(0, newPlaylist.length - 1)),
                                  });
                                } catch (e) {
                                  console.error('Failed to save playlist:', e);
                                }
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {playlist.length === 0 && (
                  <div className="text-center py-4 text-vintage-burnt-gold/50 text-sm">
                    No tracks added yet. Add some URLs above!
                  </div>
                )}

                {/* Clear all button */}
                {playlist.length > 0 && (
                  <button
                    onClick={async () => {
                      setPlaylist([]);
                      setMusicMode('default');
                      if (soundEnabled) AudioManager.buttonNav();
                      if (address) {
                        try {
                          await updateMusicPlaylist({ address, playlist: [], lastPlayedIndex: 0 });
                        } catch (e) {
                          console.error('Failed to clear playlist:', e);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-vintage-black hover:bg-red-900/30 text-vintage-gold border border-vintage-gold/30 hover:border-red-500/50 rounded-lg font-modern text-sm transition"
                  >
                    Clear Playlist
                  </button>
                )}
              </div>
            )}
          </div>

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

          {/* VBMS Revoke Approval */}
          {walletAddress && (
            <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-red-500/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl text-red-400">🔒</span>
                  <div>
                    <p className="font-modern font-bold text-vintage-gold">VBMS APPROVAL</p>
                    <p className="text-xs text-vintage-burnt-gold">
                      Revoke PokerBattle contract access
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRevokeApproval}
                  disabled={isRevoking}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white rounded-lg text-sm font-modern font-semibold transition"
                >
                  {isRevoking ? 'Revoking...' : 'Revoke'}
                </button>
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
    </div>,
    document.body
  );
}
