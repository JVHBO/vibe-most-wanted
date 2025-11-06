import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { devLog, devError, devWarn } from '@/lib/utils/logger';

/**
 * Webhook endpoint para receber eventos do Farcaster miniapp
 *
 * Eventos suportados:
 * - miniapp_added: Usuário adicionou o app (salva token de notificação)
 * - miniapp_removed: Usuário removeu o app (remove token)
 * - notifications_enabled: Usuário habilitou notificações (atualiza token)
 * - notifications_disabled: Usuário desabilitou notificações (remove token)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    devLog('📬 Farcaster webhook received:', {
      event: body.event,
      fid: body.data?.fid,
    });

    const { event, data } = body;

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    switch (event) {
      case 'miniapp_added':
      case 'notifications_enabled':
        // Salvar token de notificação do usuário
        if (data?.fid && data?.notificationDetails) {
          const { token, url } = data.notificationDetails;

          // Salvar no Convex
          await convex.mutation(api.notifications.saveToken, {
            fid: data.fid,
            token,
            url,
          });

          devLog(`✅ Notification token saved for FID ${data.fid}`);
        }
        break;

      case 'miniapp_removed':
      case 'notifications_disabled':
        // Remover token de notificação do usuário
        if (data?.fid) {
          await convex.mutation(api.notifications.removeToken, {
            fid: data.fid,
          });
          devLog(`❌ Notification token removed for FID ${data.fid}`);
        }
        break;

      default:
        devWarn(`⚠️ Unknown event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    devError('❌ Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
