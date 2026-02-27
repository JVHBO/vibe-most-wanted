import { action } from './_generated/server';
import { v } from 'convex/values';

export const signArbValidation = action({
  args: {
    address: v.string(),
    amount: v.number(),
    nonce: v.string(),
  },
  handler: async (_ctx, { address, amount, nonce }): Promise<{ signature: string }> => {
    const MAX_AMOUNT = 12000;
    if (amount < 0 || amount > MAX_AMOUNT) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    const internalSecret = process.env.CONVEX_INTERNAL_SECRET;
    const apiUrl = 'https://vibemostwanted.xyz';

    const response = await fetch(`${apiUrl}/api/arb/sign-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret || '',
      },
      body: JSON.stringify({ address, amount, nonce }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Sign failed: ${err}`);
    }

    const data = await response.json();
    return { signature: data.signature };
  },
});
