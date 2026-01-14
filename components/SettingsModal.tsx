/**
 * Settings Modal Component
 *
 * Modal for user settings including music, language, username, and Twitter connection
 */

import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';

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
  // Disconnect wallet
  disconnectWallet?: () => void;
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
  disconnectWallet,
}: SettingsModalProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [customUrlInput, setCustomUrlInput] = useState(customMusicUrl || '');
  const [playlistUrlInput, setPlaylistUrlInput] = useState('');
  const updateCustomMusic = useMutation(api.profiles.updateCustomMusic);
  const updateMusicPlaylist = useMutation(api.profiles.updateMusicPlaylist);
  const linkWalletMutation = useMutation(api.profiles.linkWallet);

  // 🔗 MULTI-WALLET: Link wallet state
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [linkingFromAddress, setLinkingFromAddress] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const previousAddressRef = useRef<string | null>(null);

  // 🔗 LINK CODE: FID users enter codes to link wallets (INVERTED FLOW)
  const farcasterContext = useFarcasterContext();
  // Check both: Farcaster SDK context (in miniapp) OR userProfile.farcasterFid (on website)
  const hasFarcaster = !!farcasterContext.user?.fid || !!userProfile?.farcasterFid;
  const [unifiedCodeInput, setUnifiedCodeInput] = useState('');
  const [isProcessingCode, setIsProcessingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);
  const useUnifiedCodeMutation = useMutation(api.profiles.useUnifiedCode);
  const unlinkWalletMutation = useMutation(api.profiles.unlinkWallet);

  // Legacy mutations (kept for backwards compatibility but unified handles both)
  const useLinkCodeMutation = useMutation(api.profiles.useLinkCode);
  const useMergeCodeMutation = useMutation(api.profiles.useMergeCode);

  // Legacy state (for backwards compat in some UI parts)
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [isLinkingByCode, setIsLinkingByCode] = useState(false);
  const [linkCodeError, setLinkCodeError] = useState<string | null>(null);
  const [linkCodeSuccess, setLinkCodeSuccess] = useState<string | null>(null);

  // 🔀 MERGE ACCOUNT: Old accounts (no FID) can merge into FID accounts
  const [showMergeCode, setShowMergeCode] = useState(false);
  const [showMergeWarning, setShowMergeWarning] = useState(false); // Warning modal before generating code
  const [generatedMergeCode, setGeneratedMergeCode] = useState<string | null>(null);
  const [mergeCodeExpiresAt, setMergeCodeExpiresAt] = useState<number | null>(null);
  const [isGeneratingMerge, setIsGeneratingMerge] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeCodeInput, setMergeCodeInput] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const generateMergeCodeMutation = useMutation(api.profiles.generateMergeCode);

  // 🔗 FID CODE: Generate code for FID accounts
  const [generatedFidCode, setGeneratedFidCode] = useState<string | null>(null);
  const [fidCodeExpiresAt, setFidCodeExpiresAt] = useState<number | null>(null);
  const [isGeneratingFidCode, setIsGeneratingFidCode] = useState(false);
  const [fidCodeError, setFidCodeError] = useState<string | null>(null);
  const generateFidLinkCodeMutation = useMutation(api.profiles.generateFidLinkCode);

  // 🔗 MULTI-WALLET: Detect wallet change and auto-link
  useEffect(() => {
    // If we're in linking mode and wallet changed to a different address
    if (linkingFromAddress && walletAddress && isConnected) {
      const newAddr = walletAddress.toLowerCase();
      const oldAddr = linkingFromAddress.toLowerCase();

      if (newAddr !== oldAddr && farcasterContext.user?.fid) {
        // Auto-link the new wallet
        devLog('🔗 Auto-linking wallet:', newAddr, 'to profile:', oldAddr);
        linkWalletMutation({
          primaryAddress: oldAddr,
          newAddress: newAddr,
          fid: farcasterContext.user.fid,
        })
          .then(() => {
            setLinkSuccess(true);
            setLinkError(null);
            setIsLinkingWallet(false);
            setLinkingFromAddress(null);
            if (soundEnabled) AudioManager.buttonSuccess();
          })
          .catch((err) => {
            devError('Failed to link wallet:', err);
            setLinkError(err.message || 'Erro ao linkar wallet');
            setLinkSuccess(false);
            if (soundEnabled) AudioManager.buttonError();
          });
      }
    }
  }, [walletAddress, isConnected, linkingFromAddress, linkWalletMutation, soundEnabled, farcasterContext.user?.fid]);

  // Start linking process
  const handleStartLinking = () => {
    if (!walletAddress) return;
    if (soundEnabled) AudioManager.buttonClick();

    // Store current address before disconnecting
    const primaryAddr = linkedAddresses?.primary || walletAddress;
    setLinkingFromAddress(primaryAddr.toLowerCase());
    setIsLinkingWallet(true);
    setLinkSuccess(false);
    setLinkError(null);

    // Disconnect to allow connecting new wallet
    disconnect();
  };

  // Cancel linking
  const handleCancelLinking = () => {
    setIsLinkingWallet(false);
    setLinkingFromAddress(null);
    setLinkError(null);
  };

  // 🔗 UNIFIED: Use any code (link or merge) - auto-detects
  const handleUseUnifiedCode = async () => {
    if (!walletAddress || isProcessingCode || unifiedCodeInput.length !== 6) return;

    setIsProcessingCode(true);
    setCodeError(null);
    setCodeSuccess(null);

    try {
      const result = await useUnifiedCodeMutation({
        code: unifiedCodeInput,
        fidOwnerAddress: walletAddress,
      });

      // Show appropriate success message based on operation type
      if (result.type === 'merge') {
        setCodeSuccess(`🔀 ${result.message}`);
      } else if (result.type === 'link') {
        setCodeSuccess(`🔗 ${result.message}`);
      } else {
        setCodeSuccess(result.message);
      }

      setUnifiedCodeInput('');
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('✅ Code processed:', result.type, result);
    } catch (error: any) {
      setCodeError(error.message || 'Erro ao processar código');
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to process code:', error);
    } finally {
      setIsProcessingCode(false);
    }
  };

  // 🔗 Use link code to add a wallet (INVERTED FLOW) - LEGACY, kept for backwards compat
  const handleUseLinkCode = async () => {
    if (!walletAddress || isLinkingByCode || linkCodeInput.length !== 6) return;

    setIsLinkingByCode(true);
    setLinkCodeError(null);

    try {
      const result = await useLinkCodeMutation({
        code: linkCodeInput,
        fidOwnerAddress: walletAddress,
      });
      setLinkCodeSuccess(result.message);
      setLinkCodeInput('');
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('🔗 Linked wallet via code:', result.linkedWallet);
    } catch (error: any) {
      setLinkCodeError(error.message || 'Erro ao linkar wallet');
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to use link code:', error);
    } finally {
      setIsLinkingByCode(false);
    }
  };

  // Handle unlink wallet
  const handleUnlinkWallet = async (addressToUnlink: string) => {
    if (!walletAddress) return;

    const confirmed = confirm(t('unlinkConfirm'));
    if (!confirmed) return;

    try {
      const primaryAddr = linkedAddresses?.primary || walletAddress;
      await unlinkWalletMutation({
        primaryAddress: primaryAddr,
        addressToUnlink: addressToUnlink,
      });
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('🔗 Unlinked wallet:', addressToUnlink);
    } catch (error: any) {
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to unlink wallet:', error);
      alert(error.message || 'Erro ao deslinkar wallet');
    }
  };

  // 🔀 Generate merge code (for old accounts without FID)
  const handleGenerateMergeCode = async () => {
    if (!walletAddress) return;

    setIsGeneratingMerge(true);
    setMergeError(null);

    try {
      const result = await generateMergeCodeMutation({
        walletAddress: walletAddress,
      });
      setGeneratedMergeCode(result.code);
      setMergeCodeExpiresAt(result.expiresAt);
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('🔀 Generated merge code:', result.code);
    } catch (error: any) {
      setMergeError(error.message || 'Erro ao gerar código');
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to generate merge code:', error);
    } finally {
      setIsGeneratingMerge(false);
    }
  };

  // 🔀 Use merge code (for FID accounts to absorb old accounts)
  const handleUseMergeCode = async () => {
    if (!walletAddress || isMerging || mergeCodeInput.length !== 6) return;

    setIsMerging(true);
    setMergeError(null);

    try {
      const result = await useMergeCodeMutation({
        code: mergeCodeInput,
        fidOwnerAddress: walletAddress,
      });
      setMergeSuccess(result.message);
      setMergeCodeInput('');
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('🔀 Merged account:', result.mergedUsername);
    } catch (error: any) {
      setMergeError(error.message || 'Erro ao mergear conta');
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to merge account:', error);
    } finally {
      setIsMerging(false);
    }
  };

  // 🔗 Generate FID link code
  const handleGenerateFidCode = async () => {
    if (!walletAddress) return;

    setIsGeneratingFidCode(true);
    setFidCodeError(null);

    try {
      const result = await generateFidLinkCodeMutation({
        fidOwnerAddress: walletAddress,
      });
      setGeneratedFidCode(result.code);
      setFidCodeExpiresAt(result.expiresAt);
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (error: any) {
      setFidCodeError(error.message || 'Erro ao gerar código');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsGeneratingFidCode(false);
    }
  };

  // Get FID code time remaining
  const getFidCodeTimeRemaining = () => {
    if (!fidCodeExpiresAt) return null;
    const remaining = Math.max(0, Math.floor((fidCodeExpiresAt - Date.now()) / 1000));
    return `${remaining}s`;
  };

  // Get merge code time remaining
  const getMergeCodeTimeRemaining = () => {
    if (!mergeCodeExpiresAt) return null;
    const remaining = Math.max(0, Math.floor((mergeCodeExpiresAt - Date.now()) / 1000));
    return `${remaining}s`;
  };

  // 🔗 MULTI-WALLET: Get linked addresses
  const linkedAddresses = useQuery(
    api.profiles.getLinkedAddresses,
    walletAddress ? { address: walletAddress } : "skip"
  );

  // Handle show link wallet instructions
  const handleShowLinkInstructions = () => {
    if (soundEnabled) AudioManager.buttonClick();
    setIsLinkingWallet(true);
  };

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
                  <p className="font-modern font-bold text-vintage-gold">{t('settingsMusic')}</p>
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
                  <span className="text-sm text-vintage-burnt-gold font-modern">{t('settingsVolume')}</span>
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
                  <span>{t('musicDesktopWarning')}</span>
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
                🇺🇸 English
              </option>
              <option value="pt-BR" className="bg-vintage-charcoal text-vintage-ice">
                🇧🇷 Português
              </option>
              <option value="es" className="bg-vintage-charcoal text-vintage-ice">
                🇪🇸 Español
              </option>
              <option value="hi" className="bg-vintage-charcoal text-vintage-ice">
                🇮🇳 हिन्दी
              </option>
              <option value="ru" className="bg-vintage-charcoal text-vintage-ice">
                🇷🇺 Русский
              </option>
              <option value="zh-CN" className="bg-vintage-charcoal text-vintage-ice">
                🇨🇳 简体中文
              </option>
              <option value="id" className="bg-vintage-charcoal text-vintage-ice">
                🇮🇩 Bahasa
              </option>
              <option value="fr" className="bg-vintage-charcoal text-vintage-ice">
                🇫🇷 Français
              </option>
              <option value="ja" className="bg-vintage-charcoal text-vintage-ice">
                🇯🇵 日本語
              </option>
              <option value="it" className="bg-vintage-charcoal text-vintage-ice">
                🇮🇹 Italiano
              </option>
            </select>
            {/* 🇨🇳 Chinese Language Boost Warning */}
            {lang === 'zh-CN' && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-300 font-modern font-semibold flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <span>{t('chineseBoostMessage')}</span>
                </p>
              </div>
            )}
          </div>

          {/* Music Mode Selector */}
          <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl sm:text-3xl text-vintage-gold">♫</span>
              <p className="font-modern font-bold text-vintage-gold">{t('settingsBackgroundMusic')}</p>
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
                {t('musicModeDefault')}
              </option>
              <option value="language" className="bg-vintage-charcoal text-vintage-ice">
                {t('musicModeLanguage')}
              </option>
              <option value="custom" className="bg-vintage-charcoal text-vintage-ice">
                {t('musicModeCustom')}
              </option>
              <option value="playlist" className="bg-vintage-charcoal text-vintage-ice">
                {t('musicModePlaylist')}
              </option>
            </select>
            <p className="text-xs text-vintage-burnt-gold mt-2 font-modern">
              {musicMode === 'default'
                ? t('musicDescDefault')
                : musicMode === 'language'
                ? t('musicDescLanguage')
                : musicMode === 'playlist'
                ? `${t('playlistNowPlaying')}: ${currentTrackName || `Track ${currentPlaylistIndex + 1}`} (${currentPlaylistIndex + 1}/${playlist.length})`
                : t('musicDescCustom')}
            </p>

            {/* Custom URL Input - shown when custom mode selected */}
            {musicMode === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
                  <p className="text-vintage-gold text-xs font-modern font-semibold mb-1">
                    {t('musicSupportedFormats')}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs">
                    {t('musicFormatsDesc')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder={t('musicUrlPlaceholder')}
                    className="flex-1 bg-vintage-black text-vintage-gold px-4 py-3 rounded-lg border border-vintage-gold/50 focus:border-vintage-gold focus:outline-none font-modern text-sm placeholder:text-vintage-burnt-gold/50"
                  />
                  <button
                    onClick={handleSaveCustomMusic}
                    disabled={isCustomMusicLoading}
                    className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark disabled:bg-vintage-gold/50 text-vintage-black rounded-lg font-modern font-semibold transition"
                  >
                    {isCustomMusicLoading ? '...' : t('musicSetButton')}
                  </button>
                </div>

                {/* Loading indicator */}
                {isCustomMusicLoading && (
                  <div className="flex items-center gap-2 text-vintage-burnt-gold text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-vintage-gold border-t-transparent rounded-full" />
                    <span>{t('musicLoading')}</span>
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
                        {isYouTubeUrl(customMusicUrl) ? t('musicYouTubePlaying') : t('musicAudioPlaying')}
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
                    {t('musicClearCustom')}
                  </button>
                )}
              </div>
            )}

            {/* Playlist UI - shown when playlist mode selected */}
            {musicMode === 'playlist' && (
              <div className="mt-4 space-y-3">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 text-xs font-modern font-semibold mb-1">
                    {t('playlistMode')}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs">
                    {t('playlistModeDesc')}
                  </p>
                </div>

                {/* Add URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={playlistUrlInput}
                    onChange={(e) => setPlaylistUrlInput(e.target.value)}
                    placeholder={t('playlistUrlPlaceholder')}
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
                    {t('playlistAddButton')}
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
                          alt={t('playlistNowPlaying')}
                          className="w-16 h-12 object-cover rounded-lg shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-purple-800/50 rounded-lg flex items-center justify-center text-2xl">
                          🎵
                        </div>
                      )}
                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-purple-300 text-xs uppercase tracking-wide">{t('playlistNowPlaying')}</p>
                        <p className="text-vintage-gold font-bold text-sm truncate">{currentTrackName}</p>
                        <p className="text-vintage-ice/60 text-xs">{t('playlistTrackOf').replace('{current}', String(currentPlaylistIndex + 1)).replace('{total}', String(playlist.length))}</p>
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
                      <span className="text-vintage-gold text-sm font-bold">{playlist.length} {t('playlistTracks')}</span>
                      <div className="flex gap-2">
                        {playlist.length > 1 && (
                          <button
                            onClick={() => {
                              skipToPrevious();
                              if (soundEnabled) AudioManager.buttonNav();
                            }}
                            className="px-3 py-1 bg-vintage-black hover:bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30 rounded text-sm"
                          >
                            {t('playlistPrev')}
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
                          {isPaused ? t('playlistPlay') : t('playlistPause')}
                        </button>
                        {playlist.length > 1 && (
                          <button
                            onClick={() => {
                              skipToNext();
                              if (soundEnabled) AudioManager.buttonNav();
                            }}
                            className="px-3 py-1 bg-vintage-black hover:bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30 rounded text-sm"
                          >
                            {t('playlistNext')}
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
                              ? t('playlistYouTube')
                              : t('playlistAudio')}: {url.split('/').pop()?.substring(0, 30) || url.substring(0, 30)}
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
                    {t('playlistEmpty')}
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
                    {t('playlistClear')}
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
                    <p className="font-modern font-bold text-vintage-gold">{t('settingsTwitter')}</p>
                    <p className="text-xs text-vintage-burnt-gold">
                      {userProfile.twitter ? `@${userProfile.twitter}` : t('settingsNotConnected')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTwitterConnect}
                  className="px-4 py-2 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-lg text-sm font-modern font-semibold transition flex items-center gap-2"
                >
                  <span>𝕏</span> {userProfile.twitter ? t('settingsReconnect') : t('settingsConnectTwitter')}
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

          {/* 🔗 Linked Wallets Section - Always show if wallet connected */}
          {walletAddress && (
            <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
              <div className="flex items-center gap-3 mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-vintage-gold">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="font-modern font-bold text-vintage-gold">{t('linkedWallets')}</p>
                  <p className="text-xs text-vintage-burnt-gold">
                    {t('linkedWalletsDesc')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Primary wallet */}
                {linkedAddresses?.primary ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">●</span>
                    <span className="text-vintage-gold font-mono">
                      {linkedAddresses.primary.slice(0, 6)}...{linkedAddresses.primary.slice(-4)}
                    </span>
                    <span className="text-xs text-vintage-burnt-gold">{t('linkedWalletPrimary')}</span>
                    {walletAddress?.toLowerCase() === linkedAddresses.primary && (
                      <span className="text-xs bg-vintage-gold/20 text-vintage-gold px-2 py-0.5 rounded">{t('linkedWalletCurrent')}</span>
                    )}
                  </div>
                ) : (
                  /* Show current wallet if no profile yet */
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">●</span>
                    <span className="text-vintage-gold font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                    <span className="text-xs bg-vintage-gold/20 text-vintage-gold px-2 py-0.5 rounded">{t('linkedWalletCurrent')}</span>
                  </div>
                )}

                {/* Linked wallets */}
                {linkedAddresses?.linked?.map((addr: string, i: number) => (
                  <div key={addr} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400">●</span>
                    <span className="text-vintage-gold font-mono">
                      {addr.slice(0, 6)}...{addr.slice(-4)}
                    </span>
                    <span className="text-xs text-vintage-burnt-gold">{t('linkedWalletLinked')}</span>
                    {walletAddress?.toLowerCase() === addr && (
                      <span className="text-xs bg-vintage-gold/20 text-vintage-gold px-2 py-0.5 rounded">{t('linkedWalletCurrent')}</span>
                    )}
                    {/* Unlink button - only show for FID owners */}
                    {hasFarcaster && (
                      <button
                        onClick={() => handleUnlinkWallet(addr)}
                        className="ml-auto text-red-400 hover:text-red-300 text-xs px-2 py-0.5 border border-red-400/30 rounded hover:border-red-400/50 transition"
                      >
                        {t('unlinkWallet')}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 🔗 UNIFIED: Enter Code to Link/Merge (Only for Farcaster users) */}
              {hasFarcaster && (
                <div className="mt-3 pt-3 border-t border-vintage-gold/20">
                  <p className="text-vintage-burnt-gold text-xs mb-3">
                    {t('enterCodeToLinkOrMerge') || 'Enter 6-digit code to link wallet or merge account'}
                  </p>

                  {/* Unified Code Input */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={unifiedCodeInput}
                      onChange={(e) => {
                        setUnifiedCodeInput(e.target.value.replace(/\D/g, ''));
                        setCodeError(null);
                        setCodeSuccess(null);
                      }}
                      placeholder="000000"
                      className="w-full sm:flex-1 text-center text-2xl font-mono tracking-[0.3em] bg-vintage-black border-2 border-vintage-gold/30 rounded-lg py-2 text-vintage-gold placeholder:text-vintage-gold/30 focus:border-vintage-gold focus:outline-none"
                    />
                    <button
                      onClick={handleUseUnifiedCode}
                      disabled={isProcessingCode || unifiedCodeInput.length !== 6}
                      className="w-full sm:w-auto px-4 py-2 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isProcessingCode ? '...' : (t('useCodeButton') || 'Use Code')}
                    </button>
                  </div>

                  {/* Error */}
                  {codeError && (
                    <p className="text-red-400 text-xs text-center mt-2">{codeError}</p>
                  )}

                  {/* Success */}
                  {codeSuccess && (
                    <p className="text-green-400 text-xs text-center mt-2">{codeSuccess}</p>
                  )}

                  {/* 🔗 Generate Code Section */}
                  <div className="mt-4 pt-4 border-t border-vintage-gold/20">
                    <p className="text-vintage-burnt-gold text-xs mb-3">
                      {t('generateCodeDesc') || 'Generate a code to link wallet from another device'}
                    </p>

                    {generatedFidCode ? (
                      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                        <p className="text-center text-green-300 text-xs mb-2">
                          {t('enterCodeOnOtherDevice') || 'Enter this code on your other device:'}
                        </p>
                        <p className="text-3xl font-mono font-bold text-center text-green-400 tracking-[0.3em] my-3">
                          {generatedFidCode}
                        </p>
                        <p className="text-vintage-burnt-gold text-xs text-center">
                          {t('expiresIn') || 'Expires in'} {getFidCodeTimeRemaining() || '...'}
                        </p>
                        <button
                          onClick={handleGenerateFidCode}
                          disabled={isGeneratingFidCode}
                          className="w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                        >
                          {isGeneratingFidCode ? '...' : (t('generateNewCode') || 'Generate New Code')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateFidCode}
                        disabled={isGeneratingFidCode}
                        className="w-full px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingFidCode ? (
                          <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full" />
                        ) : (
                          '🔗'
                        )}
                        {t('generateLinkCode') || 'Generate Link Code'}
                      </button>
                    )}

                    {fidCodeError && (
                      <p className="text-red-400 text-xs text-center mt-2">{fidCodeError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🔀 MERGE ACCOUNT - For OLD accounts (no FID) to generate merge code */}
          {userProfile && !hasFarcaster && walletAddress && (
            <div className="bg-orange-900/30 border border-orange-500/50 p-3 sm:p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔀</span>
                <p className="font-modern font-bold text-orange-400">{t('mergeAccountTitle')}</p>
              </div>
              <p className="text-orange-300 text-xs mb-4">
                {t('mergeAccountNoFidDesc')}
              </p>

              {showMergeCode ? (
                generatedMergeCode ? (
                  <div>
                    <p className="text-center text-orange-300 text-xs mb-3">
                      {t('mergeEnterCodePrompt')}
                    </p>
                    <p className="text-4xl font-mono font-bold text-center text-orange-400 tracking-[0.3em] my-4">
                      {generatedMergeCode}
                    </p>
                    <p className="text-vintage-burnt-gold text-xs text-center mb-3">
                      {t('mergeExpiresIn')} {getMergeCodeTimeRemaining() || '...'}
                    </p>
                    <p className="text-red-400 text-xs text-center mb-3">
                      {t('mergeWarning')}
                    </p>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setShowMergeCode(false);
                          setGeneratedMergeCode(null);
                          setMergeCodeExpiresAt(null);
                          setMergeError(null);
                        }}
                        className="flex-1 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-sm"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={handleGenerateMergeCode}
                        className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm"
                      >
                        {t('mergeNewCode')}
                      </button>
                    </div>
                  </div>
                ) : showMergeWarning ? (
                  // 🔔 MERGE WARNING MODAL - Shows what will be lost/kept
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-red-400 mb-3">{t('mergeWarningTitle')}</h3>

                    <div className="mb-3">
                      <p className="text-red-300 font-semibold text-sm mb-2">{t('mergeWhatYouLose')}</p>
                      <ul className="text-xs text-red-200 space-y-1 ml-2">
                        <li>{t('mergeCoinsLose')}</li>
                        <li>{t('mergeAchievementsLose')}</li>
                        <li>{t('mergeMissionsLose')}</li>
                      </ul>
                    </div>

                    <div className="mb-3">
                      <p className="text-green-300 font-semibold text-sm mb-2">{t('mergeWhatYouKeep')}</p>
                      <ul className="text-xs text-green-200 space-y-1 ml-2">
                        <li>{t('mergeCardsKeep')}</li>
                        <li>{t('mergeVbmsNote')}</li>
                        <li>{t('mergeWalletLink')}</li>
                      </ul>
                    </div>

                    <p className="text-yellow-400 text-xs mb-4">{t('mergeAccountDeletedAfter')}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowMergeWarning(false);
                          handleGenerateMergeCode();
                        }}
                        disabled={isGeneratingMerge}
                        className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                      >
                        {isGeneratingMerge ? '...' : t('mergeConfirmGenerate')}
                      </button>
                      <button
                        onClick={() => {
                          setShowMergeWarning(false);
                          setShowMergeCode(false);
                        }}
                        className="px-4 py-3 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-sm"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setShowMergeWarning(true)}
                      disabled={isGeneratingMerge}
                      className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingMerge ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        '🔀'
                      )}
                      {t('mergeGenerateCode')}
                    </button>
                    {mergeError && (
                      <p className="text-red-400 text-xs text-center mt-2">{mergeError}</p>
                    )}
                    <button
                      onClick={() => {
                        setShowMergeCode(false);
                        setMergeError(null);
                      }}
                      className="w-full mt-2 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-sm"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={() => {
                    setShowMergeCode(true);
                    if (soundEnabled) AudioManager.buttonNav();
                  }}
                  className="w-full px-4 py-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/50 text-orange-400 rounded-lg font-semibold text-sm transition-all"
                >
                  {t('mergeWantToMerge')}
                </button>
              )}
            </div>
          )}

          {/* Disconnect Wallet */}
          {walletAddress && disconnectWallet && (
            <div className="bg-vintage-black/50 p-3 sm:p-5 rounded-xl border border-vintage-gold/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-vintage-gold">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M16 17l5-5-5-5M21 12H9" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <p className="font-modern font-bold text-vintage-gold">{t('disconnect')}</p>
                    <p className="text-xs text-vintage-burnt-gold">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (soundEnabled) AudioManager.buttonClick();
                    disconnectWallet();
                    onClose();
                  }}
                  className="px-4 py-2 bg-vintage-charcoal hover:bg-red-900/50 text-vintage-gold hover:text-red-400 border border-vintage-gold/50 hover:border-red-500/50 rounded-lg text-sm font-modern font-semibold transition"
                >
                  {t('disconnect')}
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
