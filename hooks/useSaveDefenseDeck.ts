import { useCallback } from 'react';
import { toast } from 'sonner';
import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { HAND_SIZE } from '@/lib/config';

interface Params {
  address: string | undefined;
  userProfile: UserProfile | null;
  selectedCards: any[];
  soundEnabled: boolean;
  setDefenseDeckSaveStatus: (s: string) => void;
  setShowDefenseDeckSaved: (b: boolean) => void;
  refreshProfile: () => Promise<void>;
}

export function useSaveDefenseDeck({
  address,
  userProfile,
  selectedCards,
  soundEnabled,
  setDefenseDeckSaveStatus,
  setShowDefenseDeckSaved,
  refreshProfile,
}: Params) {
  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || selectedCards.length !== HAND_SIZE) return;

    try {
      devLog('✓ Profile verified:', userProfile.username);

      const invalidCards = selectedCards.filter(
        (card) =>
          !card.tokenId ||
          typeof card.power !== 'number' ||
          isNaN(card.power) ||
          !card.imageUrl ||
          card.imageUrl === 'undefined' ||
          card.imageUrl === ''
      );

      if (invalidCards.length > 0) {
        devError('✗ Invalid cards detected:', invalidCards);
        toast.error(
          `${invalidCards.length} card(s) have invalid data (missing image or power). Please refresh and try again.`
        );
        return;
      }

      const defenseDeckData = selectedCards.map((card) => {
        const hasFoil = card.foil && card.foil !== 'None' && card.foil !== '';
        return {
          tokenId: String(card.tokenId),
          power: Number(card.power) || 0,
          imageUrl: String(card.imageUrl),
          name: card.name || `Card #${card.tokenId}`,
          rarity: card.rarity || 'Common',
          foil: hasFoil ? String(card.foil) : undefined,
        };
      });

      devLog('💾 Saving defense deck:', {
        address,
        cardCount: defenseDeckData.length,
        cards: defenseDeckData.map((c) => ({
          tokenId: c.tokenId,
          power: c.power,
          foil: c.foil,
          imageUrl: c.imageUrl.substring(0, 50) + '...',
        })),
      });

      let saveSuccess = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setDefenseDeckSaveStatus(`Saving... (Attempt ${attempt}/3)`);
          devLog(`📡 Attempt ${attempt}/3 to save defense deck...`);
          await ConvexProfileService.updateDefenseDeck(address, defenseDeckData);
          devLog(`✓ Defense deck saved successfully on attempt ${attempt}`);
          saveSuccess = true;
          setDefenseDeckSaveStatus('');
          break;
        } catch (err: any) {
          devError(`✗ Attempt ${attempt}/3 failed:`, err);
          if (attempt === 3) {
            setDefenseDeckSaveStatus('');
            throw err;
          }
          setDefenseDeckSaveStatus(`Retrying in ${attempt} second(s)...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }

      if (saveSuccess) {
        if (soundEnabled) AudioManager.buttonSuccess();
        setShowDefenseDeckSaved(true);
        setTimeout(() => setShowDefenseDeckSaved(false), 3000);
        await refreshProfile();
      }
    } catch (error: any) {
      devError('Error saving defense deck:', error);
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Server Error') || errorMsg.includes('Request ID')) {
        toast.error('Convex server error. This might be temporary. Please wait a few seconds and try again.');
      } else if (errorMsg.includes('Profile not found')) {
        toast.error('Your profile was not found. Please refresh the page and try again.');
      } else {
        toast.error(`Error saving defense deck: ${errorMsg}. Please try again or refresh the page.`);
      }
    }
  }, [address, userProfile, selectedCards, soundEnabled, setDefenseDeckSaveStatus, setShowDefenseDeckSaved, refreshProfile]);

  return { saveDefenseDeck };
}
