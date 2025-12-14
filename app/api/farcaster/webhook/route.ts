import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

/**
 * Webhook endpoint para receber eventos do Farcaster miniapp
 * Aceita tanto payloads assinados (SDK) quanto simples (fallback)
 * IMPORTANTE: Responde em < 10 segundos (requisito do Base app)
 */
export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  console.log('📬 Webhook received:', JSON.stringify(requestJson).slice(0, 500));

  // Extrair evento - pode vir em formatos diferentes
  let event: string;
  let fid: number | undefined;
  let notificationDetails: { token: string; url: string } | undefined;

  // Formato 1: Payload simples { event, data: { fid, notificationDetails } }
  if (requestJson.event && requestJson.data) {
    event = requestJson.event;
    fid = requestJson.data.fid;
    notificationDetails = requestJson.data.notificationDetails;
  }
  // Formato 2: Payload do SDK { header, payload, signature } - precisa decode
  else if (requestJson.header && requestJson.payload && requestJson.signature) {
    try {
      // Decode base64 header (contém FID)
      const headerStr = Buffer.from(requestJson.header, 'base64').toString('utf8');
      const header = JSON.parse(headerStr);

      // Decode base64 payload (contém evento)
      const payloadStr = Buffer.from(requestJson.payload, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      // Mapear eventos (frame_added = miniapp_added, etc)
      const eventMap: Record<string, string> = {
        'frame_added': 'miniapp_added',
        'frame_removed': 'miniapp_removed',
        'notifications_enabled': 'notifications_enabled',
        'notifications_disabled': 'notifications_disabled',
      };

      event = eventMap[payload.event] || payload.event;
      fid = header.fid; // FID está no header!
      notificationDetails = payload.notificationDetails;

      console.log('📦 Decoded signed payload:', payload.event, '→', event, 'FID:', fid);
    } catch (e) {
      console.error('❌ Failed to decode signed payload:', e);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  }
  // Formato 3: Evento direto no root
  else if (requestJson.type || requestJson.event) {
    event = requestJson.type || requestJson.event;
    fid = requestJson.fid;
    notificationDetails = requestJson.notificationDetails;
  }
  else {
    console.error('❌ Unknown payload format:', Object.keys(requestJson));
    return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
  }

  console.log('✅ Parsed event:', event, 'FID:', fid);

  // Processar em background
  if (fid) {
    processWebhookEvent(event, fid, notificationDetails).catch(err => {
      console.error('❌ Processing error:', err);
    });
  }

  // Resposta imediata
  return NextResponse.json({ success: true });
}

async function processWebhookEvent(
  event: string,
  fid: number,
  notificationDetails?: { token: string; url: string }
) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const fidString = String(fid);

  console.log('📝 Processing:', event, 'for FID:', fidString);

  switch (event) {
    case 'miniapp_added':
    case 'notifications_enabled':
      if (notificationDetails?.token && notificationDetails?.url) {
        await convex.mutation(api.notifications.saveToken, {
          fid: fidString,
          token: notificationDetails.token,
          url: notificationDetails.url,
        });
        console.log('✅ Token saved for FID:', fidString);
      } else {
        console.log('⚠️ No notification details for:', event);
      }
      break;

    case 'miniapp_removed':
    case 'notifications_disabled':
      await convex.mutation(api.notifications.removeToken, {
        fid: fidString,
      });
      console.log('❌ Token removed for FID:', fidString);
      break;

    default:
      console.log('⚠️ Unknown event:', event);
  }
}
