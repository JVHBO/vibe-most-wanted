import { useConvex } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { getMissionInfo, ALL_MISSION_TYPES, FALLBACK_MISSIONS } from '@/lib/missions/missionConfig';
import { sendMissionTx } from '@/lib/utils/missionTx';
import { ARB_CLAIM_TYPE } from '@/lib/hooks/useArbValidator';

interface UseMissionsManagerParams {
  address: string | undefined;
  soundEnabled: boolean;
  lang: string;
  effectiveChain: string;
  userProfile: any;
  setMissions: (m: any[]) => void;
  setIsLoadingMissions: (v: boolean) => void;
  setIsClaimingMission: (v: string | null) => void;
  setIsClaimingAll: (v: boolean) => void;
  setShowDailyClaimPopup: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
}

export function useMissionsManager({
  address,
  soundEnabled,
  lang,
  effectiveChain,
  userProfile,
  setMissions,
  setIsLoadingMissions,
  setIsClaimingMission,
  setIsClaimingAll,
  setShowDailyClaimPopup,
  refreshProfile,
}: UseMissionsManagerParams) {
  const convex = useConvex();

  const loadMissions = async () => {
    if (!address) return;
    setIsLoadingMissions(true);
    try {
      const sessionKey = `vbms_missions_init_${address.toLowerCase()}`;
      const today = new Date().toISOString().split('T')[0];
      const cached = sessionStorage.getItem(sessionKey);

      if (cached !== today) {
        if (!userProfile?.hasReceivedWelcomeGift) {
          await convex.mutation(api.missions.ensureWelcomeGift, { playerAddress: address });
        }
        await convex.mutation(api.missions.markDailyLogin, { playerAddress: address });
        sessionStorage.setItem(sessionKey, today);
      }

      const playerMissions = await convex.query(api.missions.getPlayerMissions, {
        playerAddress: address,
      });

      let vibeBadgeEligibility: any = null;
      const badgeCacheKey = `vbms_badge_${address.toLowerCase()}`;
      try {
        const cachedBadge = sessionStorage.getItem(badgeCacheKey);
        if (cachedBadge) vibeBadgeEligibility = JSON.parse(cachedBadge);
      } catch {}

      if (!vibeBadgeEligibility) {
        vibeBadgeEligibility = await convex.action(api.missions.checkVibeBadgeEligibility, {
          playerAddress: address,
        });
        try {
          sessionStorage.setItem(badgeCacheKey, JSON.stringify(vibeBadgeEligibility));
        } catch {}
      }

      const completeMissionsList = ALL_MISSION_TYPES.map((missionDef) => {
        const existingMission = (playerMissions || []).find(
          (m: any) => m.missionType === missionDef.type,
        );

        if (existingMission) return existingMission;

        if (missionDef.type === 'claim_vibe_badge') {
          return {
            _id: `placeholder_${missionDef.type}`,
            missionType: missionDef.type,
            completed: vibeBadgeEligibility?.eligible || false,
            claimed: vibeBadgeEligibility?.hasBadge || false,
            reward: missionDef.reward,
            date: missionDef.date,
          };
        }

        return {
          _id: `placeholder_${missionDef.type}`,
          missionType: missionDef.type,
          completed: false,
          claimed: false,
          reward: missionDef.reward,
          date: missionDef.date,
        };
      });

      setMissions(completeMissionsList);
      devLog('Loaded missions:', completeMissionsList);

      const dailyLogin = completeMissionsList.find((m: any) => m.missionType === 'daily_login');
      if (dailyLogin?.completed && !dailyLogin?.claimed) {
        setShowDailyClaimPopup(true);
      }
    } catch (error) {
      devError('Error loading missions:', error);
      setMissions(FALLBACK_MISSIONS);
    } finally {
      setIsLoadingMissions(false);
    }
  };

  const claimMission = async (missionId: string, missionType?: string) => {
    if (!address) return;

    if (missionType === 'claim_vibe_badge') {
      setIsClaimingMission(missionId);
      try {
        const result = await convex.action(api.missions.claimVibeBadge, { playerAddress: address });
        if (soundEnabled) AudioManager.buttonSuccess();
        devLog('VIBE Badge claimed:', result);
        await loadMissions();
        await refreshProfile();
      } catch (error: any) {
        devError('Error claiming VIBE badge:', error);
        if (soundEnabled) AudioManager.buttonError();
        toast.error(error.message || 'Failed to claim VIBE badge');
      } finally {
        setIsClaimingMission(null);
      }
      return;
    }

    if (missionId.startsWith('placeholder_')) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setIsClaimingMission(missionId);
    try {
      const result = await convex.mutation(api.missions.claimMission, {
        playerAddress: address,
        missionId: missionId as any,
        language: lang,
        chain: effectiveChain,
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('Mission claimed:', result);

      if (result?.reward > 0) {
        sendMissionTx(address, result.reward, ARB_CLAIM_TYPE.MISSION);
      }

      await loadMissions();
      await refreshProfile();
    } catch (error: any) {
      devError('Error claiming mission:', error);
      if (soundEnabled) AudioManager.buttonError();
      toast.error(error.message || 'Failed to claim mission');
    } finally {
      setIsClaimingMission(null);
    }
  };

  const claimAllMissions = async () => {
    if (!address) return;
    setIsClaimingAll(true);
    try {
      const result = await convex.mutation(api.missions.claimAllMissions, {
        playerAddress: address,
        language: lang,
        chain: effectiveChain,
      });

      if (result && result.claimed > 0) {
        if (soundEnabled) AudioManager.buttonSuccess();
        devLog(`Claimed ${result.claimed} missions (+${result.totalReward} coins)`);
        sendMissionTx(address, result.totalReward, ARB_CLAIM_TYPE.MISSION);
        await loadMissions();
        await refreshProfile();
      } else {
        if (soundEnabled) AudioManager.buttonClick();
        toast.error('No missions to claim!');
      }
    } catch (error: any) {
      devError('Error claiming all missions:', error);
      if (soundEnabled) AudioManager.buttonError();
      toast.error(error.message || 'Failed to claim missions');
    } finally {
      setIsClaimingAll(false);
    }
  };

  return { getMissionInfo, loadMissions, claimMission, claimAllMissions };
}
