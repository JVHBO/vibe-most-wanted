/**
 * Create Profile Modal Component
 *
 * Supports both Farcaster-enhanced accounts (with automatic data)
 * and standard wallet-based accounts (manual username input).
 */

import { useState } from 'react';
import { ConvexProfileService } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { logAppError } from '@/lib/log-buffer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { SupportedLanguage } from '@/lib/translations';
import { ErrorModal } from '@/components/ErrorModal';

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { value: 'id', label: 'Bahasa', flag: '🇮🇩' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
];

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | undefined;
  profileUsername: string;
  setProfileUsername: (username: string) => void;
  isCreatingProfile: boolean;
  setIsCreatingProfile: (loading: boolean) => void;
  setUserProfile: (profile: any) => void;
  setCurrentView: (view: any) => void;
  soundEnabled: boolean;
  t: (key: any) => string;
  onProfileCreated?: () => void; // Callback to trigger tutorial after profile creation
  isInFarcaster?: boolean; // Whether we're in Farcaster context
  farcasterUser?: {
    fid: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
  } | null; // Farcaster user data if available
}

export function CreateProfileModal({
  isOpen,
  onClose,
  address,
  profileUsername,
  setProfileUsername,
  isCreatingProfile,
  setIsCreatingProfile,
  setUserProfile,
  setCurrentView,
  soundEnabled,
  t,
  onProfileCreated,
  isInFarcaster,
  farcasterUser,
}: CreateProfileModalProps) {
  const { lang, setLang } = useLanguage();
  const tx = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  // 🔗 Link code state (INVERTED: non-FID generates code, FID uses it)
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const generateLinkCodeMutation = useMutation(api.profiles.generateLinkCode);

  // Generate link code for this wallet
  const handleGenerateLinkCode = async () => {
    if (!address) return;

    setIsGenerating(true);
    setLinkError(null);

    try {
      const result = await generateLinkCodeMutation({
        walletAddress: address,
      });

      setGeneratedCode(result.code);
      setCodeExpiresAt(result.expiresAt);
      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('🔗 Generated link code:', result.code);
    } catch (error: any) {
      setLinkError(error.message || 'Erro ao gerar código');
      if (soundEnabled) AudioManager.buttonError();
      devError('Failed to generate link code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate remaining time for code
  const getCodeTimeRemaining = () => {
    if (!codeExpiresAt) return null;
    const remaining = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));
    return `${remaining}s`;
  };

  // Check if link was completed (poll for profile)
  const checkLinkStatus = async () => {
    if (!address) return;
    const profile = await ConvexProfileService.getProfile(address);
    if (profile) {
      setLinkSuccess(t('walletLinkedTo') + ` @${profile.username}!`);
      if (soundEnabled) AudioManager.buttonSuccess();
      setUserProfile(profile);
      setTimeout(() => {
        onClose();
        setCurrentView('game');
      }, 1500);
    }
  };

  if (!isOpen) return null;

  const handleCreateProfile = async () => {
    if (isCreatingProfile) return;
    setCreateError(null);

    if (!address) {
      if (soundEnabled) AudioManager.buttonError();
      devError('❌ Cannot create profile: No wallet address');
      setCreateError(tx('walletNotConnected', 'Wallet not connected.'));
      return;
    }

    if (!profileUsername || profileUsername.trim() === '') {
      if (soundEnabled) AudioManager.buttonError();
      devError('❌ Cannot create profile: Username is required');
      setCreateError(tx('usernameRequired', 'Username is required.'));
      return;
    }

    setIsCreatingProfile(true);

    if (soundEnabled) AudioManager.buttonClick();

    try {
      // Check if we have Farcaster data for enhanced profile creation
      const hasFarcasterData = !!farcasterUser?.fid && farcasterUser.fid > 0;

      if (hasFarcasterData) {
        const selectedUsername = profileUsername.trim() || farcasterUser.username || `fid${farcasterUser.fid}`;
        // 🔒 SECURITY: Create profile using Farcaster data (enhanced version)
        await ConvexProfileService.createProfileFromFarcaster(
          address,
          farcasterUser.fid,
          selectedUsername,
          farcasterUser.displayName,
          farcasterUser.pfpUrl
        );

        devLog('✓ Profile created from Farcaster! FID:', farcasterUser.fid);
      } else {
        // Create standard profile using wallet address and manual username
        await ConvexProfileService.createProfile(
          address,
          profileUsername.trim()
        );

        devLog('✓ Standard profile created for address:', address);
      }

      const profile = await ConvexProfileService.getProfile(address);
      devLog('📊 Profile retrieved:', profile);

      setUserProfile(profile);
      onClose();
      setProfileUsername('');
      setCurrentView('game');

      if (soundEnabled) AudioManager.buttonSuccess();

      // Trigger tutorial for new users
      if (onProfileCreated) {
        onProfileCreated();
      }
    } catch (error: any) {
      if (soundEnabled) AudioManager.buttonError();
      devError('✗ Error creating profile:', error.code, error.message);
      logAppError(error, 'account_creation');
      const rawMessage = error?.message || '';
      const normalized = rawMessage.toLowerCase();
      // Remove Convex noise: "[Request ID: xxx] Server Error" → generic message
      const isConvexServerError = normalized.includes('server error') || normalized.includes('request id');
      let friendly = tx('createProfileGenericError', 'Could not create account. Please try again.');
      if (normalized.includes('unauthorized')) {
        friendly = tx('createProfileUnauthorized', 'Access denied. Please reconnect your wallet.');
      } else if (normalized.includes('too many requests') || normalized.includes('429')) {
        friendly = tx('createProfileRateLimit', 'Too many attempts. Wait a few seconds and try again.');
      } else if (normalized.includes('username') && normalized.includes('use')) {
        friendly = tx('createProfileUsernameTaken', 'Username already in use. Choose another one.');
      } else if (rawMessage && !isConvexServerError) {
        friendly = rawMessage;
      }
      setCreateError(friendly);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onClose();
    setProfileUsername('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[150] p-2"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold shadow-gold w-full max-w-sm p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-center mb-2 text-vintage-gold font-display">
          {t('createProfile')}
        </h2>

        {/* Always show form/actions. Farcaster message is additive only. */}
        <div className="space-y-4">
          {!!farcasterUser?.fid && farcasterUser.fid > 0 && (
            <p className="text-center text-vintage-burnt-gold mb-2 text-xs">
              Welcome, @{farcasterUser.username}!
            </p>
          )}

            {/* Form fields */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('username')}
              </label>
              <input
                type="text"
                value={profileUsername}
                onChange={(e) => {
                  setProfileUsername(e.target.value);
                  if (createError) setCreateError(null);
                }}
                className="w-full px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-gold focus:border-vintage-gold focus:outline-none"
                placeholder={tx('enterUsername', 'Choose a username')}
                maxLength={20}
              />
              {/* Username validation messages */}
              {profileUsername && (
                <div className="text-xs mt-1">
                  {profileUsername.length < 3 && (
                    <p className="text-red-400">{t('usernameTooShort')}</p>
                  )}
                  {profileUsername.length > 20 && (
                    <p className="text-red-400">{t('usernameTooLong')}</p>
                  )}
                  {!/^[a-z0-9_]+$/.test(profileUsername.toLowerCase()) && (
                    <p className="text-red-400">{t('usernameInvalidChars')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Show Farcaster enhancement info if available */}
            {!!farcasterUser?.fid && farcasterUser.fid > 0 && (
              <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
                <p className="text-xs text-center text-vintage-gold font-semibold mb-1">
                  {tx('farcasterEnhancementAvailable', 'Farcaster profile detected')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {farcasterUser.pfpUrl && (
                    <img src={farcasterUser.pfpUrl} alt="Profile" className="w-8 h-8 rounded-full border-2 border-vintage-gold" />
                  )}
                  <div>
                    <p className="text-vintage-gold font-bold truncate">
                      {farcasterUser.displayName || farcasterUser.username}
                    </p>
                    <p className="text-gray-400">
                      @{farcasterUser.username} · FID {farcasterUser.fid}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-400 mt-1 text-center">
                  {tx('profileWillIncludeFarcasterData', 'Profile will include Farcaster data')}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={handleCreateProfile}
                disabled={
                  isCreatingProfile ||
                  !address ||
                  !profileUsername ||
                  profileUsername.trim() === '' ||
                  profileUsername.length < 3 ||
                  profileUsername.length > 20 ||
                  !/^[a-z0-9_]+$/.test(profileUsername.toLowerCase())
                }
                className="w-full px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingProfile ? '...' : tx('createAccount', tx('createAccountFarcaster', 'Create account'))}
              </button>
              <ErrorModal
                error={createError}
                context="account_creation"
                onClose={() => setCreateError(null)}
                t={t as (key: any) => string}
              />

              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-semibold text-sm transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          {/* Language Selector — show all available languages */}
          <div className="grid grid-cols-5 gap-2 justify-center">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setLang(option.value); if (soundEnabled) AudioManager.buttonNav(); }}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg border-2 transition-all ${
                  lang === option.value
                    ? 'border-vintage-gold bg-vintage-gold/20 text-vintage-gold'
                    : 'border-vintage-gold/30 bg-vintage-charcoal text-gray-400 hover:border-vintage-gold/50'
                }`}
              >
                <span className="text-base leading-none">{option.flag}</span>
                <span className="text-[9px] mt-0.5 font-bold uppercase">{option.value === 'pt-BR' ? 'BR' : option.value === 'zh-CN' ? 'CN' : option.value.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
