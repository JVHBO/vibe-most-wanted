"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/fid/convex-generated/api";
import { VibeMailInboxWithClaim } from "@/components/fid/VibeMail";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import { useClaimVBMS } from "@/hooks/fid/useVBMSContracts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { useProfile } from "@/contexts/ProfileContext";

function getWalletMailFid(address?: string): number | undefined {
  if (!address) return undefined;
  const suffix = address.toLowerCase().replace(/^0x/, "").slice(-8);
  const parsed = Number.parseInt(suffix, 16);
  if (!Number.isFinite(parsed)) return undefined;
  return 800_000_000 + (parsed % 100_000_000);
}

function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-vintage-dark flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-vintage-ice">{label}</p>
      </div>
    </div>
  );
}

function WalletRequired() {
  return (
    <div className="min-h-screen bg-vintage-dark flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4 text-vintage-gold">V</div>
        <h1 className="text-vintage-gold font-bold text-xl mb-2">VibeMail</h1>
        <p className="text-vintage-ice/70 mb-4">Connect your wallet to use VibeMail.</p>
        <a href="/" className="text-red-500 hover:text-red-400">Back</a>
      </div>
    </div>
  );
}

function VibeMailPageContent() {
  const { lang, setLang } = useLanguage();
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const t = fidTranslations[lang];
  const farcasterContext = useFarcasterContext();
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, isLoadingProfile } = useProfile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const testFid = searchParams.get("testFid");
  const farcasterFid =
    farcasterContext.user?.fid ??
    (userProfile?.farcasterFid ? Number(userProfile.farcasterFid) : undefined);
  const walletMailFid = useMemo(() => getWalletMailFid(address), [address]);
  const userFid = testFid ? Number.parseInt(testFid) : (farcasterFid ?? walletMailFid);
  const isWalletOnlyMail = !!userFid && !farcasterFid;

  const myCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    farcasterFid ? { fid: farcasterFid } : "skip"
  );

  const vibeRewards = useQuery(
    api.vibeRewards.getRewards,
    farcasterFid ? { fid: farcasterFid } : "skip"
  );

  const { claimVBMS, isConfirming: isClaimTxPending } = useClaimVBMS();
  const prepareVibeRewardsClaim = useAction(api.vibeRewards.prepareVibeRewardsClaim);
  const restoreClaimOnTxFailure = useMutation(api.vibeRewards.restoreClaimOnTxFailure);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);

  if (!mounted || isLoadingProfile) {
    return <LoadingState label={t.loading || "Loading..."} />;
  }

  if (!userFid) {
    return <WalletRequired />;
  }

  const handleClaim = async () => {
    if (!vibeRewards?.pendingVbms || !address || !farcasterFid) return;

    setIsClaimingRewards(true);
    let claimResult: { success: boolean; amount?: number; nonce?: string; signature?: string; error?: string } | null = null;

    try {
      claimResult = await prepareVibeRewardsClaim({
        fid: farcasterFid,
        claimerAddress: address,
      });

      if (!claimResult?.success || !claimResult.nonce || !claimResult.signature || !claimResult.amount) {
        throw new Error(claimResult?.error || "Failed to prepare claim");
      }

      const txHash = await claimVBMS(
        claimResult.amount.toString(),
        claimResult.nonce as `0x${string}`,
        claimResult.signature as `0x${string}`
      );
      alert(`Claimed ${claimResult.amount} VBMS! TX: ${txHash}`);
    } catch (error) {
      if (claimResult?.amount) {
        try {
          await restoreClaimOnTxFailure({ fid: farcasterFid, amount: claimResult.amount });
        } catch {
          // Nothing to restore for wallet-only mail.
        }
      }
      console.error("[VibeMail] Claim failed:", error);
    } finally {
      setIsClaimingRewards(false);
    }
  };

  const langOptions = [
    { value: "en", label: "EN" }, { value: "pt-BR", label: "PT" },
    { value: "es", label: "ES" }, { value: "it", label: "IT" },
    { value: "fr", label: "FR" }, { value: "ja", label: "JA" },
    { value: "zh-CN", label: "ZH" }, { value: "ru", label: "RU" },
    { value: "hi", label: "HI" }, { value: "id", label: "ID" },
  ];

  const displayName =
    myCard?.username ||
    userProfile?.username ||
    (address ? `wallet-${address.slice(2, 6)}` : "wallet");

  return (
    <div className="h-screen flex flex-col bg-vintage-dark">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-vintage-charcoal border-b border-vintage-gold/20">
        <button
          onClick={() => router.push("/")}
          className="h-8 px-3 bg-[#1a1a1a] border border-vintage-gold/30 text-vintage-gold font-bold text-xs rounded-lg hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all"
        >
          Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setIsMusicEnabled(!isMusicEnabled)}
          className="h-8 w-8 flex items-center justify-center bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all"
          aria-label="Toggle music"
        >
          {isMusicEnabled ? "♪" : "×"}
        </button>
        <select
          value={lang}
          onChange={(event) => setLang(event.target.value as any)}
          className="h-8 px-2 bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold font-bold focus:outline-none focus:border-vintage-gold text-xs hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-vintage-gold"
          style={{ colorScheme: "dark" }}
        >
          {langOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === lang ? `${option.label} ${option.label}` : option.label}
            </option>
          ))}
        </select>
      </div>

      <VibeMailInboxWithClaim
        cardFid={userFid}
        username={displayName}
        userPfpUrl={myCard?.pfpUrl}
        onClose={() => router.push("/")}
        pendingVbms={isWalletOnlyMail ? 0 : (vibeRewards?.pendingVbms || 0)}
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
    <Suspense fallback={<LoadingState />}>
      <VibeMailPageContent />
    </Suspense>
  );
}
