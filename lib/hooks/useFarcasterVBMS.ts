/**
 * Farcaster-compatible VBMS hooks
 * Works in both miniapp (Farcaster SDK) and web (wagmi)
 */

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { CONTRACTS, ERC20_ABI } from '../contracts';

/**
 * Get VBMS balance - works in both miniapp and web
 */
export function useFarcasterVBMSBalance(address?: string) {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!address) {
      setBalance('0');
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try to get Farcaster SDK provider first (miniapp)
        const sdk = (window as any).sdk;
        let provider: any;

        if (sdk?.wallet?.ethProvider) {
          // Miniapp: Use Farcaster SDK provider
          provider = sdk.wallet.ethProvider;
        } else if (sdk?.wallet?.getEthereumProvider) {
          // Miniapp: New SDK API
          provider = await sdk.wallet.getEthereumProvider();
        } else if ((window as any).ethereum) {
          // Web: Use injected provider (MetaMask, etc)
          provider = (window as any).ethereum;
        }

        if (!provider) {
          console.warn('[useFarcasterVBMS] No provider available');
          setBalance('0');
          setIsLoading(false);
          return;
        }

        // Call balanceOf on VBMS token contract
        const data = await provider.request({
          method: 'eth_call',
          params: [
            {
              to: CONTRACTS.VBMSToken,
              data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address)
            },
            'latest',
          ],
        });

        // Parse result
        const balanceWei = BigInt(data);
        const balanceFormatted = formatEther(balanceWei);
        setBalance(balanceFormatted);
      } catch (err) {
        console.error('[useFarcasterVBMS] Error fetching balance:', err);
        setError(err as Error);
        setBalance('0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [address, refetchTrigger]);

  return {
    balance,
    balanceRaw: balance !== '0' ? BigInt(parseFloat(balance) * 1e18) : BigInt(0),
    isLoading,
    error,
    refetch: () => {
      // Trigger re-fetch by incrementing the trigger
      setRefetchTrigger(prev => prev + 1);
    },
  };
}

/**
 * Get VBMS allowance - works in both miniapp and web
 */
export function useFarcasterVBMSAllowance(owner?: string, spender?: string) {
  const [allowance, setAllowance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!owner || !spender) {
      setAllowance('0');
      return;
    }

    const fetchAllowance = async () => {
      setIsLoading(true);

      try {
        const sdk = (window as any).sdk;
        let provider: any;

        if (sdk?.wallet?.ethProvider) {
          provider = sdk.wallet.ethProvider;
        } else if (sdk?.wallet?.getEthereumProvider) {
          provider = await sdk.wallet.getEthereumProvider();
        } else if ((window as any).ethereum) {
          provider = (window as any).ethereum;
        }

        if (!provider) {
          setAllowance('0');
          setIsLoading(false);
          return;
        }

        // Call allowance(owner, spender)
        const ownerPadded = owner.slice(2).padStart(64, '0');
        const spenderPadded = spender.slice(2).padStart(64, '0');
        const data = await provider.request({
          method: 'eth_call',
          params: [
            {
              to: CONTRACTS.VBMSToken,
              data: `0xdd62ed3e${ownerPadded}${spenderPadded}`, // allowance(address,address)
            },
            'latest',
          ],
        });

        const allowanceWei = BigInt(data);
        const allowanceFormatted = formatEther(allowanceWei);
        setAllowance(allowanceFormatted);
      } catch (err) {
        console.error('[useFarcasterVBMS] Error fetching allowance:', err);
        setAllowance('0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllowance();
  }, [owner, spender, refetchTrigger]);

  return {
    allowance,
    allowanceRaw: allowance !== '0' ? BigInt(parseFloat(allowance) * 1e18) : BigInt(0),
    isLoading,
    refetch: () => {
      // Trigger re-fetch by incrementing the trigger
      setRefetchTrigger(prev => prev + 1);
    },
  };
}
