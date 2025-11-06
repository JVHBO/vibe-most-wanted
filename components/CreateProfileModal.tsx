/**
 * Create Profile Modal Component
 *
 * Modal for creating a new user profile with username input
 */

import { ConvexProfileService } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';

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
}: CreateProfileModalProps) {
  if (!isOpen) return null;

  const handleCreateProfile = async () => {
    if (isCreatingProfile || !profileUsername.trim()) {
      if (!profileUsername.trim() && soundEnabled) AudioManager.buttonError();
      return;
    }

    setIsCreatingProfile(true);

    if (soundEnabled) AudioManager.buttonClick();

    try {
      await ConvexProfileService.createProfile(address!, profileUsername.trim());
      devLog('✓ Profile created successfully!');

      const profile = await ConvexProfileService.getProfile(address!);
      devLog('📊 Profile retrieved:', profile);

      setUserProfile(profile);
      onClose();
      setProfileUsername('');
      setCurrentView('game');

      if (soundEnabled) AudioManager.buttonSuccess();
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
        <p className="text-center text-vintage-burnt-gold mb-6 text-sm">
          {t('noProfile')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              {t('username')}
            </label>
            <input
              type="text"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              maxLength={20}
              className="w-full px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-vintage-gold font-modern"
            />
            <p className="text-xs text-yellow-400 mt-2">
              ! Don't include @ symbol - just enter your username
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ※ {t('twitterHint')}
            </p>
          </div>

          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile || !profileUsername.trim()}
            className="w-full px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark shadow-gold text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingProfile ? '... Creating' : t('save')}
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
