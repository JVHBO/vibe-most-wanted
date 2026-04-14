import { sendBaseNotifications } from '@/lib/base-notifications';

/**
 * Envia notificação quando o deck de defesa do usuário é atacado
 */
export async function notifyDefenseAttacked(params: {
  defenderAddress: string;
  defenderUsername: string;
  attackerUsername: string;
  result: 'win' | 'lose';
}): Promise<void> {
  try {
    const { defenderAddress, defenderUsername, attackerUsername, result } = params;

    // Criar notificação
    const title = result === 'win' ? '🛡️ Defense Win!' : '⚔️ You Were Attacked!';
    const message = result === 'win'
      ? `${attackerUsername} attacked but your defense held!`
      : `${attackerUsername} defeated your defense!`;
    const targetPath = `/profile/${encodeURIComponent(defenderUsername)}?scrollTo=match-history`;

    await sendBaseNotifications({
      walletAddresses: [defenderAddress],
      title,
      message,
      targetPath,
    });

  } catch (error: any) {
    console.error('❌ Error notifying defense attacked:', error);
  }
}
