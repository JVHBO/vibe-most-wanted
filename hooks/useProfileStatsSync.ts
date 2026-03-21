import { useEffect, useRef } from 'react';
import { ConvexProfileService } from '@/lib/convex-profile';
import { devLog, devError } from '@/lib/utils/logger';

interface UseProfileStatsSyncParams {
  address: string | undefined;
  userProfile: any;
  nfts: any[];
  openedCardsCount: number;
  unopenedCardsCount: number;
  totalNftPower: number;
  nftTokenIds: string[];
  setUserProfile: (profile: any) => void;
}

export function useProfileStatsSync({
  address,
  userProfile,
  nfts,
  openedCardsCount,
  unopenedCardsCount,
  totalNftPower,
  nftTokenIds,
  setUserProfile,
}: UseProfileStatsSyncParams) {
  const updateStatsInProgress = useRef(false);

  useEffect(() => {
    if (updateStatsInProgress.current) return;
    if (!address || !userProfile || nfts.length === 0) return;

    updateStatsInProgress.current = true;

    const statsKey = `vbms_stats_${address.toLowerCase()}`;
    const currentHash = `${nfts.length}-${openedCardsCount}-${totalNftPower}`;
    const cachedHash = sessionStorage.getItem(statsKey);

    if (cachedHash === currentHash) {
      devLog('Stats already sent this session, skipping');
      updateStatsInProgress.current = false;
      return;
    }

    const currentStats = userProfile?.stats;
    const statsChanged =
      nfts.length !== (currentStats?.totalCards || 0) ||
      totalNftPower !== (currentStats?.totalPower || 0) ||
      openedCardsCount !== (currentStats?.openedCards || 0);

    if (!statsChanged) {
      devLog('Stats unchanged, skipping update');
      sessionStorage.setItem(statsKey, currentHash);
      updateStatsInProgress.current = false;
      return;
    }

    const collectionPowers = nfts.reduce(
      (acc: { vibePower?: number; vbrsPower?: number; vibefidPower?: number }, nft: any) => {
        const collection = nft.collection || 'vibe';
        const power = nft.power || 0;
        if (collection === 'vibe') acc.vibePower = (acc.vibePower || 0) + power;
        else if (collection === 'gmvbrs') acc.vbrsPower = (acc.vbrsPower || 0) + power;
        else if (collection === 'vibefid') acc.vibefidPower = (acc.vibefidPower || 0) + power;
        return acc;
      },
      {},
    );

    const shouldSendTokenIds = nfts.length !== (currentStats?.totalCards || 0);

    ConvexProfileService.updateStats(
      address,
      nfts.length,
      openedCardsCount,
      unopenedCardsCount,
      totalNftPower,
      shouldSendTokenIds ? nftTokenIds : undefined,
      collectionPowers,
    )
      .then(() => {
        sessionStorage.setItem(statsKey, currentHash);
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            stats: {
              ...userProfile.stats,
              totalCards: nfts.length,
              openedCards: openedCardsCount,
              unopenedCards: unopenedCardsCount,
              totalPower: totalNftPower,
              ...collectionPowers,
            },
          });
        }
      })
      .catch((error) => devError('Error updating profile stats:', error))
      .finally(() => {
        updateStatsInProgress.current = false;
      });
  }, [address, nfts]); // eslint-disable-line react-hooks/exhaustive-deps
}
