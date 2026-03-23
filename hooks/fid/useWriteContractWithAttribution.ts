'use client';

/**
 * useWriteContractWithAttribution (VibeFID)
 *
 * Drop-in replacement for wagmi's useWriteContract that automatically adds
 * Base builder code attribution to transactions.
 *
 * Docs: https://docs.base.org/base-chain/builder-codes/builder-codes
 */

import { useWriteContract, useAccount, useSendTransaction } from 'wagmi';
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
import { base } from 'viem/chains';
import { encodeFunctionData, type Abi } from 'viem';

// VibeFID builder code from base.dev (different from VMW's bc_j3oc0rlv)
export const BUILDER_CODE = 'bc_jqtoxmvp';

// Precomputed ERC-8021 attribution suffix for bc_jqtoxmvp
// Verified: node -e "const {Attribution}=require('ox/erc8021'); console.log(Attribution.toDataSuffix({codes:['bc_jqtoxmvp']}))"
// Last 16 bytes = 80218021802180218021802180218021 (8021 pattern) ✓
const ATTRIBUTION_SUFFIX_HEX = '62635f6a71746f786d76700b0080218021802180218021802180218021';

export const dataSuffix: `0x${string}` = `0x${ATTRIBUTION_SUFFIX_HEX}`;

const PAYMASTER_URL = process.env.NEXT_PUBLIC_CDP_PAYMASTER_URL || '';

export function useWriteContractWithAttribution() {
  const { address: userAddress, chainId } = useAccount();
  const isOnBase = chainId === base.id;

  const writeContractResult = useWriteContract();
  const sendCallsResult = useSendCalls();
  const sendTxResult = useSendTransaction();

  const { data: capabilities } = useCapabilities({ account: userAddress });
  const baseCapabilities = capabilities?.[base.id];
  const supportsERC5792 = isOnBase && (
    baseCapabilities?.atomicBatch?.supported === true ||
    baseCapabilities?.paymasterService?.supported === true
  );
  const supportsPaymaster = baseCapabilities?.paymasterService?.supported === true;

  const writeContractAsync: typeof writeContractResult.writeContractAsync = async (params: any) => {
    const { address, abi, functionName, args, value, chainId: txChainId } = params;
    const targetChain = txChainId ?? base.id;

    if (targetChain !== base.id) {
      return writeContractResult.writeContractAsync(params);
    }

    try {
      console.log('[Attribution/fid] Adding builder code suffix:', BUILDER_CODE);

      const callData = encodeFunctionData({
        abi: abi as Abi,
        functionName,
        args: args || [],
      });

      const dataWithSuffix = (callData + ATTRIBUTION_SUFFIX_HEX) as `0x${string}`;

      const hash = await sendTxResult.sendTransactionAsync({
        to: address,
        data: dataWithSuffix,
        value,
        chainId: targetChain,
      });

      console.log('[Attribution/fid] TX with builder code sent:', hash);
      return hash;
    } catch (err) {
      console.warn('[Attribution/fid] sendTransactionAsync failed, falling back (no attribution):', err);
      return writeContractResult.writeContractAsync(params);
    }
  };

  const writeContract: typeof writeContractResult.writeContract = (params: any) => {
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
