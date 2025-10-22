import { NextRequest, NextResponse } from 'next/server';

// Webhook para Farcaster Frame
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log do webhook recebido (útil para debug)
    console.log('Farcaster webhook recebido:', body);

    // Aqui você pode processar eventos do Farcaster
    // Por exemplo: rastrear quando usuários abrem o frame, cliques, etc.

    return NextResponse.json({
      success: true,
      message: 'Webhook recebido'
    });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

// GET para verificar se o endpoint está ativo
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Farcaster webhook endpoint está ativo'
  });
}
