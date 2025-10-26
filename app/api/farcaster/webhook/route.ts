import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

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

    console.log('📬 Farcaster webhook received:', {
      event: body.event,
      fid: body.data?.fid,
    });

    const { event, data } = body;

    switch (event) {
      case 'miniapp_added':
      case 'notifications_enabled':
        // Salvar token de notificação do usuário
        if (data?.fid && data?.notificationDetails) {
          const { token, url } = data.notificationDetails;

          // Salvar no Firebase
          await database.ref(`notificationTokens/${data.fid}`).set({
            token,
            url,
            enabled: true,
            updatedAt: Date.now(),
          });

          console.log(`✅ Notification token saved for FID ${data.fid}`);
        }
        break;

      case 'miniapp_removed':
      case 'notifications_disabled':
        // Remover token de notificação do usuário
        if (data?.fid) {
          await database.ref(`notificationTokens/${data.fid}`).remove();
          console.log(`❌ Notification token removed for FID ${data.fid}`);
        }
        break;

      default:
        console.log(`⚠️ Unknown event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
