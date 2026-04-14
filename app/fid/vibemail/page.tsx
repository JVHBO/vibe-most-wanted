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
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { useMusic } from '@/contexts/MusicContext';

function VibeMailPageContent() {
  const { lang, setLang } = useLanguage();
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const t = fidTranslations[lang];
  const farcasterContext = useFarcasterContext();
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { userProfile, isLoadingProfile } = useProfile();

  // Support testFid for development
  const testFid = searchParams.get('testFid');

  // Same pattern as fid/page.tsx: fall back to farcasterFid from VMW profile
  const effectiveFarcasterUser = farcasterContext.user ?? (
    userProfile?.farcasterFid ? {
      fid: userProfile.farcasterFid as number,
      username: userProfile.username || undefined,
      pfpUrl: (userProfile as any).farcasterPfpUrl || undefined,
    } : null
  );

  // Get user FID (from Farcaster context, testFid param, or linked wallet profile)
  const userFid = testFid ? parseInt(testFid) : (effectiveFarcasterUser?.fid ?? undefined);

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

  // Loading state - waiting for Farcaster context OR profile to load
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

  // No FID available
  if (!userFid) {
    return (
      <div className="min-h-screen bg-vintage-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-vintage-gold font-bold text-xl mb-2">VibeMail</h1>
          <p className="text-vintage-ice/70 mb-4">
            {address
              ? 'No FID linked to this wallet. Link your Farcaster in your profile.'
              : 'Connect your wallet or open in Farcaster miniapp.'}
          </p>
          <Link href="/fid" className="text-red-500 hover:text-red-400">
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

  const LANG_OPTIONS = [
    { value: 'en', label: 'EN' }, { value: 'pt-BR', label: 'PT' },
    { value: 'es', label: 'ES' }, { value: 'it', label: 'IT' },
    { value: 'fr', label: 'FR' }, { value: 'ja', label: 'JA' },
    { value: 'zh-CN', label: 'ZH' }, { value: 'ru', label: 'RU' },
    { value: 'hi', label: 'HI' }, { value: 'id', label: 'ID' },
  ];

  return (
    <div className="h-screen flex flex-col bg-vintage-dark">
      {/* Top bar — same style as fid/page.tsx nav */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-vintage-charcoal border-b border-vintage-gold/20">
        <button
          onClick={() => router.push('/fid')}
          className="h-8 px-3 bg-[#1a1a1a] border border-vintage-gold/30 text-vintage-gold font-bold text-xs rounded-lg hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all"
        >
          ← Card
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setIsMusicEnabled(!isMusicEnabled)}
          className="h-8 w-8 flex items-center justify-center bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all"
        >
          {isMusicEnabled
            ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          }
        </button>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="h-8 px-2 bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold font-bold focus:outline-none focus:border-vintage-gold text-xs hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-vintage-gold"
          style={{ colorScheme: 'dark' }}
        >
          {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value === lang ? `${o.label} ${o.label}` : o.label}</option>)}
        </select>
      </div>
      {/* VibeMail content fills remaining height */}
      <VibeMailInboxWithClaim
        cardFid={userFid}
        username={myCard?.username}
        userPfpUrl={myCard?.pfpUrl}
        onClose={() => router.push('/fid')}
        pendingVbms={vibeRewards?.pendingVbms || 0}
        address={address}
        myFid={userFid}
        myAddress={address}
        isClaimingRewards={isClaimingRewards}
        isClaimTxPending={isClaimTxPending}
        onClaim={handleClaim}
        inline={true}
      />
    </div>
  );
}

export default function VibeMailPage() {
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
      <VibeMailPageContent />
    </Suspense>
  );
}
