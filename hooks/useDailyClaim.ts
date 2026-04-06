import { useCallback } from 'react';
import { useMutation, useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { sendMissionTx } from '@/lib/utils/missionTx';
import { ARB_CLAIM_TYPE } from '@/lib/hooks/useArbValidator';
import type { SupportedLanguage } from '@/lib/translations';

interface Params {
  address: string | undefined;
  lang: SupportedLanguage;
  effectiveChain: string;
  soundEnabled: boolean;
  loginBonusClaimed: boolean;
  isClaimingBonus: boolean;
  setIsClaimingBonus: (v: boolean) => void;
  setLoginBonusClaimed: (v: boolean) => void;
  setShowDailyClaimPopup: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
}

export function useDailyClaim({
  address,
  lang,
  effectiveChain,
  soundEnabled,
  loginBonusClaimed,
  isClaimingBonus,
  setIsClaimingBonus,
  setLoginBonusClaimed,
  setShowDailyClaimPopup,
  refreshProfile,
}: Params) {
  const convex = useConvex();
  const claimLoginBonus = useMutation(api.economy.claimLoginBonus);

  const handleClaimLoginBonus = useCallback(async () => {
    if (!address || loginBonusClaimed || isClaimingBonus) return;
    try {
      setIsClaimingBonus(true);
      devLog('Claiming login bonus...');
      const result = await claimLoginBonus({ address });
      if (result.awarded > 0) {
        devLog(`Login bonus claimed: +${result.awarded}`);
        setLoginBonusClaimed(true);
        if (soundEnabled) AudioManager.buttonClick();
      } else {
        devLog(`! ${result.reason}`);
        if (soundEnabled) AudioManager.buttonError();
      }
    } catch (error) {
      devError('Error claiming login bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingBonus(false);
    }
  }, [address, loginBonusClaimed, isClaimingBonus, claimLoginBonus, soundEnabled, setIsClaimingBonus, setLoginBonusClaimed]);

  const handleDailyClaimNow = useCallback(async () => {
    if (!address || isClaimingBonus) return;
    try {
      setIsClaimingBonus(true);
      devLog('Daily claim - claiming all unclaimed missions...');
      const claimResult = await convex.mutation(api.missions.claimAllMissions, {
        playerAddress: address,
        language: lang,
        chain: effectiveChain,
      });
      if (claimResult && claimResult.claimed > 0) {
        devLog(`Claimed ${claimResult.claimed} missions (+${claimResult.totalReward} coins)`);
        if (soundEnabled) AudioManager.buttonSuccess();
        setLoginBonusClaimed(true);
        setShowDailyClaimPopup(false);
        await refreshProfile();
        sendMissionTx(address, claimResult.totalReward, ARB_CLAIM_TYPE.DAILY_LOGIN);
      } else {
        devLog('No unclaimed missions found');
        if (soundEnabled) AudioManager.buttonError();
        setLoginBonusClaimed(true);
        setShowDailyClaimPopup(false);
      }
    } catch (error) {
      devError('Error claiming daily bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingBonus(false);
    }
  }, [address, isClaimingBonus, convex, lang, effectiveChain, soundEnabled, setIsClaimingBonus, setLoginBonusClaimed, setShowDailyClaimPopup, refreshProfile]);

  return { handleClaimLoginBonus, handleDailyClaimNow };
}
