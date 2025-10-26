import { NextRequest, NextResponse } from 'next/server';
import { notifyDefenseAttacked } from '@/lib/notifications';

/**
 * API route para enviar notificações do servidor
 * Necessário porque Firebase Admin SDK só funciona server-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'defense_attacked') {
      await notifyDefenseAttacked(data);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Unknown notification type' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Notification API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
