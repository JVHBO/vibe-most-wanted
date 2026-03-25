import { useState, useEffect, useRef } from 'react';
import { useConnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';
import { devLog } from '@/lib/utils/logger';
import { isMiniappMode } from '@/lib/utils/miniapp';

export function useFarcasterInit(isFrameMode: boolean) {
  const { connect, connectors } = useConnect();
  // isActualMiniapp = true when running inside Warpcast iframe (window.self !== window.top)
  // This is synchronous — no waiting for SDK
  const [isActualMiniapp] = useState(() =>
    typeof window !== 'undefined' ? isMiniappMode() : false
  );
  const [isInFarcaster, setIsInFarcaster] = useState(() =>
    typeof window !== 'undefined' ? isMiniappMode() || isFrameMode : isFrameMode
  );
  const [farcasterFidState, setFarcasterFidState] = useState<number | undefined>(undefined);
  const [farcasterClientFid, setFarcasterClientFid] = useState<number | undefined>(undefined);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState(true);
  const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const readyCalledRef = useRef(false);

  // CRITICAL: Call ready() IMMEDIATELY - affects Farcaster ranking and daily user count
  useEffect(() => {
    if (readyCalledRef.current) return;
    readyCalledRef.current = true;
    if (typeof window === 'undefined') return;
    if (!sdk || typeof sdk.actions?.ready !== 'function') return;
    sdk.actions.ready().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initFarcasterWallet = async () => {
      const isForcedMiniapp = typeof window !== 'undefined' && localStorage.getItem("vbms_force_miniapp") === "1";
      // isFrameMode = true → phone frame on desktop OR forced miniapp (device test popup)
      // Force miniapp layout immediately, no Farcaster context needed
      if (isFrameMode) {
        if (!cancelled) {
          setIsInFarcaster(true);
          setIsCheckingFarcaster(false);
        }
        if (isForcedMiniapp) return;
        return;
      }

      // Mobile browsers: always use miniapp layout (no desktop layout on phones/tablets)
      const isMobileUA = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobileScreen = window.innerWidth < 768;
      if (isMobileUA || isMobileScreen) {
        if (!cancelled) setIsInFarcaster(true);
        // Don't return — still run SDK check below to get FID for VibeFID button
      }

      console.log('[Farcaster] Initializing wallet connection...');
      try {
        if (!sdk) {
          if (!cancelled) { if (!isMobileUA && !isMobileScreen) setIsInFarcaster(false); setIsCheckingFarcaster(false); }
          return;
        }

        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 5000),
          );
          const context = (await Promise.race([contextPromise, timeoutPromise])) as any;
          if (cancelled) return;

          if (!context?.user?.fid) {
            // On mobile, keep isInFarcaster=true even without SDK FID
            if (!isMobileUA && !isMobileScreen) setIsInFarcaster(false);
            setIsCheckingFarcaster(false);
            return;
          }

          console.log('[Farcaster] Miniapp confirmed - FID:', context.user.fid);
          setFarcasterFidState(context.user.fid);
          setFarcasterClientFid(context.client?.clientFid);
          setIsInFarcaster(true);
          if (context.client?.safeAreaInsets) {
            setSafeAreaInsets(context.client.safeAreaInsets);
          }
        } catch {
          if (cancelled) return;
          if (!isMobileUA && !isMobileScreen) setIsInFarcaster(false);
          setIsCheckingFarcaster(false);
          return;
        }

        let walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
        let retries = 0;
        while (!walletAvailable && retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (cancelled) return;
          walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
          retries++;
        }

        if (cancelled) return;
        if (!walletAvailable) { setIsCheckingFarcaster(false); return; }

        try {
          const farcasterConnector = connectors.find(
            (c) =>
              c.id === 'farcasterMiniApp' ||
              c.id === 'farcaster' ||
              c.name?.toLowerCase().includes('farcaster'),
          );

          if (!farcasterConnector) {
            toast.error('Farcaster connector not found. Please reload.');
            setIsCheckingFarcaster(false);
            return;
          }

          await connect({ connector: farcasterConnector });
          devLog('Auto-connected Farcaster wallet');
        } catch (connectError: any) {
          if (connectError?.message?.includes('not been authorized')) {
            devLog('Farcaster wallet not authorized');
          }
        } finally {
          if (!cancelled) setIsCheckingFarcaster(false);
        }
      } catch (err) {
        if (!cancelled) { if (!isMobileUA && !isMobileScreen) setIsInFarcaster(false); setIsCheckingFarcaster(false); }
      }
    };

    initFarcasterWallet();
    return () => { cancelled = true; };
  }, [connect, connectors, isFrameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isInFarcaster,
    setIsInFarcaster,
    isActualMiniapp,
    farcasterFidState,
    setFarcasterFidState,
    farcasterClientFid,
    isCheckingFarcaster,
    setIsCheckingFarcaster,
    safeAreaInsets,
  };
}
