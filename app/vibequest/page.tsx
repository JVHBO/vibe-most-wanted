'use client';

import { Suspense, useState, useEffect } from 'react';
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { useAccount } from 'wagmi';
import { useClaimVBMS } from "@/hooks/fid/useVBMSContracts";
import { VibeMailInboxWithClaim } from "@/components/fid/VibeMail";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { sdk } from '@farcaster/miniapp-sdk';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';

function VibeQuestPageContent() {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const farcasterContext = useFarcasterContext();
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { userProfile, isLoadingProfile } = useProfile();

  const testFid = searchParams.get('testFid');

  const effectiveFarcasterUser = farcasterContext.user ?? (
    userProfile?.farcasterFid ? {
      fid: userProfile.farcasterFid as number,
      username: userProfile.username || undefined,
      pfpUrl: (userProfile as any).farcasterPfpUrl || undefined,
    } : null
  );

  const userFid = testFid ? parseInt(testFid) : (effectiveFarcasterUser?.fid ?? undefined);

  const myCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    userFid ? { fid: userFid } : 'skip'
  );

  const vibeRewards = useQuery(
    api.vibeRewards.getRewards,
    userFid ? { fid: userFid } : 'skip'
  );

  const { claimVBMS, isConfirming: isClaimTxPending } = useClaimVBMS();
  const prepareVibeRewardsClaim = useAction(api.vibeRewards.prepareVibeRewardsClaim);
  const restoreClaimOnTxFailure = useMutation(api.vibeRewards.restoreClaimOnTxFailure);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!sdk || typeof sdk.actions?.ready !== 'function') return;
        await sdk.actions.ready();
      } catch (error) {
        console.error('[VibeQuest] SDK ready error:', error);
      }
    };
    initSDK();
  }, []);

  if (!userFid && (!farcasterContext?.isReady || isLoadingProfile)) {
    return (
      <div className="min-h-screen bg-vintage-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-vintage-ice">{t.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!userFid) {
    return (
      <div className="min-h-screen bg-vintage-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">★</div>
          <h1 className="text-vintage-gold font-bold text-xl mb-2">VibeQuest</h1>
          <p className="text-vintage-ice/70 mb-4">
            {address
              ? 'No FID linked to this wallet. Link your Farcaster in your profile.'
              : 'Connect your wallet or open in Farcaster miniapp.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-vintage-gold hover:text-vintage-gold/80"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const handleClaim = async () => {
    if (!vibeRewards?.pendingVbms || !address || !userFid) return;

    setIsClaimingRewards(true);
    setClaimError(null);
    let claimResult: { success: boolean; amount?: number; nonce?: string; signature?: string; error?: string } | null = null;

    try {
      claimResult = await prepareVibeRewardsClaim({
        fid: userFid,
        claimerAddress: address,
      });

      if (!claimResult || !claimResult.success || !claimResult.nonce || !claimResult.signature || !claimResult.amount) {
        throw new Error(claimResult?.error || 'Failed to prepare claim');
      }

      const txHash = await claimVBMS(
        claimResult.amount.toString(),
        claimResult.nonce as `0x${string}`,
        claimResult.signature as `0x${string}`
      );
      alert(`Claimed ${claimResult.amount} VBMS! TX: ${txHash}`);
    } catch (e: any) {
      console.error('[VibeQuest] Claim failed:', e);
      if (claimResult?.amount) {
        try {
          await restoreClaimOnTxFailure({ fid: userFid, amount: claimResult.amount });
        } catch (restoreErr) {
          console.error('Failed to restore rewards:', restoreErr);
        }
      }
      setClaimError(e.message || 'Claim failed');
      setTimeout(() => setClaimError(null), 5000);
    }
    setIsClaimingRewards(false);
  };

  return (
    <VibeMailInboxWithClaim
      cardFid={userFid}
      username={myCard?.username}
      userPfpUrl={myCard?.pfpUrl}
      onClose={() => router.push('/')}
      pendingVbms={vibeRewards?.pendingVbms || 0}
      address={address}
      myFid={userFid}
      myAddress={address}
      isClaimingRewards={isClaimingRewards}
      isClaimTxPending={isClaimTxPending}
      onClaim={handleClaim}
      asPage={true}
    />
  );
}

export default function VibeQuestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-vintage-dark flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-vintage-ice">Loading...</p>
          </div>
        </div>
      }
    >
      <VibeQuestPageContent />
    </Suspense>
  );
}
