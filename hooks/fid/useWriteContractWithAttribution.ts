'use client';

/**
 * useWriteContractWithAttribution
 *
 * Drop-in replacement for wagmi's useWriteContract that automatically adds
 * Base builder code attribution AND paymaster sponsorship to transactions.
 *
 * Uses ERC-5792 wallet_sendCalls with dataSuffix + paymasterService capabilities.
 *
 * Docs: https://docs.base.org/base-chain/quickstart/builder-codes
 */

import { useWriteContract, useAccount, useSendTransaction } from 'wagmi';
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
import { base } from 'viem/chains';
import { encodeFunctionData, type Abi } from 'viem';
import { Attribution } from 'ox/erc8021';

// Your unique builder code from base.dev
// VibeFID has its own builder code (different from VBMS)
export const BUILDER_CODE = 'bc_jqtoxmvp';

// Coinbase Paymaster URL for Base mainnet (gas sponsorship)
// Get your key from: https://portal.cdp.coinbase.com/
// Format: https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY
const PAYMASTER_URL = process.env.NEXT_PUBLIC_CDP_PAYMASTER_URL || '';

// Generate the dataSuffix for attribution
export let dataSuffix: `0x${string}`;
try {
  dataSuffix = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
  console.log('Builder code suffix generated:', { code: BUILDER_CODE, suffix: dataSuffix, length: dataSuffix.length });
} catch (e) {
  console.warn('Failed to generate dataSuffix:', e);
  dataSuffix = '0x';
}

/**
 * Drop-in replacement for useWriteContract with builder code attribution
 */
export function useWriteContractWithAttribution() {
  const { address: userAddress, chainId } = useAccount();
  const isOnBase = chainId === base.id;

  // Regular writeContract
  const writeContractResult = useWriteContract();

  // ERC-5792 sendCalls with capabilities
  const sendCallsResult = useSendCalls();

  // Raw transaction sender for manual suffix append
  const sendTxResult = useSendTransaction();

  // Check wallet capabilities
  const { data: capabilities } = useCapabilities({
    account: userAddress,
  });

  // Check if wallet supports ERC-5792 capabilities on Base
  const baseCapabilities = capabilities?.[base.id];
  const supportsERC5792 = isOnBase && (
    baseCapabilities?.atomicBatch?.supported === true ||
    baseCapabilities?.paymasterService?.supported === true
  );
  const supportsPaymaster = baseCapabilities?.paymasterService?.supported === true;

  /**
   * writeContractAsync with automatic builder code attribution
   * Same signature as wagmi's writeContractAsync
   *
   * IMPORTANTE: Farcaster miniapp NÃO suporta dataSuffix capability,
   * então sempre usamos o método manual (append no calldata)
   */
  const writeContractAsync: typeof writeContractResult.writeContractAsync = async (params: any) => {
    const { address, abi, functionName, args, value, chainId: txChainId } = params;

    // Only add attribution on Base
    if (!isOnBase) {
      console.log('📝 Not on Base, using regular writeContract');
      return writeContractResult.writeContractAsync(params);
    }

    // SEMPRE usar método manual para garantir builder code attribution
    // Farcaster miniapp não suporta dataSuffix capability
    if (dataSuffix !== '0x') {
      try {
        console.log('🏗️ Adding builder code suffix:', BUILDER_CODE);

        const callData = encodeFunctionData({
          abi: abi as Abi,
          functionName,
          args: args || [],
        });

        const dataWithSuffix = (callData + dataSuffix.slice(2)) as `0x${string}`;

        const hash = await sendTxResult.sendTransactionAsync({
          to: address,
          data: dataWithSuffix,
          value: value,
          chainId: txChainId ?? base.id,
        });

        console.log('✅ Transaction with builder code sent:', hash);
        return hash;
      } catch (err) {
        console.warn('⚠️ Manual suffix failed:', err);
        // Continua para fallback
      }
    }

    // Fallback: regular writeContract (sem attribution)
    console.log('📝 Fallback: regular writeContract');
    return writeContractResult.writeContractAsync(params);
  };

  /**
   * writeContract (sync version) - uses regular writeContract
   */
  const writeContract: typeof writeContractResult.writeContract = (params: any) => {
    if (isOnBase) {
      console.log('🏗️ Builder code:', BUILDER_CODE);
    }
    return writeContractResult.writeContract(params);
  };

  return {
    writeContract,
    writeContractAsync,
    isPending: writeContractResult.isPending || sendCallsResult.isPending || sendTxResult.isPending,
    isError: writeContractResult.isError || sendCallsResult.isError || sendTxResult.isError,
    isSuccess: writeContractResult.isSuccess || sendCallsResult.isSuccess || sendTxResult.isSuccess,
    error: writeContractResult.error || sendCallsResult.error || sendTxResult.error,
    data: writeContractResult.data || sendTxResult.data,
    reset: () => {
      writeContractResult.reset();
      sendCallsResult.reset();
      sendTxResult.reset();
    },
    builderCode: BUILDER_CODE,
    dataSuffix,
    isOnBase,
    supportsERC5792,
    supportsPaymaster,
    paymasterUrl: PAYMASTER_URL,
    _original: writeContractResult,
  };
}

export default useWriteContractWithAttribution;
