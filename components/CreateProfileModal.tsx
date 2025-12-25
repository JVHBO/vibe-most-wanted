/**
 * Create Profile Modal Component
 *
 * 🔒 SECURITY UPDATE: Profile creation now requires Farcaster authentication
 * - Username is automatically pulled from Farcaster
 * - Users cannot create accounts without valid FID
 * - Prevents fake account farming
 */

import { ConvexProfileService } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';
import type { SupportedLanguage } from '@/lib/translations';

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
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

        {/* 🔒 Show Farcaster requirement message */}
        {!hasFarcaster ? (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-center text-red-400 text-sm font-semibold">
              🔒 Farcaster Required
            </p>
            <p className="text-center text-red-300 text-xs mt-2">
              Account creation requires Farcaster authentication.
            </p>
            <a
              href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-center rounded-lg font-semibold text-sm transition-all"
            >
              📱 Open in Farcaster Miniapp
            </a>
          </div>
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
                ✓ Your profile will be created with this Farcaster account
              </p>
            </div>
          ) : (
            <div className="text-center py-2">
              <a
                href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm underline"
              >
                Open in Farcaster Miniapp →
              </a>
            </div>
          )}

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
