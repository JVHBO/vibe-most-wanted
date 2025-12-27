/**
 * Create Profile Modal Component
 *
 * 🔒 SECURITY UPDATE: Profile creation now requires Farcaster authentication
 * - Username is automatically pulled from Farcaster
 * - Users cannot create accounts without valid FID
 * - Prevents fake account farming
 */

import { useState } from 'react';
import { ConvexProfileService } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { SupportedLanguage } from '@/lib/translations';

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { value: 'id', label: 'Bahasa', flag: '🇮🇩' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
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
}: CreateProfileModalProps) {
  const { lang, setLang } = useLanguage();

  // 🔒 Get Farcaster context for automatic profile data
  const farcasterContext = useFarcasterContext();
  const farcasterUser = farcasterContext.user;
  const hasFarcaster = !!farcasterUser?.fid;

  // 🔗 Link code state (INVERTED: non-FID generates code, FID uses it)
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

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

  // 🔒 Use Farcaster username if available
  const displayUsername = hasFarcaster
    ? farcasterUser.username
    : profileUsername;

  const handleCreateProfile = async () => {
    if (isCreatingProfile) return;

    // 🔒 SECURITY: Require Farcaster for new accounts
    if (!hasFarcaster) {
      if (soundEnabled) AudioManager.buttonError();
      devError('❌ Cannot create profile: No Farcaster context');
      return;
    }

    if (!address) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setIsCreatingProfile(true);

    if (soundEnabled) AudioManager.buttonClick();

    try {
      // 🔒 SECURITY: Create profile using Farcaster data
      await ConvexProfileService.createProfileFromFarcaster(
        address,
        farcasterUser.fid,
        farcasterUser.username || `fid${farcasterUser.fid}`,
        farcasterUser.displayName,
        farcasterUser.pfpUrl
      );

      devLog('✓ Profile created from Farcaster! FID:', farcasterUser.fid);

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
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold shadow-gold border-vintage-gold max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-center mb-2 text-vintage-gold font-display">
          {t('createProfile')}
        </h2>

        {/* 🔒 Show Farcaster requirement OR link code option */}
        {!hasFarcaster ? (
          showLinkCode ? (
            /* 🔗 Link Code Display (INVERTED: non-FID generates code) */
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
              <p className="text-center text-blue-400 text-sm font-semibold mb-3">
                🔗 {t('linkToExisting')}
              </p>

              {/* Success state */}
              {linkSuccess ? (
                <div className="text-center">
                  <p className="text-green-400 text-sm">{linkSuccess}</p>
                </div>
              ) : generatedCode ? (
                /* Show generated code */
                <div>
                  <p className="text-center text-blue-300 text-xs mb-3">
                    {t('enterCodeInFarcaster')}
                  </p>
                  <p className="text-4xl font-mono font-bold text-center text-vintage-gold tracking-[0.3em] my-4">
                    {generatedCode}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs text-center mb-3">
                    {t('codeValidFor')}: {getCodeTimeRemaining() || '...'}
                  </p>

                  {/* Error */}
                  {linkError && (
                    <p className="text-red-400 text-xs text-center mt-2">{linkError}</p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowLinkCode(false);
                        setGeneratedCode(null);
                        setCodeExpiresAt(null);
                        setLinkError(null);
                      }}
                      className="flex-1 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-sm"
                    >
                      {t('back')}
                    </button>
                    <button
                      onClick={checkLinkStatus}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm"
                    >
                      {t('verifyLink')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Generate code button */
                <div>
                  <p className="text-center text-blue-300 text-xs mb-4">
                    {t('generateCodeToLink')}
                  </p>
                  <button
                    onClick={handleGenerateLinkCode}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      '🔗'
                    )}
                    {t('generateCode')}
                  </button>
                  {linkError && (
                    <p className="text-red-400 text-xs text-center mt-2">{linkError}</p>
                  )}
                  <button
                    onClick={() => {
                      setShowLinkCode(false);
                      setLinkError(null);
                    }}
                    className="w-full mt-2 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-sm"
                  >
                    {t('back')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 🔒 No Farcaster - Show options */
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-center text-red-400 text-sm font-semibold">
                🔒 Farcaster Required
              </p>
              <p className="text-center text-red-300 text-xs mt-2 mb-4">
                {t('createOrLink')}
              </p>

              {/* Option 1: Open Farcaster */}
              <a
                href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white text-center rounded-lg font-semibold text-sm transition-all mb-2"
              >
                📱 {t('createAccountFarcaster')}
              </a>

              {/* Option 2: Link to existing (INVERTED: generate code here) */}
              <button
                onClick={() => {
                  setShowLinkCode(true);
                  if (soundEnabled) AudioManager.buttonNav();
                }}
                className="block w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 text-center rounded-lg font-semibold text-sm transition-all"
              >
                🔗 {t('linkExistingAccount')}
              </button>

              <p className="text-vintage-burnt-gold/60 text-xs text-center mt-3">
                {t('linkExistingAccountDesc')}
              </p>
            </div>
          )
        ) : (
          <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
            Welcome, @{farcasterUser.username}!
          </p>
        )}

        <div className="space-y-4">
          {/* 🔒 Show Farcaster profile instead of input */}
          {hasFarcaster ? (
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-xl p-4">
              <div className="flex items-center gap-4">
                {farcasterUser.pfpUrl && (
                  <img
                    src={farcasterUser.pfpUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full border-2 border-vintage-gold"
                  />
                )}
                <div>
                  <p className="text-vintage-gold font-bold text-lg">
                    {farcasterUser.displayName || farcasterUser.username}
                  </p>
                  <p className="text-gray-400 text-sm">@{farcasterUser.username}</p>
                  <p className="text-gray-500 text-xs">FID: {farcasterUser.fid}</p>
                </div>
              </div>
              <p className="text-xs text-green-400 mt-3 text-center">
                {t('profileFarcasterAccount')}
              </p>
            </div>
          ) : null}

          {/* Language Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              {t('language')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLang(option.value);
                    if (soundEnabled) AudioManager.buttonNav();
                  }}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                    ${lang === option.value
                      ? 'border-vintage-gold bg-vintage-gold/20 text-vintage-gold'
                      : 'border-vintage-gold/30 bg-vintage-charcoal text-gray-400 hover:border-vintage-gold/50 hover:text-gray-300'
                    }
                  `}
                >
                  <span className="text-xl mb-1">{option.flag}</span>
                  <span className="text-xs font-modern">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile || !hasFarcaster}
            className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark shadow-gold text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingProfile ? '... Creating' : hasFarcaster ? t('save') : '🔒 Farcaster Required'}
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-semibold transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
