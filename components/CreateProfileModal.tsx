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
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-2"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold shadow-gold w-full max-w-sm p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-center mb-2 text-vintage-gold font-display">
          {t('createProfile')}
        </h2>

        {/* 🔒 Show Farcaster requirement OR link code option */}
        {!hasFarcaster ? (
          showLinkCode ? (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-2">
              <p className="text-center text-blue-400 text-xs font-semibold mb-2">
                🔗 {t('linkToExisting')}
              </p>
              {linkSuccess ? (
                <p className="text-green-400 text-xs text-center">{linkSuccess}</p>
              ) : generatedCode ? (
                <div>
                  <p className="text-center text-blue-300 text-xs mb-1">{t('enterCodeInFarcaster')}</p>
                  <p className="text-3xl font-mono font-bold text-center text-vintage-gold tracking-[0.3em] my-2">
                    {generatedCode}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs text-center mb-2">
                    {t('codeValidFor')}: {getCodeTimeRemaining() || '...'}
                  </p>
                  {linkError && <p className="text-red-400 text-xs text-center">{linkError}</p>}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setShowLinkCode(false); setGeneratedCode(null); setCodeExpiresAt(null); setLinkError(null); }}
                      className="flex-1 px-3 py-1.5 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-xs"
                    >{t('back')}</button>
                    <button
                      onClick={checkLinkStatus}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-xs"
                    >{t('verifyLink')}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-center text-blue-300 text-xs mb-2">{t('generateCodeToLink')}</p>
                  <button
                    onClick={handleGenerateLinkCode}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : '🔗'}
                    {t('generateCode')}
                  </button>
                  {linkError && <p className="text-red-400 text-xs text-center mt-1">{linkError}</p>}
                  <button
                    onClick={() => { setShowLinkCode(false); setLinkError(null); }}
                    className="w-full mt-1.5 px-3 py-1.5 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-burnt-gold rounded-lg text-xs"
                  >{t('back')}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-2">
              <p className="text-center text-red-400 text-xs font-semibold">🔒 Farcaster Required</p>
              <p className="text-center text-red-300 text-xs mt-1 mb-3">{t('createOrLink')}</p>
              <a
                href="https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-center rounded-lg font-semibold text-xs transition-all mb-1.5"
              >
                📱 {t('createAccountFarcaster')}
              </a>
              <button
                onClick={() => { setShowLinkCode(true); if (soundEnabled) AudioManager.buttonNav(); }}
                className="block w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 text-center rounded-lg font-semibold text-xs transition-all"
              >
                🔗 {t('linkExistingAccount')}
              </button>
              <p className="text-vintage-burnt-gold/60 text-xs text-center mt-2">{t('linkExistingAccountDesc')}</p>
            </div>
          )
        ) : (
          <p className="text-center text-vintage-burnt-gold mb-2 text-xs">
            Welcome, @{farcasterUser.username}!
          </p>
        )}

        <div className="space-y-2">
          {hasFarcaster ? (
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-2">
              <div className="flex items-center gap-2">
                {farcasterUser.pfpUrl && (
                  <img src={farcasterUser.pfpUrl} alt="Profile" className="w-10 h-10 rounded-full border-2 border-vintage-gold flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-vintage-gold font-bold text-sm truncate">{farcasterUser.displayName || farcasterUser.username}</p>
                  <p className="text-gray-400 text-xs">@{farcasterUser.username} · FID {farcasterUser.fid}</p>
                </div>
              </div>
              <p className="text-xs text-green-400 mt-1.5 text-center">{t('profileFarcasterAccount')}</p>
            </div>
          ) : null}

          {/* Language Selector — 5 cols, flag + short code only */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">{t('language')}</label>
            <div className="grid grid-cols-5 gap-1">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setLang(option.value); if (soundEnabled) AudioManager.buttonNav(); }}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-lg border-2 transition-all ${
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

          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile || !hasFarcaster}
            className="w-full px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingProfile ? '...' : hasFarcaster ? t('save') : '🔒 Farcaster Required'}
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-semibold text-sm transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
