/**
 * Farcaster Notifications Service
 *
 * Uses Neynar Managed Notifications API
 * Tokens are managed by Neynar via webhook (configured in farcaster.json)
 *
 * API: POST https://api.neynar.com/v2/farcaster/frame/notifications
 * Docs: https://docs.neynar.com/reference/publish-frame-notifications
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { randomUUID } from 'crypto';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_NOTIFICATIONS_URL = 'https://api.neynar.com/v2/farcaster/frame/notifications';

interface SendNotificationParams {
  fid: string; // Farcaster ID do usuário
  notificationId: string; // ID único (evita duplicatas em 24h)
  title: string; // Máx 32 caracteres
  body: string; // Máx 128 caracteres
  targetUrl?: string; // URL para abrir quando clicar (opcional)
}

interface SendBulkNotificationParams {
  fids: number[]; // Lista de FIDs (vazio = todos com notificações ativadas)
  notificationId: string;
  title: string;
  body: string;
  targetUrl?: string;
  filters?: {
    exclude_fids?: number[];
    following_fid?: number;
    minimum_user_score?: number;
  };
}

/**
 * Envia uma notificação para um usuário específico do Farcaster
 * Usa Neynar Managed Notifications API
 */
export async function sendFarcasterNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const { fid, notificationId, title, body, targetUrl } = params;

    if (!NEYNAR_API_KEY) {
      console.error('❌ NEYNAR_API_KEY not configured');
      return false;
    }

    // Validar tamanhos conforme spec Farcaster
    const validatedTitle = title.slice(0, 32);
    const validatedBody = body.slice(0, 128);

    // Preparar payload para Neynar API
    const payload: any = {
      target_fids: [parseInt(fid)],
      notification: {
        title: validatedTitle,
        body: validatedBody,
        uuid: randomUUID(), // Must be valid UUID format
      },
    };

    // Adicionar targetUrl se fornecido
    if (targetUrl) {
      payload.notification.target_url = targetUrl.slice(0, 1024);
    }

    // Enviar via Neynar API
    const response = await fetch(NEYNAR_NOTIFICATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Neynar API error for FID ${fid}:`, response.status, errorText);
      return false;
    }

    const result = await response.json();

    // Check delivery status
    const delivery = result.notification_deliveries?.find((d: any) => d.fid === parseInt(fid));
    if (delivery?.status === 'success') {
      console.log(`✅ Notification sent to FID ${fid} via Neynar`);
      return true;
    } else {
      console.log(`⚠️ Notification to FID ${fid} status: ${delivery?.status || 'unknown'}`);
      return false;
    }

  } catch (error: any) {
    console.error('❌ Error sending notification via Neynar:', error);
    return false;
  }
}

/**
 * Envia notificação para múltiplos usuários (ou todos)
 * Use fids=[] para enviar para TODOS os usuários com notificações ativadas
 */
export async function sendBulkNotification(params: SendBulkNotificationParams): Promise<{
  success: boolean;
  delivered: number;
  failed: number;
}> {
  try {
    const { fids, notificationId, title, body, targetUrl, filters } = params;

    if (!NEYNAR_API_KEY) {
      console.error('❌ NEYNAR_API_KEY not configured');
      return { success: false, delivered: 0, failed: 0 };
    }

    const payload: any = {
      target_fids: fids, // [] = all users with notifications enabled
      notification: {
        title: title.slice(0, 32),
        body: body.slice(0, 128),
        uuid: randomUUID(),
      },
    };

    if (targetUrl) {
      payload.notification.target_url = targetUrl.slice(0, 1024);
    }

    if (filters) {
      payload.filters = filters;
    }

    const response = await fetch(NEYNAR_NOTIFICATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Neynar bulk notification error:', response.status, errorText);
      return { success: false, delivered: 0, failed: 0 };
    }

    const result = await response.json();
    const deliveries = result.notification_deliveries || [];
    const delivered = deliveries.filter((d: any) => d.status === 'success').length;
    const failed = deliveries.filter((d: any) => d.status !== 'success').length;

    console.log(`✅ Bulk notification: ${delivered} delivered, ${failed} failed`);
    return { success: true, delivered, failed };

  } catch (error: any) {
    console.error('❌ Error sending bulk notification:', error);
    return { success: false, delivered: 0, failed: 0 };
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

    // Buscar FID do defensor
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
