import { NextResponse } from 'next/server';
import jcDeck from '@/public/data/jc-deck.json';

export async function GET() {
  try {
    return NextResponse.json({
      cards: jcDeck,
      source: 'static-file',
      total: jcDeck.length
    });
  } catch (error) {
    console.error('Error loading JC deck:', error);
    return NextResponse.json(
      { error: 'Failed to load JC deck' },
      { status: 500 }
    );
  }
}
