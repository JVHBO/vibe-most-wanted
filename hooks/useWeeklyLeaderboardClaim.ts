import { useCallback } from 'react';
import { useMutation, useAction } from 'convex/react';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { dataSuffix as ATTRIBUTION_SUFFIX } from '@/lib/hooks/useWriteContractWithAttribution';

interface Params {
  address: string | undefined;
  soundEnabled: boolean;
  isClaimingWeeklyReward: boolean;
  setIsClaimingWeeklyReward: (v: boolean) => void;
  setShowWeeklyLeaderboardPopup: (v: boolean) => void;
}

export function useWeeklyLeaderboardClaim({
  address,
  soundEnabled,
  isClaimingWeeklyReward,
  setIsClaimingWeeklyReward,
  setShowWeeklyLeaderboardPopup,
}: Params) {
  const prepareWeeklyLeaderboardVBMSClaim = useAction(api.quests.prepareWeeklyLeaderboardVBMSClaim);
  const recordWeeklyLeaderboardClaim = useMutation(api.quests.recordWeeklyLeaderboardClaim);

  const handleClaimWeeklyLeaderboardReward = useCallback(async () => {
    if (!address || isClaimingWeeklyReward) return;
    setIsClaimingWeeklyReward(true);

    try {
      devLog('Preparing weekly leaderboard VBMS claim...');
      const result = await prepareWeeklyLeaderboardVBMSClaim({ address });

      toast.info('Sign transaction to receive VBMS...');

      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) throw new Error('Wallet not available');

      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
      } catch {}

      const { encodeFunctionData, parseEther } = await import('viem');
      const { POOL_ABI } = await import('@/lib/contracts');
      const callData = encodeFunctionData({
        abi: POOL_ABI,
        functionName: 'claimVBMS',
        args: [parseEther(result.amount.toString()), result.nonce as `0x${string}`, result.signature as `0x${string}`],
      });
      const data = (callData + ATTRIBUTION_SUFFIX.slice(2)) as `0x${string}`;

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address as `0x${string}`, to: '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b', data }],
      }) as string;

      await recordWeeklyLeaderboardClaim({ address, txHash });
      setShowWeeklyLeaderboardPopup(false);
      toast.success(`${result.amount.toLocaleString()} VBMS claimed! Rank #${result.rank}`);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('Error claiming weekly reward:', error);
      toast.error(error.message || 'Failed to claim weekly reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingWeeklyReward(false);
    }
  }, [address, isClaimingWeeklyReward, prepareWeeklyLeaderboardVBMSClaim, recordWeeklyLeaderboardClaim, soundEnabled, setIsClaimingWeeklyReward, setShowWeeklyLeaderboardPopup]);

  return { handleClaimWeeklyLeaderboardReward };
}
