/**
 * Farcaster-compatible VBMS hooks
 * Works in both miniapp (Farcaster SDK) and web (wagmi)
 */

import { useState, useEffect } from 'react';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, ERC20_ABI } from '../contracts';
import { useWriteContract } from 'wagmi';

/**
 * Get VBMS balance - works in both miniapp and web
 */
export function useFarcasterVBMSBalance(address?: string) {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    console.log('[useFarcasterVBMSBalance] Effect triggered with address:', address);

    if (!address) {
      console.log('[useFarcasterVBMSBalance] No address provided, setting balance to 0');
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

        console.log('[useFarcasterVBMS] 🔍 Checking providers...', {
          hasSdk: !!sdk,
          hasEthProvider: !!sdk?.wallet?.ethProvider,
          hasGetEthereumProvider: !!sdk?.wallet?.getEthereumProvider,
          hasWindowEthereum: !!(window as any).ethereum,
          address,
        });

        if (sdk?.wallet?.ethProvider) {
          // Miniapp: Use Farcaster SDK provider
          provider = sdk.wallet.ethProvider;
          console.log('[useFarcasterVBMS] ✅ Using Farcaster SDK provider (ethProvider)');
        } else if (sdk?.wallet?.getEthereumProvider) {
          // Miniapp: New SDK API
          provider = await sdk.wallet.getEthereumProvider();
          console.log('[useFarcasterVBMS] ✅ Using Farcaster SDK provider (getEthereumProvider)');
        } else if ((window as any).ethereum) {
          // Web: Use injected provider (MetaMask, etc)
          provider = (window as any).ethereum;
          console.log('[useFarcasterVBMS] ✅ Using window.ethereum provider');
        }

        if (!provider) {
          console.warn('[useFarcasterVBMS] ❌ No provider available');
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
        console.log('[useFarcasterVBMSBalance] ✅ Balance fetched successfully:', {
          raw: data,
          wei: balanceWei.toString(),
          formatted: balanceFormatted
        });
        setBalance(balanceFormatted);
      } catch (err) {
        console.error('[useFarcasterVBMS] Error fetching balance:', err);
        setError(err as Error);
        setBalance('0');
      } finally {
        setIsLoading(false);
      }
    };

    console.log('[useFarcasterVBMSBalance] Calling fetchBalance()...');
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

/**
 * Approve VBMS spending - works in both miniapp and web
 */
export function useFarcasterApproveVBMS() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { writeContractAsync: wagmiApprove } = useWriteContract();

  const approve = async (spender: `0x${string}`, amount: bigint): Promise<`0x${string}`> => {
    setIsPending(true);
    setError(null);

    try {
      console.log('[useFarcasterApproveVBMS] 📝 Approving VBMS:', {
        spender,
        amount: amount.toString(),
        contractAddress: CONTRACTS.VBMSToken,
      });

      // Try to get Farcaster SDK provider first (miniapp)
      const sdk = (window as any).sdk;

      if (sdk?.wallet?.ethProvider || sdk?.wallet?.getEthereumProvider) {
        // Miniapp: Use Farcaster SDK provider
        let provider: any;
        if (sdk.wallet.ethProvider) {
          provider = sdk.wallet.ethProvider;
          console.log('[useFarcasterApproveVBMS] ✅ Using Farcaster SDK provider (ethProvider)');
        } else {
          provider = await sdk.wallet.getEthereumProvider();
          console.log('[useFarcasterApproveVBMS] ✅ Using Farcaster SDK provider (getEthereumProvider)');
        }

        // Get current account
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts available');
        }
        const from = accounts[0];

        // Encode approve function call
        // approve(address spender, uint256 amount)
        const approveData = `0x095ea7b3${spender.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;

        // Send transaction via Farcaster provider
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: CONTRACTS.VBMSToken,
            data: approveData,
            value: '0x0',
          }],
        });

        console.log('[useFarcasterApproveVBMS] ✅ Approve hash:', txHash);
        setIsPending(false);
        return txHash as `0x${string}`;
      } else {
        // Web: Use wagmi
        console.log('[useFarcasterApproveVBMS] ✅ Using wagmi provider');
        const hash = await wagmiApprove({
          address: CONTRACTS.VBMSToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spender, amount],
          chainId: CONTRACTS.CHAIN_ID,
        });

        console.log('[useFarcasterApproveVBMS] ✅ Approve hash:', hash);
        setIsPending(false);
        return hash;
      }
    } catch (err) {
      console.error('[useFarcasterApproveVBMS] ❌ Approve error:', err);
      setError(err as Error);
      setIsPending(false);
      throw err;
    }
  };

  return {
    approve,
    isPending,
    error,
  };
}

/**
 * Transfer VBMS - works in both miniapp and web
 */
export function useFarcasterTransferVBMS() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { writeContractAsync: wagmiTransfer } = useWriteContract();

  const transfer = async (to: `0x${string}`, amount: bigint): Promise<`0x${string}`> => {
    setIsPending(true);
    setError(null);

    try {
      console.log('[useFarcasterTransferVBMS] 💸 Transferring VBMS:', {
        to,
        amount: amount.toString(),
        contractAddress: CONTRACTS.VBMSToken,
      });

      // Try to get Farcaster SDK provider first (miniapp)
      const sdk = (window as any).sdk;

      if (sdk?.wallet?.ethProvider || sdk?.wallet?.getEthereumProvider) {
        // Miniapp: Use Farcaster SDK provider
        let provider: any;
        if (sdk.wallet.ethProvider) {
          provider = sdk.wallet.ethProvider;
          console.log('[useFarcasterTransferVBMS] ✅ Using Farcaster SDK provider (ethProvider)');
        } else {
          provider = await sdk.wallet.getEthereumProvider();
          console.log('[useFarcasterTransferVBMS] ✅ Using Farcaster SDK provider (getEthereumProvider)');
        }

        // Get current account
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts available');
        }
        const from = accounts[0];

        // Encode transfer function call
        const transferData = `0xa9059cbb${to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;

        // Send transaction via Farcaster provider
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: CONTRACTS.VBMSToken,
            data: transferData,
            value: '0x0',
          }],
        });

        console.log('[useFarcasterTransferVBMS] ✅ Transfer hash:', txHash);
        setIsPending(false);
        return txHash as `0x${string}`;
      } else {
        // Web: Use wagmi
        console.log('[useFarcasterTransferVBMS] ✅ Using wagmi provider');
        const hash = await wagmiTransfer({
          address: CONTRACTS.VBMSToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, amount],
          chainId: CONTRACTS.CHAIN_ID,
        });

        console.log('[useFarcasterTransferVBMS] ✅ Transfer hash:', hash);
        setIsPending(false);
        return hash;
      }
    } catch (err) {
      console.error('[useFarcasterTransferVBMS] ❌ Transfer error:', err);
      setError(err as Error);
      setIsPending(false);
      throw err;
    }
  };

  return {
    transfer,
    isPending,
    error,
  };
}
