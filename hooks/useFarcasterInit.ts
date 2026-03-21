import { useState, useEffect, useRef } from 'react';
import { useConnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';
import { devLog } from '@/lib/utils/logger';

export function useFarcasterInit(isFrameMode: boolean) {
  const { connect, connectors } = useConnect();
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [farcasterFidState, setFarcasterFidState] = useState<number | undefined>(undefined);
  const [farcasterClientFid, setFarcasterClientFid] = useState<number | undefined>(undefined);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState(true);
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
    const initFarcasterWallet = async () => {
      const isForcedMiniapp = typeof window !== 'undefined' && localStorage.getItem("vbms_force_miniapp") === "1";
      if (isFrameMode && !isForcedMiniapp) {
        setIsInFarcaster(true);
        setIsCheckingFarcaster(false);
        return;
      }

      console.log('[Farcaster] Initializing wallet connection...');
      try {
        if (!sdk) {
          setIsInFarcaster(false);
          setIsCheckingFarcaster(false);
          return;
        }

        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 5000),
          );
          const context = (await Promise.race([contextPromise, timeoutPromise])) as any;

          if (!context?.user?.fid) {
            setIsInFarcaster(false);
            setIsCheckingFarcaster(false);
            return;
          }

          console.log('[Farcaster] Miniapp confirmed - FID:', context.user.fid);
          setFarcasterFidState(context.user.fid);
          setFarcasterClientFid(context.client?.clientFid);
          setIsInFarcaster(true);
        } catch {
          setIsInFarcaster(false);
          setIsCheckingFarcaster(false);
          return;
        }

        let walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
        let retries = 0;
        while (!walletAvailable && retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
          retries++;
        }

        if (!walletAvailable) {
          setIsCheckingFarcaster(false);
          return;
        }

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
          setIsCheckingFarcaster(false);
        }
      } catch (err) {
        setIsInFarcaster(false);
        setIsCheckingFarcaster(false);
      }
    };

    initFarcasterWallet();
  }, [connect, connectors, isFrameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isInFarcaster,
    setIsInFarcaster,
    farcasterFidState,
    setFarcasterFidState,
    farcasterClientFid,
    isCheckingFarcaster,
    setIsCheckingFarcaster,
  };
}
