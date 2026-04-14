import { sdk } from '@farcaster/miniapp-sdk';
import { encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';
import { devError } from '@/lib/utils/logger';
import { dataSuffix } from '@/lib/hooks/useWriteContractWithAttribution';

export async function sendMissionTx(
  address: string,
  reward: number,
  _claimType?: number,
): Promise<void> {
  if (!address || reward <= 0) return;

  try {
    const callData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, BigInt(0)],
    });
    const data = (callData + dataSuffix.slice(2)) as `0x${string}`;

    try {
      const { shouldUseFarcasterSDK } = await import('@/lib/utils/miniapp');
      if (shouldUseFarcasterSDK()) {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          await provider.request({
            method: 'eth_sendTransaction',
            params: [{ from: address as `0x${string}`, to: CONTRACTS.VBMSToken as `0x${string}`, data }],
          });
          return;
        }
      }
    } catch {}

    const { sendTransaction } = await import('wagmi/actions');
    const { config } = await import('@/lib/wagmi');
    await sendTransaction(config, {
      to: CONTRACTS.VBMSToken as `0x${string}`,
      data,
      chainId: CONTRACTS.CHAIN_ID,
    });
  } catch (err: any) {
    devError('Mission TX (non-blocking):', err);
    if (err?.message?.includes('rejected') || err?.message?.includes('denied') || err?.code === 4001) {
      toast.error('Transaction rejected by wallet.');
    } else if (err?.message && !err.message.includes('connector not found')) {
      toast.error('Transaction failed. Please check your wallet and try again.');
    }
  }
}
