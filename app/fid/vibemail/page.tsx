'use client';

import { useState, useEffect } from 'react';
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from "@/lib/fid/convex-generated/api";
import { useAccount } from 'wagmi';
import { useClaimVBMS } from "@/hooks/fid/useVBMSContracts";
import { VibeMailInboxWithClaim } from "@/components/fid/VibeMail";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { sdk } from '@farcaster/miniapp-sdk';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VibeMailPage() {
  const { lang } = useLanguage();
  const t = fidTranslations[lang];
  const farcasterContext = useFarcasterContext();
  const { address } = useAccount();
  const searchParams = useSearchParams();

  // Support testFid for development
  const testFid = searchParams.get('testFid');

  // Get user FID (from Farcaster context or testFid param)
  const userFid = testFid ? parseInt(testFid) : farcasterContext?.user?.fid;

  // Get card data
  const myCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    userFid ? { fid: userFid } : 'skip'
  );

  // Get vibe rewards
  const vibeRewards = useQuery(
    api.vibeRewards.getRewards,
    userFid ? { fid: userFid } : 'skip'
  );

  // Claim VBMS hooks and actions
  const { claimVBMS, isConfirming: isClaimTxPending } = useClaimVBMS();
  const prepareVibeRewardsClaim = useAction(api.vibeRewards.prepareVibeRewardsClaim);
  const restoreClaimOnTxFailure = useMutation(api.vibeRewards.restoreClaimOnTxFailure);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!sdk || typeof sdk.actions?.ready !== 'function') return;
        await sdk.actions.ready();
      } catch (error) {
        console.error('[VibeMail] SDK ready error:', error);
      }
    };
    initSDK();
  }, []);

  // Debug log
  console.log('[VibeMail Page] userFid:', userFid, 'testFid:', testFid, 'context:', farcasterContext);

  // Loading state - waiting for Farcaster context
  if (!userFid && !farcasterContext?.isReady) {
    return (
      <div className="min-h-screen bg-vintage-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-vintage-ice">{t.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // No FID available
  if (!userFid) {
    return (
      <div className="min-h-screen bg-vintage-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-vintage-gold font-bold text-xl mb-2">VibeMail</h1>
          <p className="text-vintage-ice/70 mb-4">
            Abra no miniapp do Farcaster ou use ?testFid=SEU_FID
          </p>
          <Link href="/fid" className="text-vintage-gold hover:text-vintage-gold/80">
            ← Voltar
          </Link>
        </div>
      </div>
    );
  }

  // Handle claim
  const handleClaim = async () => {
    if (!vibeRewards?.pendingVbms || !address || !userFid) return;

    setIsClaimingRewards(true);
    setClaimError(null);
    let claimResult: { success: boolean; amount?: number; nonce?: string; signature?: string; error?: string } | null = null;

    try {
      console.log('📝 Preparing claim via Convex action...');
      claimResult = await prepareVibeRewardsClaim({
        fid: userFid,
        claimerAddress: address,
      });

      if (!claimResult || !claimResult.success || !claimResult.nonce || !claimResult.signature || !claimResult.amount) {
        throw new Error(claimResult?.error || 'Failed to prepare claim');
      }

      console.log('✅ Got nonce + signature from Convex');
      console.log('🔗 Calling claimVBMS on contract...');

      const txHash = await claimVBMS(
        claimResult.amount.toString(),
        claimResult.nonce as `0x${string}`,
        claimResult.signature as `0x${string}`
      );
      console.log('✅ Claim TX:', txHash);
      alert(`Claimed ${claimResult.amount} VBMS! TX: ${txHash}`);
    } catch (e: any) {
      console.error('❌ Claim failed:', e);
      if (claimResult?.amount) {
        console.log('🔄 Restoring rewards after TX failure...');
        try {
          await restoreClaimOnTxFailure({ fid: userFid, amount: claimResult.amount });
          console.log('✅ Rewards restored');
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
      onClose={() => {
        // Navigate back to home
        window.location.href = '/fid';
      }}
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
