/**
 * DEPRECATED - Signing moved to Convex action (vbmsClaim.signArbValidation)
 * This endpoint is permanently disabled to prevent unauthorized signature generation.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled. Use the Convex action instead.' },
    { status: 410 }
  );
}
