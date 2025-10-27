/**
 * Farcaster Notifications Service
 *
 * Envia notificações para usuários do Farcaster miniapp quando eventos importantes acontecem
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

interface SendNotificationParams {
  fid: string; // Farcaster ID do usuário
  notificationId: string; // ID único (evita duplicatas)
  title: string; // Máx 32 caracteres
  body: string; // Máx 128 caracteres
  targetUrl?: string; // URL para abrir quando clicar (opcional)
}

/**
 * Envia uma notificação para um usuário específico do Farcaster
 */
export async function sendFarcasterNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const { fid, notificationId, title, body, targetUrl } = params;

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Buscar token de notificação do usuário
    const tokenData = await convex.query(api.notifications.getTokenByFid, { fid });

    if (!tokenData) {
      console.log(`⚠️ No notification token for FID ${fid}`);
      return false;
    }

    const { token, url } = tokenData;

    // Validar tamanhos
    const validatedTitle = title.slice(0, 32);
    const validatedBody = body.slice(0, 128);
    const validatedId = notificationId.slice(0, 128);

    // Preparar payload
    const payload: any = {
      notificationId: validatedId,
      title: validatedTitle,
      body: validatedBody,
      tokens: [token],
    };

    // Adicionar targetUrl se fornecido
    if (targetUrl) {
      payload.targetUrl = targetUrl.slice(0, 1024);
    }

    // Enviar notificação
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`❌ Failed to send notification to FID ${fid}:`, response.statusText);
      return false;
    }

    const result = await response.json();

    if (result.invalidTokens?.includes(token)) {
      // Token inválido - remover do banco
      await convex.mutation(api.notifications.removeToken, { fid });
      console.log(`🗑️ Invalid token removed for FID ${fid}`);
      return false;
    }

    if (result.rateLimitedTokens?.includes(token)) {
      console.log(`⏱️ Rate limited for FID ${fid}`);
      return false;
    }

    console.log(`✅ Notification sent to FID ${fid}`);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending notification:', error);
    return false;
  }
}

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

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Buscar FID do defensor (assumindo que está salvo no perfil)
    const profile = await convex.query(api.profiles.getProfile, {
      address: defenderAddress.toLowerCase(),
    });

    if (!profile?.fid) {
      console.log(`⚠️ No FID found for defender ${defenderAddress}`);
      return;
    }

    const fid = profile.fid;

    // Criar notificação
    const title = result === 'win' ? '🛡️ Defense Win!' : '⚔️ You Were Attacked!';
    const body = result === 'win'
      ? `${attackerUsername} attacked but your defense held!`
      : `${attackerUsername} defeated your defense!`;

    // ID único baseado no tempo + defensor
    const notificationId = `attack_${defenderAddress}_${Date.now()}`;

    // URL para abrir o perfil do defensor com histórico de partidas
    const targetUrl = `https://www.vibemostwanted.xyz/profile/${defenderUsername}?scrollTo=match-history`;

    await sendFarcasterNotification({
      fid,
      notificationId,
      title,
      body,
      targetUrl,
    });

  } catch (error: any) {
    console.error('❌ Error notifying defense attacked:', error);
  }
}
